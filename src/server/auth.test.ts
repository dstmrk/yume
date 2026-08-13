import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { type Auth, createAuth } from "./auth.ts";
import { type Db, openDatabase } from "./db/index.ts";
import { findInvitation } from "./db/queries.ts";
import { invitation } from "./db/schema.ts";

const BASE_URL = "http://localhost:3000";
const PASSWORD = "una-parola-lunga";

let db: Db;
let auth: Auth;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	auth = createAuth(db, { secret: "a-secret-for-the-test", baseURL: BASE_URL });
});

/** The sign-up of the script. It holds no request, thus it needs no code. */
function signUpFromScript(email: string) {
	return auth.api.signUpEmail({
		body: { name: "Amministratore", email, password: PASSWORD },
	});
}

/** The sign-up of the network, with the handler of Better Auth. */
function signUpFromNetwork(body: Record<string, string>) {
	return auth.handler(
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
