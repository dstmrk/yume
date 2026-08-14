import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { type Auth, createAuth, needsSecureCookies } from "./auth.ts";
import { type Db, openDatabase } from "./db/index.ts";
import { findInvitation } from "./db/queries.ts";
import { invitation } from "./db/schema.ts";

const BASE_URL = "http://localhost:3000";
const PASSWORD = "una-parola-lunga";
const SECRET = "a-secret-for-the-test";
/** The code that the server writes in the log while the database has no user. */
const SETUP_CODE = "SETUP-2345";

let db: Db;
let auth: Auth;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	auth = createAuth(db, { secret: SECRET, baseURL: BASE_URL });
});

/** An instance with the code of the setup, as the server makes it at the start. */
function authWithSetup(): Auth {
	return createAuth(db, {
		secret: SECRET,
		baseURL: BASE_URL,
		setupCode: SETUP_CODE,
	});
}

/** The sign-up of the script. It holds no request, thus it needs no code. */
function signUpFromScript(email: string) {
	return auth.api.signUpEmail({
		body: { name: "Amministratore", email, password: PASSWORD },
	});
}

/** The sign-up of the network, with the handler of Better Auth. */
function signUpFromNetwork(
	body: Record<string, string>,
	instance: Auth = auth,
) {
	return instance.handler(
		new Request(`${BASE_URL}/api/auth/sign-up/email`, {
			method: "POST",
			headers: { "content-type": "application/json", origin: BASE_URL },
			body: JSON.stringify({ name: "Utente", password: PASSWORD, ...body }),
		}),
	);
}

/** Writes an invitation of the first user. It gives the code. */
async function makeInvitation(input: { code: string; expiresAt: string }) {
	const first = await signUpFromScript("primo@example.com");
	db.insert(invitation)
		.values({
			id: crypto.randomUUID(),
			code: input.code,
			createdByUserId: first.user.id,
			expiresAt: input.expiresAt,
		})
		.run();
	return input.code;
}

async function errorCodeOf(response: Response): Promise<string> {
	expect(response.status).toBe(400);
	const body = (await response.json()) as { code?: string };
	return body.code ?? "";
}

describe("the sign-up from a script", () => {
	it("makes the first user with no invitation", async () => {
		const result = await signUpFromScript("primo@example.com");
		expect(result.user.email).toBe("primo@example.com");
	});
});

describe("the sign-up of the first user", () => {
	it("makes the first user with the code of the setup", async () => {
		const response = await signUpFromNetwork(
			{ email: "primo@example.com", inviteCode: SETUP_CODE },
			authWithSetup(),
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as { user: { email: string } };
		expect(body.user.email).toBe("primo@example.com");
	});

	it("refuses a code that is not the code of the setup", async () => {
		const response = await signUpFromNetwork(
			{ email: "primo@example.com", inviteCode: "UN-ALTRO" },
			authWithSetup(),
		);
		expect(await errorCodeOf(response)).toBe("INVITE_CODE_UNKNOWN");
	});

	// No user wrote the invitation of the first user. Therefore the setup writes
	// no row, and the table holds only the invitations of the users.
	it("writes no invitation for the first user", async () => {
		await signUpFromNetwork(
			{ email: "primo@example.com", inviteCode: SETUP_CODE },
			authWithSetup(),
		);
		expect(db.select().from(invitation).all()).toEqual([]);
	});

	// The code of the setup dies with the first user, also in the same process.
	it("refuses the code of the setup after the first user", async () => {
		const setup = authWithSetup();
		await signUpFromNetwork(
			{ email: "primo@example.com", inviteCode: SETUP_CODE },
			setup,
		);

		const response = await signUpFromNetwork(
			{ email: "due@example.com", inviteCode: SETUP_CODE },
			setup,
		);
		expect(await errorCodeOf(response)).toBe("INVITE_CODE_UNKNOWN");
	});

	// The server gives no code of the setup when it starts with a user. A
	// database that then loses each user gives access to no person.
	it("refuses each code when the server gives no code of the setup", async () => {
		const response = await signUpFromNetwork({
			email: "primo@example.com",
			inviteCode: SETUP_CODE,
		});
		expect(await errorCodeOf(response)).toBe("INVITE_CODE_UNKNOWN");
	});

	it("refuses a sign-up with no code", async () => {
		const response = await signUpFromNetwork(
			{ email: "primo@example.com" },
			authWithSetup(),
		);
		expect(await errorCodeOf(response)).toBe("INVITE_CODE_REQUIRED");
	});
});

describe("the sign-up from the network", () => {
	it("refuses a sign-up with no code", async () => {
		const response = await signUpFromNetwork({ email: "due@example.com" });
		expect(await errorCodeOf(response)).toBe("INVITE_CODE_REQUIRED");
	});

	it("refuses a code that is empty", async () => {
		const response = await signUpFromNetwork({
			email: "due@example.com",
			inviteCode: "",
		});
		expect(await errorCodeOf(response)).toBe("INVITE_CODE_REQUIRED");
	});

	it("refuses a code that no invitation has", async () => {
		await signUpFromScript("primo@example.com");
		const response = await signUpFromNetwork({
			email: "due@example.com",
			inviteCode: "NO-SUCH-CODE",
		});
		expect(await errorCodeOf(response)).toBe("INVITE_CODE_UNKNOWN");
	});

	it("refuses a code that expired", async () => {
		const code = await makeInvitation({
			code: "VECCHIO",
			expiresAt: "2020-01-01T00:00:00.000Z",
		});
		const response = await signUpFromNetwork({
			email: "due@example.com",
			inviteCode: code,
		});
		expect(await errorCodeOf(response)).toBe("INVITE_CODE_EXPIRED");
	});

	it("makes the user with a code that is valid", async () => {
		const code = await makeInvitation({
			code: "BUONO",
			expiresAt: "2099-01-01T00:00:00.000Z",
		});
		const response = await signUpFromNetwork({
			email: "due@example.com",
			inviteCode: code,
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as { user: { email: string } };
		expect(body.user.email).toBe("due@example.com");
	});

	it("marks the invitation with the id of the new user", async () => {
		const code = await makeInvitation({
			code: "BUONO",
			expiresAt: "2099-01-01T00:00:00.000Z",
		});
		const response = await signUpFromNetwork({
			email: "due@example.com",
			inviteCode: code,
		});
		const body = (await response.json()) as { user: { id: string } };

		const used = findInvitation(db, code);
		expect(used?.usedByUserId).toBe(body.user.id);
		expect(used?.usedAt).toEqual(expect.any(String));
	});

	it("refuses the same code a second time", async () => {
		const code = await makeInvitation({
			code: "BUONO",
			expiresAt: "2099-01-01T00:00:00.000Z",
		});
		await signUpFromNetwork({ email: "due@example.com", inviteCode: code });

		const response = await signUpFromNetwork({
			email: "tre@example.com",
			inviteCode: code,
		});
		expect(await errorCodeOf(response)).toBe("INVITE_CODE_USED");
	});

	// The sign-up stops after the hook `before` and before the creation of the
	// user. The code must stay free for an other sign-up.
	it("keeps the code free when the email address is already in use", async () => {
		const code = await makeInvitation({
			code: "BUONO",
			expiresAt: "2099-01-01T00:00:00.000Z",
		});
		const response = await signUpFromNetwork({
			email: "primo@example.com",
			inviteCode: code,
		});

		expect(response.status).not.toBe(200);
		expect(findInvitation(db, code)?.usedAt).toBeNull();
	});
});

describe("the sign-in", () => {
	it("gives a session to the user of the script", async () => {
		await signUpFromScript("primo@example.com");

		const response = await auth.handler(
			new Request(`${BASE_URL}/api/auth/sign-in/email`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: BASE_URL },
				body: JSON.stringify({
					email: "primo@example.com",
					password: PASSWORD,
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("set-cookie")).toContain("session_token");
	});

	it("refuses a password that is not correct", async () => {
		await signUpFromScript("primo@example.com");

		const response = await auth.handler(
			new Request(`${BASE_URL}/api/auth/sign-in/email`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: BASE_URL },
				body: JSON.stringify({
					email: "primo@example.com",
					password: "un-altra-parola",
				}),
			}),
		);

		expect(response.status).toBe(401);
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
 * The cookie of the session holds the attribute `secure` on each origin of the
 * network. Then a browser removes that cookie on a plain HTTP connection, and
 * the session of the user does not travel in clear text.
 */
describe("the cookie of the session", () => {
	/** Signs in the first user and gives the header `set-cookie`. */
	async function cookieOf(baseURL: string): Promise<string> {
		const instance = createAuth(db, { secret: SECRET, baseURL });
		await instance.api.signUpEmail({
			body: {
				name: "Amministratore",
				email: "primo@example.com",
				password: PASSWORD,
			},
		});

		const response = await instance.handler(
			new Request(`${baseURL}/api/auth/sign-in/email`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: baseURL },
				body: JSON.stringify({
					email: "primo@example.com",
					password: PASSWORD,
				}),
			}),
		);
		expect(response.status).toBe(200);
		return response.headers.get("set-cookie") ?? "";
	}

	it("holds the attribute Secure on a host of the network with no TLS", async () => {
		expect(await cookieOf("http://nas.local:3000")).toContain("Secure");
	});

	it("holds the attribute Secure on an origin with TLS", async () => {
		expect(await cookieOf("https://yume.example.com")).toContain("Secure");
	});

	// The client of Vite operates on the machine itself with no certificate.
	it("holds no attribute Secure on the machine itself", async () => {
		expect(await cookieOf("http://localhost:3000")).not.toContain("Secure");
	});
});
