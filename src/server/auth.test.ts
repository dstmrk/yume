import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Auth, createAuth, needsSecureCookies } from "./auth.ts";
import { type Db, openDatabase } from "./db/index.ts";
import { account, user } from "./db/schema.ts";

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

	// Google can add the name and the photo to the token, for example for an
	// account that gave the scope `profile` to an other application. Yume keeps
	// neither of them.
	it("keeps no name and no photo of the Google account", async () => {
		await signInWithGoogle("google-1", "primo@example.com");

		const [row] = db.select().from(user).all();
		expect(row?.name).toBe("");
		expect(row?.image).toBeNull();
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
