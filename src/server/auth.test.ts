import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type Auth,
	canServeMcp,
	createAuth,
	MCP_SCOPES,
	mcpResource,
	needsSecureCookies,
} from "./auth.ts";
import { insertUser, sessionCookie } from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";
import { deleteExpired } from "./db/queries.ts";
import { account, session, user, verification } from "./db/schema.ts";

const BASE_URL = "http://localhost:3000";
const SECRET = "a-secret-for-the-test";
const GOOGLE = {
	clientId: "client-id-test",
	clientSecret: "client-secret-test",
};

let db: Db;
let auth: Auth;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	auth = createAuth(db, { secret: SECRET, baseURL: BASE_URL, google: GOOGLE });
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** A JWT with no signature. The provider of Better Auth only decodes it. */
function idToken(claims: Record<string, unknown>): string {
	const part = (value: unknown) =>
		Buffer.from(JSON.stringify(value)).toString("base64url");
	return `${part({ alg: "none", typ: "JWT" })}.${part(claims)}.`;
}

/** The claims of a Google account. */
function profile(sub: string, email: string) {
	return {
		iss: "https://accounts.google.com",
		aud: GOOGLE.clientId,
		sub,
		email,
		email_verified: true,
		name: "Mario Rossi",
		picture: "https://lh3.googleusercontent.com/a/photo",
	};
}

/** The five columns of `account` that hold a token or its expiry. */
function expectNoToken(row: typeof account.$inferSelect | undefined) {
	expect(row).toBeDefined();
	expect(row?.accessToken).toBeNull();
	expect(row?.refreshToken).toBeNull();
	expect(row?.idToken).toBeNull();
	expect(row?.accessTokenExpiresAt).toBeNull();
	expect(row?.refreshTokenExpiresAt).toBeNull();
}

/** The cookies of a response, without the attributes. */
function cookiesOf(response: Response): string {
	return response.headers
		.getSetCookie()
		.map((header) => header.split(";")[0])
		.join("; ");
}

/** The start of the sign-in: Better Auth gives the page of Google. */
function startSignIn(instance: Auth = auth, baseURL = BASE_URL) {
	return instance.handler(
		new Request(`${baseURL}/api/auth/sign-in/social`, {
			method: "POST",
			headers: { "content-type": "application/json", origin: baseURL },
			body: JSON.stringify({ provider: "google", callbackURL: "/dashboard" }),
		}),
	);
}

/**
 * The complete sign-in with a Google account.
 *
 * The test replaces the token endpoint of Google. Better Auth decodes the
 * `id_token` of that answer and finds or makes the user.
 */
async function signInWithGoogle(sub: string, email: string) {
	const start = await startSignIn();
	expect(start.status).toBe(200);
	const { url } = (await start.json()) as { url: string };
	const state = new URL(url).searchParams.get("state") ?? "";

	const realFetch = globalThis.fetch;
	vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
		const target = input instanceof Request ? input.url : String(input);
		if (target.startsWith("https://oauth2.googleapis.com/token")) {
			return Response.json({
				access_token: "access-token-test",
				token_type: "Bearer",
				expires_in: 3600,
				id_token: idToken(profile(sub, email)),
			});
		}
		return realFetch(input, init);
	});

	const callback = await auth.handler(
		new Request(
			`${BASE_URL}/api/auth/callback/google?code=code-test&state=${state}`,
			{ headers: { cookie: cookiesOf(start) } },
		),
	);
	vi.restoreAllMocks();
	return callback;
}

describe("the start of the sign-in with Google", () => {
	it("gives the page of Google with the client and the redirect URI", async () => {
		const response = await startSignIn();
		expect(response.status).toBe(200);

		const { url } = (await response.json()) as { url: string };
		const target = new URL(url);
		expect(target.origin).toBe("https://accounts.google.com");
		expect(target.searchParams.get("client_id")).toBe(GOOGLE.clientId);
		expect(target.searchParams.get("redirect_uri")).toBe(
			`${BASE_URL}/api/auth/callback/google`,
		);
	});

	// Yume needs the address only. The scope `profile` gives the name and the
	// photo of the person, and Yume shows neither. Refer to paragraph 4.1 of
	// `docs/architecture.md`.
	it("asks for the email address only", async () => {
		const response = await startSignIn();
		const { url } = (await response.json()) as { url: string };
		const scopes = new URL(url).searchParams.get("scope")?.split(" ") ?? [];
		expect(scopes.sort()).toEqual(["email", "openid"]);
	});

	// With `include_granted_scopes`, Google adds each scope that the person gave
	// to the same client in the past. A person who gave `profile` to an old
	// version of Yume then gives the name and the photo again.
	it("asks for no scope that the person gave in the past", async () => {
		const response = await startSignIn();
		const { url } = (await response.json()) as { url: string };
		expect(new URL(url).searchParams.has("include_granted_scopes")).toBe(false);
	});

	// The page `/login` sends the signed query of an authorisation of the MCP
	// server. A query that a person changes breaks the signature, and the server
	// then starts no sign-in for it. Paragraph 4.7.2.
	it("refuses an authorisation with a signature that is not valid", async () => {
		const response = await auth.handler(
			new Request(`${BASE_URL}/api/auth/sign-in/social`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: BASE_URL },
				body: JSON.stringify({
					provider: "google",
					callbackURL: `${BASE_URL}/dashboard`,
					oauth_query:
						"client_id=x&exp=4102444800&ba_param=ba_param&ba_param=client_id&ba_param=exp&sig=forged",
				}),
			}),
		);
		expect(response.status).toBe(400);
	});

	it("refuses an other provider", async () => {
		const response = await auth.handler(
			new Request(`${BASE_URL}/api/auth/sign-in/social`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: BASE_URL },
				body: JSON.stringify({ provider: "github" }),
			}),
		);
		expect(response.status).not.toBe(200);
	});
});

describe("the callback of Google", () => {
	it("makes the user at the first sign-in and gives a session", async () => {
		const response = await signInWithGoogle("google-1", "primo@example.com");

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("/dashboard");
		expect(cookiesOf(response)).toContain("session_token");

		const users = db.select().from(user).all();
		expect(users.map((row) => row.email)).toEqual(["primo@example.com"]);
		const accounts = db.select().from(account).all();
		expect(accounts.map((row) => row.providerId)).toEqual(["google"]);
	});

	it("makes a free account at the first sign-in", async () => {
		await signInWithGoogle("google-1", "primo@example.com");

		const [row] = db.select().from(user).all();
		expect(row?.supporterUntil).toBeNull();
		expect(row?.unlimited).toBe(false);
	});

	// Google can add the name and the photo to the token, for example for an
	// account that gave the scope `profile` to an other application. Yume keeps
	// neither of them.
	it("keeps no name and no photo of the Google account", async () => {
		await signInWithGoogle("google-1", "primo@example.com");

		const [row] = db.select().from(user).all();
		expect(row?.name).toBe("");
		expect(row?.image).toBeNull();
	});

	// Yume reads no token of Google: Better Auth owns the session. The `sub` of
	// Google stays, because the next sign-in finds the user with it. Refer to
	// paragraph 4.1 of `docs/architecture.md`.
	it("keeps no token of Google and keeps the identifier", async () => {
		await signInWithGoogle("google-1", "primo@example.com");

		const [row] = db.select().from(account).all();
		expect(row?.accountId).toBe("google-1");
		expect(row?.providerId).toBe("google");
		expect(row?.userId).toBe(db.select().from(user).all()[0]?.id);
		expectNoToken(row);
	});

	// Better Auth writes the new tokens at each sign-in of a known account.
	it("keeps no token of Google after a second sign-in", async () => {
		await signInWithGoogle("google-1", "primo@example.com");
		const response = await signInWithGoogle("google-1", "primo@example.com");

		const headers = new Headers({ cookie: cookiesOf(response) });
		const current = await auth.api.getSession({ headers });
		expect(current?.user.email).toBe("primo@example.com");
		expectNoToken(db.select().from(account).all()[0]);
	});

	it("keeps no token of an account that the adapter writes", async () => {
		const userId = insertUser(db, "user-1");
		const context = await auth.$context;
		const created = await context.internalAdapter.createAccount({
			userId,
			providerId: "google",
			accountId: "google-9",
			accessToken: "access-token-test",
			refreshToken: "refresh-token-test",
			idToken: "id-token-test",
			accessTokenExpiresAt: new Date(),
			refreshTokenExpiresAt: new Date(),
		});
		expect(created).not.toBeNull();
		expectNoToken(db.select().from(account).all()[0]);

		await context.internalAdapter.updateAccount(created?.id ?? "", {
			accessToken: "access-token-new",
			idToken: "id-token-new",
			accessTokenExpiresAt: new Date(),
		});
		const [row] = db.select().from(account).all();
		expect(row?.accountId).toBe("google-9");
		expectNoToken(row);
	});

	// The registration is open: no invitation, also with a user in the database.
	it("makes a second user with no invitation", async () => {
		await signInWithGoogle("google-1", "primo@example.com");
		const response = await signInWithGoogle("google-2", "due@example.com");

		expect(response.status).toBe(302);
		expect(db.select().from(user).all()).toHaveLength(2);
	});

	it("gives the same user at a second sign-in", async () => {
		await signInWithGoogle("google-1", "primo@example.com");
		const response = await signInWithGoogle("google-1", "primo@example.com");

		expect(response.status).toBe(302);
		expect(db.select().from(user).all()).toHaveLength(1);
		expect(db.select().from(account).all()).toHaveLength(1);
	});

	// The person presses "Cancel" on the page of Google. Google then gives an
	// error and no code.
	it("makes no user when the person refuses the consent", async () => {
		const start = await startSignIn();
		const { url } = (await start.json()) as { url: string };
		const state = new URL(url).searchParams.get("state") ?? "";

		const response = await auth.handler(
			new Request(
				`${BASE_URL}/api/auth/callback/google?error=access_denied&state=${state}`,
				{ headers: { cookie: cookiesOf(start) } },
			),
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toContain("error=");
		expect(cookiesOf(response)).not.toContain("session_token");
		expect(db.select().from(user).all()).toHaveLength(0);
	});

	it("refuses a state that the server did not give", async () => {
		const response = await auth.handler(
			new Request(
				`${BASE_URL}/api/auth/callback/google?code=code-test&state=unknown`,
			),
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toContain("error=");
		expect(db.select().from(user).all()).toHaveLength(0);
	});
});

// The cleanup reads the columns that Better Auth writes. This test uses the real
// flow, thus a change of the unit of `expires_at` in the library breaks it.
describe("the cleanup of the expired rows", () => {
	const DAY = 24 * 60 * 60 * 1000;

	it("removes a session of Better Auth after its expiry", async () => {
		const response = await signInWithGoogle("google-1", "primo@example.com");
		const headers = new Headers({ cookie: cookiesOf(response) });
		expect(await auth.api.getSession({ headers })).not.toBeNull();

		expect(deleteExpired(db, new Date()).sessions).toBe(0);
		expect(db.select().from(session).all()).toHaveLength(1);

		expect(deleteExpired(db, new Date(Date.now() + 8 * DAY)).sessions).toBe(1);
		expect(db.select().from(session).all()).toHaveLength(0);
		expect(await auth.api.getSession({ headers })).toBeNull();
		expect(db.select().from(user).all()).toHaveLength(1);
	});

	it("removes the state of a sign-in that the person did not complete", async () => {
		await startSignIn();
		expect(deleteExpired(db, new Date()).verifications).toBe(0);
		expect(db.select().from(verification).all()).toHaveLength(1);

		expect(deleteExpired(db, new Date(Date.now() + DAY)).verifications).toBe(1);
		expect(db.select().from(verification).all()).toHaveLength(0);
	});
});

describe("the email address and the password", () => {
	it("give no sign-up", async () => {
		const response = await auth.handler(
			new Request(`${BASE_URL}/api/auth/sign-up/email`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: BASE_URL },
				body: JSON.stringify({
					name: "Utente",
					email: "primo@example.com",
					password: "una-parola-lunga",
				}),
			}),
		);

		expect(response.status).not.toBe(200);
		expect(db.select().from(user).all()).toHaveLength(0);
	});

	it("give no sign-in", async () => {
		const response = await auth.handler(
			new Request(`${BASE_URL}/api/auth/sign-in/email`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: BASE_URL },
				body: JSON.stringify({
					email: "primo@example.com",
					password: "una-parola-lunga",
				}),
			}),
		);

		expect(response.status).not.toBe(200);
	});
});

// Better Auth does not know the two columns of the level of the account,
// thus its route `update-user` must not write them. A user who writes
// `unlimited` gets each function of the supporter account with no payment.
// Paragraph 4.6 of `docs/architecture.md` gives the decision.
describe("the level of the account", () => {
	it("cannot change through the route update-user", async () => {
		const userId = insertUser(db, "user-1");
		const cookie = await sessionCookie(auth, userId);

		const response = await auth.handler(
			new Request(`${BASE_URL}/api/auth/update-user`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: BASE_URL,
					cookie,
				},
				body: JSON.stringify({
					unlimited: true,
					supporterUntil: "2099-01-01T00:00:00Z",
				}),
			}),
		);

		// The session is valid and Better Auth removes the two fields. Thus it
		// finds no field to write.
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			message: "No fields to update",
		});
		const [row] = db.select().from(user).all();
		expect(row?.unlimited).toBe(false);
		expect(row?.supporterUntil).toBeNull();
	});
});

describe("needsSecureCookies", () => {
	it("gives false for the machine itself", () => {
		expect(needsSecureCookies("http://localhost:3000")).toBe(false);
		expect(needsSecureCookies("http://127.0.0.1:3000")).toBe(false);
		expect(needsSecureCookies("http://[::1]:3000")).toBe(false);
	});

	it("gives true for a host of the network with no TLS", () => {
		expect(needsSecureCookies("http://nas.local:3000")).toBe(true);
		expect(needsSecureCookies("http://192.168.1.20:3000")).toBe(true);
	});

	it("gives true for an origin with TLS", () => {
		expect(needsSecureCookies("https://yume.example.com")).toBe(true);
	});

	// A defect in the value of the variable must not remove the protection.
	it("gives true for a value that it cannot read", () => {
		expect(needsSecureCookies("nas.local:3000")).toBe(true);
		expect(needsSecureCookies("")).toBe(true);
	});
});

/**
 * The cookies of Better Auth hold the attribute `secure` on each origin of the
 * network. Then a browser removes those cookies on a plain HTTP connection, and
 * the session of the user does not travel in clear text.
 *
 * The start of the sign-in gives the cookie of the state. That cookie and the
 * cookie of the session receive the same attributes.
 */
describe("the cookies of the sign-in", () => {
	async function cookieOf(baseURL: string): Promise<string> {
		const instance = createAuth(db, {
			secret: SECRET,
			baseURL,
			google: GOOGLE,
		});
		const response = await startSignIn(instance, baseURL);
		expect(response.status).toBe(200);
		return response.headers.getSetCookie().join("\n");
	}

	it("hold the attribute Secure on a host of the network with no TLS", async () => {
		expect(await cookieOf("http://nas.local:3000")).toContain("Secure");
	});

	it("hold the attribute Secure on an origin with TLS", async () => {
		expect(await cookieOf("https://yume.example.com")).toContain("Secure");
	});

	// The client of Vite operates on the machine itself with no certificate.
	it("hold no attribute Secure on the machine itself", async () => {
		expect(await cookieOf("http://localhost:3000")).not.toContain("Secure");
	});
});

describe("mcpResource", () => {
	it("gives the path /mcp of the origin", () => {
		expect(mcpResource("https://yume.example.com")).toBe(
			"https://yume.example.com/mcp",
		);
	});

	it("gives one slash with a slash at the end of the origin", () => {
		expect(mcpResource("https://yume.example.com/")).toBe(
			"https://yume.example.com/mcp",
		);
	});

	it("keeps the port of the origin", () => {
		expect(mcpResource("http://localhost:3000")).toBe(
			"http://localhost:3000/mcp",
		);
	});
});

/**
 * The metadata of the authorisation server. Claude reads them before the
 * sign-in, and it refuses a server that does not give these values. Paragraph
 * 4.7.2 of `docs/architecture.md` gives the decisions.
 */
describe("the metadata of the authorisation server", () => {
	const ISSUER = `${BASE_URL}/api/auth`;

	async function metadata(): Promise<Record<string, unknown>> {
		const response = await auth.handler(
			new Request(
				`${BASE_URL}/.well-known/oauth-authorization-server/api/auth`,
			),
		);
		expect(response.status).toBe(200);
		return (await response.json()) as Record<string, unknown>;
	}

	it("gives the issuer of the path of Better Auth", async () => {
		expect((await metadata()).issuer).toBe(ISSUER);
	});

	// Claude uses CIMD only with these two values. Otherwise it tries DCR, and
	// the server gives no registration.
	it("accepts a Client ID Metadata Document of a public client", async () => {
		const body = await metadata();
		expect(body.client_id_metadata_document_supported).toBe(true);
		expect(body.token_endpoint_auth_methods_supported).toContain("none");
	});

	it("gives no Dynamic Client Registration", async () => {
		expect(await metadata()).not.toHaveProperty("registration_endpoint");
	});

	it("asks for PKCE with S256", async () => {
		expect((await metadata()).code_challenge_methods_supported).toEqual([
			"S256",
		]);
	});

	// Claude does not use `client_credentials`: a token with no user reads the
	// data of no person.
	it("gives the code and the refresh token only", async () => {
		expect((await metadata()).grant_types_supported).toEqual([
			"authorization_code",
			"refresh_token",
		]);
	});

	it("gives the scopes of Yume and no scope of the profile", async () => {
		expect((await metadata()).scopes_supported).toEqual([...MCP_SCOPES]);
	});
});

describe("the metadata of the protected resource", () => {
	for (const path of [
		"/.well-known/oauth-protected-resource",
		"/.well-known/oauth-protected-resource/mcp",
	]) {
		it(`gives the MCP server at ${path}`, async () => {
			const response = await auth.handler(new Request(`${BASE_URL}${path}`));
			expect(response.status).toBe(200);
			expect(await response.json()).toMatchObject({
				resource: `${BASE_URL}/mcp`,
				authorization_servers: [`${BASE_URL}/api/auth`],
				scopes_supported: ["balances"],
			});
		});
	}
});

/**
 * The plugin `mcp` refuses a resource on plain HTTP, except on the machine
 * itself. An installation on `http://nas.local:3000` then starts with no MCP
 * server: the sign-in with Google is also not possible there (paragraph 4.2).
 */
describe("canServeMcp", () => {
	for (const origin of [
		"https://yume.example.com",
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://[::1]:3000",
	]) {
		it(`gives true for ${origin}`, () => {
			expect(canServeMcp(origin)).toBe(true);
		});
	}

	for (const origin of ["http://nas.local:3000", "http://192.168.1.10:3000"]) {
		it(`gives false for ${origin}`, () => {
			expect(canServeMcp(origin)).toBe(false);
		});
	}

	it("gives false for a value that is not a URL", () => {
		expect(canServeMcp("nas.local")).toBe(false);
	});

	it("starts an instance with no metadata of OAuth on plain HTTP", async () => {
		const plain = createAuth(db, {
			secret: SECRET,
			baseURL: "http://nas.local:3000",
			google: GOOGLE,
		});
		const response = await plain.handler(
			new Request("http://nas.local:3000/.well-known/oauth-protected-resource"),
		);
		expect(response.status).toBe(404);
	});
});

/**
 * The plugin `jwt` encrypts its private key with `BETTER_AUTH_SECRET`. With
 * the header of the JWT on `get-session`, a new secret then gave the status
 * 500 to each request of the session: no person could sign in. The MCP server
 * needs no JWT of the session. Paragraph 4.3 of `docs/architecture.md`.
 */
describe("a new secret", () => {
	it("keeps get-session after the keys of the tokens exist", async () => {
		// The first request of the keys makes them with the old secret.
		expect(
			(await auth.handler(new Request(`${BASE_URL}/api/auth/jwks`))).status,
		).toBe(200);

		const renewed = createAuth(db, {
			secret: "a-new-secret-for-the-test",
			baseURL: BASE_URL,
			google: GOOGLE,
		});
		insertUser(db, "after-the-new-secret");
		const cookie = await sessionCookie(renewed, "after-the-new-secret");

		const response = await renewed.handler(
			new Request(`${BASE_URL}/api/auth/get-session`, { headers: { cookie } }),
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			user: { id: "after-the-new-secret" },
		});
	});

	it("gives no JWT in the header of get-session", async () => {
		insertUser(db, "with-a-session");
		const cookie = await sessionCookie(auth, "with-a-session");

		const response = await auth.handler(
			new Request(`${BASE_URL}/api/auth/get-session`, { headers: { cookie } }),
		);
		expect(response.headers.has("set-auth-jwt")).toBe(false);
	});
});
