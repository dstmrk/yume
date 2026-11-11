import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, MAX_ACCOUNTS_PER_USER, MAX_BODY_BYTES } from "./app.ts";
import { createAuth } from "./auth.ts";
import {
	insertConnection,
	insertOAuthClient,
	insertUser,
	sessionCookie,
} from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";
import {
	addFavorite,
	addSnapshot,
	countAccounts,
	createAccount,
	currentBalances,
	favoriteCurrencies,
	listConnections,
} from "./db/queries.ts";
import { user } from "./db/schema.ts";
import { currencies } from "./db/seed/catalogue.ts";
import { seedCatalogue } from "./db/seed/seed.ts";

const BASE_URL = "http://localhost:3000";
/** The client of Vite in development: an origin of `TRUSTED_ORIGINS`. */
const VITE_URL = "http://localhost:5173";
const OTHER_USER = "an-other-user";

let db: Db;
let app: ReturnType<typeof createApp>;
/** The user of the session. Each request of a test comes from this user. */
let userId: string;
/** The cookie of the session. A request with no cookie gives the status 401. */
let cookie: string;

/**
 * The headers of a browser on the page of Yume.
 *
 * A browser sends `origin` with each method that is not `GET` or `HEAD`. A
 * `DELETE` or a `PUT` with no body has no `content-type`, thus the protection
 * of the forms reads that header.
 */
function sameOrigin(): Record<string, string> {
	return { cookie, origin: BASE_URL };
}

beforeEach(async () => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	seedCatalogue(db);
	insertUser(db, OTHER_USER);

	const auth = createAuth(db, {
		secret: "a-secret-for-the-test",
		baseURL: BASE_URL,
		google: { clientId: "client-id-test", clientSecret: "client-secret-test" },
	});
	app = createApp(db, auth, [BASE_URL, VITE_URL]);

	userId = insertUser(db, "primo");
	cookie = await sessionCookie(auth, userId);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

type PotentialRow = {
	currencyId: string;
	current: number;
	fromTransfers: number;
	total: number;
	routes: { fromProgramId: string; points: number }[];
};

async function getJson<T>(path: string): Promise<T> {
	const response = await app.request(path, { headers: { cookie } });
	expect(response.status).toBe(200);
	return (await response.json()) as T;
}

function post(path: string, body: unknown) {
	return app.request(path, {
		method: "POST",
		headers: { "content-type": "application/json", cookie },
		body: JSON.stringify(body),
	});
}

function remove(path: string) {
	return app.request(path, { method: "DELETE", headers: sameOrigin() });
}

describe("the session", () => {
	// The list holds each route of the data. A new route with no session must
	// make this test fail.
	const routes = [
		["GET", "/api/catalogue"],
		["GET", "/api/accounts"],
		["POST", "/api/accounts"],
		["POST", "/api/accounts/an-account/snapshots"],
		["DELETE", "/api/accounts/an-account"],
		["DELETE", "/api/accounts/an-account/snapshots/a-snapshot"],
		["GET", "/api/potential"],
		["GET", "/api/favorites"],
		["PUT", "/api/favorites/avios"],
		["DELETE", "/api/favorites/avios"],
		["GET", "/api/me"],
		["GET", "/api/admin/users"],
		["PUT", "/api/admin/users/an-user/unlimited"],
	] as const;

	for (const [method, path] of routes) {
		it(`gives the status 401 on ${method} ${path} with no cookie`, async () => {
			const response = await app.request(path, { method });
			expect(response.status).toBe(401);
		});
	}

	it("gives the status 401 with a cookie that is not correct", async () => {
		const response = await app.request("/api/accounts", {
			headers: { cookie: "better-auth.session_token=not-a-token" },
		});
		expect(response.status).toBe(401);
	});

	it("gives the state of the application with no cookie", async () => {
		const response = await app.request("/api/health");
		expect(response.status).toBe(200);
	});

	it("gives the routes of Better Auth with no cookie", async () => {
		const response = await app.request("/api/auth/get-session");
		expect(response.status).toBe(200);
	});

	// The dashboard shows the accounts of the user of the session only.
	it("does not give the accounts of an other user", async () => {
		createAccount(db, { userId: OTHER_USER, programId: "ba-club" });
		const body = await getJson<{ accounts: unknown[] }>("/api/accounts");
		expect(body.accounts).toEqual([]);
	});

	it("makes the account of the user of the session", async () => {
		await post("/api/accounts", { programId: "ba-club" });
		const rows = currentBalances(db, userId);
		expect(rows).toMatchObject([{ programId: "ba-club" }]);
	});
});

describe("the protection from a form of an other origin", () => {
	/** The request of `<form enctype="text/plain">` on an other page. */
	function formPost(path: string, headers: Record<string, string>) {
		return app.request(path, {
			method: "POST",
			headers: { "content-type": "text/plain", cookie, ...headers },
			body: JSON.stringify({ programId: "ba-club", x: "=1" }),
		});
	}

	it("refuses a form of an other site with a valid cookie", async () => {
		const response = await formPost("/api/accounts", {
			origin: "https://evil.example.com",
			"sec-fetch-site": "cross-site",
		});

		expect(response.status).toBe(403);
		expect(countAccounts(db, userId)).toBe(0);
	});

	// An other service on the same domain is the same site, thus the browser
	// sends the cookie of Yume with `SameSite=Lax`.
	it("refuses a form of an other subdomain of the same site", async () => {
		const response = await formPost("/api/accounts", {
			origin: "https://jellyfin.example.com",
			"sec-fetch-site": "same-site",
		});

		expect(response.status).toBe(403);
		expect(countAccounts(db, userId)).toBe(0);
	});

	it("refuses a form with no origin", async () => {
		const response = await formPost("/api/accounts", {});

		expect(response.status).toBe(403);
		expect(countAccounts(db, userId)).toBe(0);
	});

	// The servers of Anthropic send the code and the refresh token as a form,
	// with no origin. Those two endpoints read no cookie: the code with PKCE or
	// the refresh token proves the client. Paragraph 4.7.2.
	for (const path of ["/api/auth/oauth2/token", "/api/auth/oauth2/revoke"]) {
		it(`gives ${path} to Better Auth with no origin`, async () => {
			const response = await app.request(path, {
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: "grant_type=authorization_code&code=no-such-code&client_id=x",
			});

			expect(response.status).not.toBe(403);
			expect(response.headers.get("content-type")).toContain(
				"application/json",
			);
		});
	}

	it("refuses a form with no origin on an other path of Better Auth", async () => {
		const response = await formPost("/api/auth/sign-out", {});

		expect(response.status).toBe(403);
	});

	it("refuses a form with the origin null", async () => {
		const response = await formPost("/api/accounts", { origin: "null" });

		expect(response.status).toBe(403);
	});

	it("refuses an urlencoded form on a snapshot", async () => {
		const account = createAccount(db, { userId, programId: "ba-club" });

		const response = await app.request(`/api/accounts/${account}/snapshots`, {
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				cookie,
				origin: "https://evil.example.com",
			},
			body: "points=1000&observedAt=2026-08-11",
		});

		expect(response.status).toBe(403);
		expect(currentBalances(db, userId)).toMatchObject([{ points: null }]);
	});

	it("refuses a DELETE with no body from an other origin", async () => {
		const account = createAccount(db, { userId, programId: "ba-club" });

		const response = await app.request(`/api/accounts/${account}`, {
			method: "DELETE",
			headers: { cookie, origin: "https://evil.example.com" },
		});

		expect(response.status).toBe(403);
		expect(countAccounts(db, userId)).toBe(1);
	});

	it("accepts a body of JSON from the same origin", async () => {
		const response = await app.request("/api/accounts", {
			method: "POST",
			headers: { "content-type": "application/json", ...sameOrigin() },
			body: JSON.stringify({ programId: "ba-club" }),
		});

		expect(response.status).toBe(201);
	});

	it("accepts the origin of TRUSTED_ORIGINS", async () => {
		const response = await formPost("/api/accounts", { origin: VITE_URL });

		expect(response.status).toBe(201);
	});

	it("accepts a request of the page itself, with sec-fetch-site", async () => {
		const response = await formPost("/api/accounts", {
			"sec-fetch-site": "same-origin",
		});

		expect(response.status).toBe(201);
	});

	// The middleware of the session is first: a request with no session gets
	// the status 401 also from an other origin.
	it("gives the status 401 to a form of an other origin with no cookie", async () => {
		const response = await app.request("/api/accounts", {
			method: "POST",
			headers: {
				"content-type": "text/plain",
				origin: "https://evil.example.com",
			},
			body: "{}",
		});

		expect(response.status).toBe(401);
	});
});

describe("the security headers", () => {
	const paths = ["/api/health", "/api/accounts", "/api/nope"];

	for (const path of paths) {
		it(`gives the headers on ${path}`, async () => {
			const response = await app.request(path, { headers: { cookie } });

			expect(response.headers.get("x-content-type-options")).toBe("nosniff");
			expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
			expect(response.headers.get("referrer-policy")).toBe(
				"strict-origin-when-cross-origin",
			);
			expect(response.headers.get("strict-transport-security")).toBeNull();
		});
	}

	it("gives the headers also to an answer with the status 401", async () => {
		const response = await app.request("/api/accounts");

		expect(response.status).toBe(401);
		expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
	});

	// The files of the client come after `createApp`, in `index.ts`.
	it("gives the headers to a route after createApp", async () => {
		app.get("/a-page", (c) => c.html("<p>page</p>"));

		const response = await app.request("/a-page");

		expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
	});
});

describe("the metadata of OAuth at the root", () => {
	// A client reads these paths before the sign-in, thus they need no session.
	for (const path of [
		"/.well-known/oauth-authorization-server/api/auth",
		"/.well-known/oauth-protected-resource",
		"/.well-known/oauth-protected-resource/mcp",
	]) {
		it(`gives ${path} with no session`, async () => {
			const response = await app.request(path);
			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain(
				"application/json",
			);
		});
	}

	it("gives the status 404 to an other path of /.well-known", async () => {
		const response = await app.request("/.well-known/no-such-document");
		expect(response.status).toBe(404);
	});
});

describe("the challenge of the domain of OpenAI", () => {
	const PATH = "/.well-known/openai-apps-challenge";

	/** The application with the value of `OPENAI_APPS_CHALLENGE_TOKEN`. */
	function challengeApp(openaiChallenge: string) {
		const auth = createAuth(db, {
			secret: "a-secret-for-the-test",
			baseURL: BASE_URL,
			google: {
				clientId: "client-id-test",
				clientSecret: "client-secret-test",
			},
		});
		return createApp(db, auth, [BASE_URL], { openaiChallenge });
	}

	// The portal of OpenAI reads the token as plain text: no JSON, no other
	// character. Paragraph 4.7.4 of `docs/architecture.md`.
	it("gives the exact token as plain text", async () => {
		const withToken = challengeApp("token-of-the-portal");

		const response = await withToken.request(PATH);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
		expect(await response.text()).toBe("token-of-the-portal");
	});

	// A value from `.env` can hold a space or a line end of the copy.
	it("removes the spaces around the token", async () => {
		const withToken = challengeApp("  token-of-the-portal\n");

		expect(await (await withToken.request(PATH)).text()).toBe(
			"token-of-the-portal",
		);
	});

	it("gives the status 404 with no token", async () => {
		expect((await app.request(PATH)).status).toBe(404);
	});

	// Docker Compose gives an empty text when `.env` holds no value.
	it("gives the status 404 with an empty token", async () => {
		const empty = challengeApp(" ");

		expect((await empty.request(PATH)).status).toBe(404);
	});

	// The route comes before the routes of Better Auth, and it must not
	// replace them.
	it("keeps the metadata of OAuth with a token", async () => {
		const withToken = challengeApp("token-of-the-portal");

		for (const path of [
			"/.well-known/oauth-authorization-server/api/auth",
			"/.well-known/oauth-protected-resource/mcp",
		]) {
			const response = await withToken.request(path);
			expect(response.status, path).toBe(200);
			expect(await response.text(), path).not.toContain("token-of-the-portal");
		}
	});
});

describe("GET /api/health", () => {
	it("gives the status ok when the database answers", async () => {
		const body = await getJson<{ status: string }>("/api/health");
		expect(body).toEqual({ status: "ok" });
	});

	it("gives the status 503 when the database does not answer", async () => {
		db.$client.close();
		const response = await app.request("/api/health");
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ status: "error" });
	});
});

/**
 * The server supplies the files of the client after the routes of the API. A
 * path of the API that no route matches must give an error of the API, and not
 * the page of the client.
 */
describe("a path of the API that no route matches", () => {
	it("gives the status 404 and a body of JSON", async () => {
		const response = await app.request("/api/nope", { headers: { cookie } });
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "not_found" });
	});

	it("gives the status 404 with a method that the route does not hold", async () => {
		const response = await app.request("/api/catalogue", {
			method: "DELETE",
			headers: sameOrigin(),
		});
		expect(response.status).toBe(404);
	});

	// The path is under the exceptions of the session, thus the answer arrives
	// with no cookie. It stays an answer of the API.
	it("gives the status 404 on a path of the health with no cookie", async () => {
		const response = await app.request("/api/health/nope");
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "not_found" });
	});

	it("gives the status 401 with no cookie, and not the status 404", async () => {
		const response = await app.request("/api/nope");
		expect(response.status).toBe(401);
	});
});

describe("GET /api/catalogue", () => {
	it("gives the currencies and the programmes", async () => {
		const body = await getJson<{
			currencies: { id: string }[];
			programs: { id: string }[];
		}>("/api/catalogue");
		expect(body.currencies.length).toBeGreaterThan(0);
		expect(body.programs.some((row) => row.id === "ba-club")).toBe(true);
	});
});

describe("POST /api/accounts", () => {
	it("makes an account and gives the id", async () => {
		const response = await post("/api/accounts", { programId: "ba-club" });
		expect(response.status).toBe(201);
		const body = (await response.json()) as { id: string };
		expect(body.id).toEqual(expect.any(String));
	});

	it("refuses a body with no programme", async () => {
		expect((await post("/api/accounts", {})).status).toBe(400);
	});

	it("refuses a body that is not JSON", async () => {
		const response = await app.request("/api/accounts", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: "not json",
		});
		expect(response.status).toBe(400);
	});

	it("refuses a programme that the catalogue does not have", async () => {
		const response = await post("/api/accounts", {
			programId: "does-not-exist",
		});
		expect(response.status).toBe(404);
	});

	// One request makes the account and its first balance. Two requests left an
	// account with no balance after an error of the second one, and a second
	// "Salva" then made a second account.
	it("makes the account and its first balance in one request", async () => {
		const response = await post("/api/accounts", {
			programId: "ba-club",
			snapshot: { points: 10000, observedAt: "2026-08-11" },
		});

		expect(response.status).toBe(201);
		const { id } = (await response.json()) as { id: string };
		expect(currentBalances(db, userId)).toEqual([
			expect.objectContaining({
				accountId: id,
				points: 10000,
				observedAt: "2026-08-11",
			}),
		]);
	});

	it("makes an account with no balance with no snapshot", async () => {
		await post("/api/accounts", { programId: "ba-club" });

		expect(currentBalances(db, userId)).toEqual([
			expect.objectContaining({ points: null, snapshotId: null }),
		]);
	});

	it("refuses a first balance that is not correct and writes no account", async () => {
		for (const snapshot of [
			{ points: -1, observedAt: "2026-08-11" },
			{ points: 10, observedAt: "2026-02-30" },
		]) {
			const response = await post("/api/accounts", {
				programId: "ba-club",
				snapshot,
			});
			expect(response.status).toBe(400);
		}
		expect(countAccounts(db, userId)).toBe(0);
	});

	it("refuses a first balance in the future and writes no account", async () => {
		vi.setSystemTime("2026-11-09T23:30:00.000Z");

		const response = await post("/api/accounts", {
			programId: "ba-club",
			snapshot: { points: 10, observedAt: "2026-11-11" },
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "future_date" });
		expect(countAccounts(db, userId)).toBe(0);
	});

	it("refuses an unknown programme with a balance and writes no row", async () => {
		const response = await post("/api/accounts", {
			programId: "does-not-exist",
			snapshot: { points: 10, observedAt: "2026-08-11" },
		});

		expect(response.status).toBe(404);
		expect(countAccounts(db, userId)).toBe(0);
	});
});

// Sign-up is open, and two accounts of one programme are allowed on purpose.
// Without a ceiling, one user with 50,000 accounts stops the process for about
// one second on each `GET /api/potential`. Refer to paragraph 4.4 of
// `docs/architecture.md`.
describe("the ceiling of the accounts of a user", () => {
	/** Writes accounts with the query: the route is too slow for 99 rows. */
	function fill(owner: string, count: number) {
		for (let index = 0; index < count; index++) {
			createAccount(db, { userId: owner, programId: "ba-club" });
		}
	}

	it("accepts the last account below the ceiling", async () => {
		fill(userId, MAX_ACCOUNTS_PER_USER - 1);

		const response = await post("/api/accounts", { programId: "ba-club" });

		expect(response.status).toBe(201);
		expect(countAccounts(db, userId)).toBe(MAX_ACCOUNTS_PER_USER);
	});

	it("refuses an account above the ceiling and writes no row", async () => {
		fill(userId, MAX_ACCOUNTS_PER_USER);

		const response = await post("/api/accounts", { programId: "ba-club" });

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: "too_many_accounts" });
		expect(countAccounts(db, userId)).toBe(MAX_ACCOUNTS_PER_USER);
	});

	it("counts the accounts of the user, not of the instance", async () => {
		fill(OTHER_USER, MAX_ACCOUNTS_PER_USER);

		const response = await post("/api/accounts", { programId: "ba-club" });

		expect(response.status).toBe(201);
	});

	it("accepts an account again after a removal", async () => {
		fill(userId, MAX_ACCOUNTS_PER_USER);
		const [first] = currentBalances(db, userId);
		await remove(`/api/accounts/${first?.accountId}`);

		const response = await post("/api/accounts", { programId: "ba-club" });

		expect(response.status).toBe(201);
	});

	// The body is examined first: a body that is not correct gives 400 also at
	// the ceiling, and a programme that does not exist gives 404.
	it("gives 400 for a body that is not correct, also at the ceiling", async () => {
		fill(userId, MAX_ACCOUNTS_PER_USER);

		expect((await post("/api/accounts", {})).status).toBe(400);
	});
});

// `c.req.json()` reads the full body into memory, and the container has 512 MB.
describe("the limit of the size of a body", () => {
	/** A body of JSON of exactly `size` bytes. Zod removes the field `pad`. */
	function bodyOf(size: number, fields: Record<string, unknown>) {
		const empty = JSON.stringify({ ...fields, pad: "" });
		return JSON.stringify({ ...fields, pad: "x".repeat(size - empty.length) });
	}

	function postRaw(path: string, body: string, headers: HeadersInit = {}) {
		return app.request(path, {
			method: "POST",
			headers: { "content-type": "application/json", cookie, ...headers },
			body,
		});
	}

	it("accepts a body of exactly the limit", async () => {
		const body = bodyOf(MAX_BODY_BYTES, { programId: "ba-club" });
		expect(body.length).toBe(MAX_BODY_BYTES);

		expect((await postRaw("/api/accounts", body)).status).toBe(201);
	});

	it("refuses a body above the limit on POST /api/accounts", async () => {
		const body = bodyOf(MAX_BODY_BYTES + 1, { programId: "ba-club" });

		const response = await postRaw("/api/accounts", body);

		expect(response.status).toBe(413);
		expect(await response.json()).toEqual({ error: "payload_too_large" });
		expect(countAccounts(db, userId)).toBe(0);
	});

	it("refuses a body above the limit on POST /api/accounts/:id/snapshots", async () => {
		const account = createAccount(db, { userId, programId: "ba-club" });
		const body = bodyOf(MAX_BODY_BYTES + 1, {
			points: 1000,
			observedAt: "2026-08-11",
		});

		const response = await postRaw(`/api/accounts/${account}/snapshots`, body);

		expect(response.status).toBe(413);
		expect(currentBalances(db, userId)).toMatchObject([{ points: null }]);
	});

	// The server of Node gives the header `content-length`. The middleware
	// then refuses the body before it reads it.
	it("refuses a body with a content-length above the limit", async () => {
		const body = bodyOf(MAX_BODY_BYTES + 1, { programId: "ba-club" });

		const response = await postRaw("/api/accounts", body, {
			"content-length": String(body.length),
		});

		expect(response.status).toBe(413);
	});

	it("keeps the sign-in of Better Auth below the limit", async () => {
		const response = await app.request("/api/auth/sign-in/social", {
			method: "POST",
			headers: { "content-type": "application/json", origin: BASE_URL },
			body: JSON.stringify({ provider: "google", callbackURL: "/dashboard" }),
		});

		expect(response.status).toBe(200);
	});

	it("refuses a body above the limit on a route of Better Auth", async () => {
		const response = await postRaw(
			"/api/auth/sign-in/social",
			bodyOf(MAX_BODY_BYTES + 1, { provider: "google" }),
			{ origin: BASE_URL },
		);

		expect(response.status).toBe(413);
	});
});

describe("POST /api/accounts/:id/snapshots", () => {
	it("adds a snapshot", async () => {
		const account = createAccount(db, {
			userId,
			programId: "ba-club",
		});
		const response = await post(`/api/accounts/${account}/snapshots`, {
			points: 1000,
			observedAt: "2026-08-11",
		});
		expect(response.status).toBe(201);
	});

	it("refuses a balance below 0", async () => {
		const account = createAccount(db, {
			userId,
			programId: "ba-club",
		});
		const response = await post(`/api/accounts/${account}/snapshots`, {
			points: -1,
			observedAt: "2026-08-11",
		});
		expect(response.status).toBe(400);
	});

	it("refuses a balance that is not an integer", async () => {
		const account = createAccount(db, {
			userId,
			programId: "ba-club",
		});
		const response = await post(`/api/accounts/${account}/snapshots`, {
			points: 10.5,
			observedAt: "2026-08-11",
		});
		expect(response.status).toBe(400);
	});

	it("refuses a date that is not correct", async () => {
		const account = createAccount(db, {
			userId,
			programId: "ba-club",
		});
		const response = await post(`/api/accounts/${account}/snapshots`, {
			points: 10,
			observedAt: "2026-13-45",
		});
		expect(response.status).toBe(400);
	});

	it("refuses a day that the month does not hold", async () => {
		const account = createAccount(db, { userId, programId: "ba-club" });
		const response = await post(`/api/accounts/${account}/snapshots`, {
			points: 10,
			observedAt: "2026-02-30",
		});
		expect(response.status).toBe(400);
		expect(currentBalances(db, userId)[0]?.points).toBeNull();
	});

	// At 00:30 in Rome the date in UTC is the day before. Thus the date of the
	// user can be one day after the date of the server.
	it("accepts the date of today and of tomorrow in UTC", async () => {
		vi.setSystemTime("2026-11-09T23:30:00.000Z");
		const account = createAccount(db, { userId, programId: "ba-club" });
		for (const observedAt of ["2026-11-09", "2026-11-10"]) {
			const response = await post(`/api/accounts/${account}/snapshots`, {
				points: 10,
				observedAt,
			});
			expect(response.status).toBe(201);
		}
	});

	// A snapshot of 2062 in place of 2026 stays the current balance for 36
	// years: each later update holds an older date.
	it("refuses a date after tomorrow in UTC, and writes no row", async () => {
		vi.setSystemTime("2026-11-09T23:30:00.000Z");
		const account = createAccount(db, { userId, programId: "ba-club" });
		for (const observedAt of ["2026-11-11", "2062-11-09"]) {
			const response = await post(`/api/accounts/${account}/snapshots`, {
				points: 10,
				observedAt,
			});
			expect(response.status).toBe(400);
		}
		expect(currentBalances(db, userId)[0]?.points).toBeNull();
	});

	// The clock goes back, not forward: a later clock makes the session of the
	// test expire.
	it("moves the limit to the next year on 31 December", async () => {
		vi.setSystemTime("2025-12-31T12:00:00.000Z");
		const account = createAccount(db, { userId, programId: "ba-club" });
		const accepted = await post(`/api/accounts/${account}/snapshots`, {
			points: 10,
			observedAt: "2026-01-01",
		});
		expect(accepted.status).toBe(201);
		const refused = await post(`/api/accounts/${account}/snapshots`, {
			points: 10,
			observedAt: "2026-01-02",
		});
		expect(refused.status).toBe(400);
	});

	it("refuses the account of an other user", async () => {
		const account = createAccount(db, {
			userId: OTHER_USER,
			programId: "ba-club",
		});
		const response = await post(`/api/accounts/${account}/snapshots`, {
			points: 10,
			observedAt: "2026-08-11",
		});
		expect(response.status).toBe(404);
	});
});

describe("the expiry lots of a snapshot", () => {
	it("writes the lots and gives them with the balance", async () => {
		const account = createAccount(db, { userId, programId: "ba-club" });
		const response = await post(`/api/accounts/${account}/snapshots`, {
			points: 10000,
			observedAt: "2026-08-11",
			lots: [{ points: 4000, expiresOn: "2027-03-31" }],
		});
		expect(response.status).toBe(201);

		const body = await getJson<{ accounts: unknown[] }>("/api/accounts");
		expect(body.accounts).toMatchObject([
			{ points: 10000, lots: [{ points: 4000, expiresOn: "2027-03-31" }] },
		]);
	});

	it("refuses lots above the balance, and writes no row", async () => {
		const account = createAccount(db, { userId, programId: "ba-club" });
		const response = await post(`/api/accounts/${account}/snapshots`, {
			points: 100,
			observedAt: "2026-08-11",
			lots: [{ points: 101, expiresOn: "2027-03-31" }],
		});
		expect(response.status).toBe(400);
		expect(currentBalances(db, userId)[0]?.points).toBeNull();
	});

	// The schema refuses two lots of one date before the database. Thus the
	// answer is 400, not 500.
	it("refuses two lots with the same date with the status 400", async () => {
		const account = createAccount(db, { userId, programId: "ba-club" });
		const response = await post(`/api/accounts/${account}/snapshots`, {
			points: 100,
			observedAt: "2026-08-11",
			lots: [
				{ points: 10, expiresOn: "2027-03-31" },
				{ points: 10, expiresOn: "2027-03-31" },
			],
		});
		expect(response.status).toBe(400);
	});

	it("writes the lots of the first balance of a new account", async () => {
		const response = await post("/api/accounts", {
			programId: "ba-club",
			snapshot: {
				points: 100,
				observedAt: "2026-08-11",
				lots: [{ points: 100, expiresOn: "2026-12-31" }],
			},
		});
		expect(response.status).toBe(201);
		expect(currentBalances(db, userId)[0]?.lots).toEqual([
			{ points: 100, expiresOn: "2026-12-31" },
		]);
	});
});

describe("GET /api/accounts", () => {
	it("gives the account with its current balance", async () => {
		const account = createAccount(db, {
			userId,
			programId: "ba-club",
		});
		const snapshot = addSnapshot(db, {
			accountId: account,
			points: 1000,
			observedAt: "2026-08-01",
		});

		const body = await getJson<{ accounts: unknown[] }>("/api/accounts");
		expect(body.accounts).toMatchObject([
			{
				programId: "ba-club",
				points: 1000,
				observedAt: "2026-08-01",
				snapshotId: snapshot,
			},
		]);
	});
});

describe("DELETE /api/accounts/:id", () => {
	it("removes the account of the user", async () => {
		const account = createAccount(db, { userId, programId: "ba-club" });

		const response = await remove(`/api/accounts/${account}`);

		expect(response.status).toBe(204);
		expect(currentBalances(db, userId)).toEqual([]);
	});

	it("refuses the account of an other user", async () => {
		const account = createAccount(db, {
			userId: OTHER_USER,
			programId: "ba-club",
		});

		const response = await remove(`/api/accounts/${account}`);

		expect(response.status).toBe(404);
		expect(currentBalances(db, OTHER_USER)).toHaveLength(1);
	});

	it("refuses an account that does not exist", async () => {
		expect((await remove("/api/accounts/does-not-exist")).status).toBe(404);
	});
});

describe("DELETE /api/accounts/:id/snapshots/:snapshotId", () => {
	it("removes the snapshot and gives the balance before it", async () => {
		const account = createAccount(db, { userId, programId: "ba-club" });
		addSnapshot(db, {
			accountId: account,
			points: 1900,
			observedAt: "2026-01-01",
		});
		const wrong = addSnapshot(db, {
			accountId: account,
			points: 19000,
			observedAt: "2026-08-01",
		});

		const response = await remove(
			`/api/accounts/${account}/snapshots/${wrong}`,
		);

		expect(response.status).toBe(204);
		expect(currentBalances(db, userId)).toMatchObject([{ points: 1900 }]);
	});

	it("refuses a snapshot that does not exist", async () => {
		const account = createAccount(db, { userId, programId: "ba-club" });
		const response = await remove(
			`/api/accounts/${account}/snapshots/does-not-exist`,
		);
		expect(response.status).toBe(404);
	});

	// The path holds the account of the user, but the snapshot belongs to an
	// other account. The condition of the query holds the two ids.
	it("refuses a snapshot of an other account", async () => {
		const mine = createAccount(db, { userId, programId: "ba-club" });
		const other = createAccount(db, { userId, programId: "amex-mr" });
		const snapshot = addSnapshot(db, {
			accountId: other,
			points: 100,
			observedAt: "2026-08-01",
		});

		const response = await remove(
			`/api/accounts/${mine}/snapshots/${snapshot}`,
		);

		expect(response.status).toBe(404);
		expect(currentBalances(db, userId)).toContainEqual(
			expect.objectContaining({ accountId: other, points: 100 }),
		);
	});

	it("refuses the account of an other user", async () => {
		const account = createAccount(db, {
			userId: OTHER_USER,
			programId: "ba-club",
		});
		const snapshot = addSnapshot(db, {
			accountId: account,
			points: 100,
			observedAt: "2026-08-01",
		});

		const response = await remove(
			`/api/accounts/${account}/snapshots/${snapshot}`,
		);

		expect(response.status).toBe(404);
		expect(currentBalances(db, OTHER_USER)).toMatchObject([{ points: 100 }]);
	});
});

describe("GET /api/potential", () => {
	// The catalogue grows. Therefore this test reads the expected list from the
	// catalogue. A list of names here breaks with each new programme.
	it("gives one result for each airline currency", async () => {
		const airline = currencies
			.filter((currency) => currency.kind === "airline")
			.map((currency) => currency.id);

		const body = await getJson<{ potential: PotentialRow[] }>("/api/potential");
		expect(body.potential.map((row) => row.currencyId).sort()).toEqual(
			[...airline].sort(),
		);
	});

	it("adds the two balances of Avios and the best route", async () => {
		for (const [programId, points] of [
			["ba-club", 1000],
			["iberia-club", 500],
			["amex-mr", 700],
		] as const) {
			const account = createAccount(db, {
				userId,
				programId,
			});
			addSnapshot(db, { accountId: account, points, observedAt: "2026-08-11" });
		}

		const body = await getJson<{ potential: PotentialRow[] }>("/api/potential");
		const avios = body.potential.find((row) => row.currencyId === "avios");
		expect(avios).toMatchObject({
			current: 1500,
			fromTransfers: 400,
			total: 1900,
			routes: [{ fromProgramId: "amex-mr", points: 400 }],
		});
		// The card names no target programme, thus the answer holds none.
		expect(avios?.routes[0]).not.toHaveProperty("toProgramId");
	});

	// The user writes a balance and corrects it on the same day. The id of the
	// correction sorts first, thus an order by the id gives the old balance.
	it("uses the balance that the user corrected on the same day", async () => {
		const account = createAccount(db, { userId, programId: "amex-mr" });
		const randomUUID = vi.spyOn(crypto, "randomUUID");
		const now = Date.now();
		vi.setSystemTime(now - 60_000);
		randomUUID.mockReturnValueOnce("ffffffff-ffff-4fff-bfff-ffffffffffff");
		addSnapshot(db, {
			accountId: account,
			points: 10000,
			observedAt: "2026-11-09",
		});
		vi.setSystemTime(now);
		randomUUID.mockReturnValueOnce("00000000-0000-4000-8000-000000000000");
		addSnapshot(db, {
			accountId: account,
			points: 12000,
			observedAt: "2026-11-09",
		});
		vi.useRealTimers();

		const body = await getJson<{ potential: PotentialRow[] }>("/api/potential");
		const avios = body.potential.find((row) => row.currencyId === "avios");
		// Iberia Club gives 4 Avios for 5 points: 12 000 points give 9 600 Avios.
		expect(avios).toMatchObject({ fromTransfers: 9600 });
	});

	it("ignores an account with no snapshot", async () => {
		createAccount(db, { userId, programId: "amex-mr" });
		const body = await getJson<{ potential: PotentialRow[] }>("/api/potential");
		expect(body.potential.every((row) => row.total === 0)).toBe(true);
	});
});

describe("the routes of the favourites", () => {
	type Body = { currencyIds: string[] };

	function put(path: string) {
		return app.request(path, { method: "PUT", headers: sameOrigin() });
	}

	it("gives no currency for a user with no favourite", async () => {
		expect(await getJson<Body>("/api/favorites")).toEqual({ currencyIds: [] });
	});

	it("marks a currency and then gives it", async () => {
		expect((await put("/api/favorites/avios")).status).toBe(204);
		expect(await getJson<Body>("/api/favorites")).toEqual({
			currencyIds: ["avios"],
		});
	});

	// The user taps the heart on two devices. The second request gives the same
	// answer, and the list holds one currency.
	it("gives the status 204 for a second mark of the same currency", async () => {
		await put("/api/favorites/avios");
		expect((await put("/api/favorites/avios")).status).toBe(204);
		expect((await getJson<Body>("/api/favorites")).currencyIds).toEqual([
			"avios",
		]);
	});

	it("gives the status 404 for a currency that does not exist", async () => {
		const response = await put("/api/favorites/does-not-exist");
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "unknown_currency" });
	});

	it("removes the mark", async () => {
		await put("/api/favorites/avios");
		expect((await remove("/api/favorites/avios")).status).toBe(204);
		expect(await getJson<Body>("/api/favorites")).toEqual({ currencyIds: [] });
	});

	// The request asks for a state. A currency with no mark already holds that
	// state, thus the answer is the same.
	it("gives the status 204 for a currency with no mark", async () => {
		expect((await remove("/api/favorites/avios")).status).toBe(204);
	});

	it("gives no favourite of an other user", async () => {
		addFavorite(db, { userId: OTHER_USER, currencyId: "avios" });
		expect(await getJson<Body>("/api/favorites")).toEqual({ currencyIds: [] });
	});

	it("keeps the mark of an other user", async () => {
		addFavorite(db, { userId: OTHER_USER, currencyId: "avios" });
		expect((await remove("/api/favorites/avios")).status).toBe(204);
		expect(favoriteCurrencies(db, OTHER_USER)).toEqual(["avios"]);
	});
});

/**
 * The limits of the free account, with `FREE_ACCOUNT_LIMITS` at true.
 * Paragraph 4.6 of `docs/architecture.md` gives the rules. `canAddAccount`
 * and `canWriteExpiryLots` have their own tests: these tests examine the
 * answer of the routes.
 */
describe("the limits of the free account", () => {
	let limited: ReturnType<typeof createApp>;

	beforeEach(() => {
		const auth = createAuth(db, {
			secret: "a-secret-for-the-test",
			baseURL: BASE_URL,
			google: {
				clientId: "client-id-test",
				clientSecret: "client-secret-test",
			},
		});
		limited = createApp(db, auth, [BASE_URL], { limits: true });
	});

	function postTo(
		target: ReturnType<typeof createApp>,
		path: string,
		body: unknown,
	) {
		return target.request(path, {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify(body),
		});
	}

	const LOTS = [{ points: 500, expiresOn: "2027-03-31" }];

	it("refuses Klarna to a free account and writes no row", async () => {
		const response = await postTo(limited, "/api/accounts", {
			programId: "klarna",
		});

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: "supporter_required" });
		expect(countAccounts(db, userId)).toBe(0);
	});

	it("gives Amex to a free account", async () => {
		const response = await postTo(limited, "/api/accounts", {
			programId: "amex-mr",
		});

		expect(response.status).toBe(201);
	});

	it("refuses the third airline programme to a free account", async () => {
		createAccount(db, { userId, programId: "ba-club" });
		createAccount(db, { userId, programId: "flying-blue" });

		const response = await postTo(limited, "/api/accounts", {
			programId: "sas",
		});

		expect(response.status).toBe(403);
		expect(countAccounts(db, userId)).toBe(2);
	});

	it("counts the airline programmes of the user, not of the instance", async () => {
		createAccount(db, { userId: OTHER_USER, programId: "ba-club" });
		createAccount(db, { userId: OTHER_USER, programId: "flying-blue" });

		const response = await postTo(limited, "/api/accounts", {
			programId: "sas",
		});

		expect(response.status).toBe(201);
	});

	it("refuses a first balance with lots and writes no account", async () => {
		const response = await postTo(limited, "/api/accounts", {
			programId: "amex-mr",
			snapshot: { points: 1900, observedAt: "2026-11-01", lots: LOTS },
		});

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: "supporter_required" });
		expect(countAccounts(db, userId)).toBe(0);
	});

	it("accepts a first balance with no lot", async () => {
		const response = await postTo(limited, "/api/accounts", {
			programId: "amex-mr",
			snapshot: { points: 1900, observedAt: "2026-11-01", lots: [] },
		});

		expect(response.status).toBe(201);
	});

	it("refuses the lots of a new snapshot of a free account", async () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		const response = await postTo(
			limited,
			`/api/accounts/${accountId}/snapshots`,
			{ points: 1900, observedAt: "2026-11-01", lots: LOTS },
		);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: "supporter_required" });
		expect(currentBalances(db, userId)[0]?.points).toBeNull();
	});

	// A former supporter: the form of a new balance sends the current lots again.
	it("accepts the current lots of a free account again", async () => {
		const accountId = createAccount(db, {
			userId,
			programId: "amex-mr",
			snapshot: { points: 1900, observedAt: "2026-10-01", lots: LOTS },
		});

		const response = await postTo(
			limited,
			`/api/accounts/${accountId}/snapshots`,
			{ points: 2500, observedAt: "2026-11-01", lots: LOTS },
		);

		expect(response.status).toBe(201);
		expect(currentBalances(db, userId)[0]).toMatchObject({
			points: 2500,
			lots: LOTS,
		});
	});

	it("gives each function to an unlimited account", async () => {
		db.update(user).set({ unlimited: true }).where(eq(user.id, userId)).run();

		const created = await postTo(limited, "/api/accounts", {
			programId: "klarna",
			snapshot: { points: 1900, observedAt: "2026-11-01", lots: LOTS },
		});

		expect(created.status).toBe(201);
	});

	it("gives each function to a free account with no limits", async () => {
		const created = await post("/api/accounts", {
			programId: "klarna",
			snapshot: { points: 1900, observedAt: "2026-11-01", lots: LOTS },
		});

		expect(created.status).toBe(201);
	});

	// The client disables the options of the forms with these two values.
	it("gives the limits and the level in GET /api/me", async () => {
		const free = await limited.request("/api/me", { headers: { cookie } });
		expect(await free.json()).toEqual({
			admin: false,
			limits: true,
			tier: "free",
		});

		db.update(user).set({ unlimited: true }).where(eq(user.id, userId)).run();
		const unlimited = await limited.request("/api/me", { headers: { cookie } });
		expect(await unlimited.json()).toMatchObject({ tier: "unlimited" });
	});

	it("examines the programme before the level", async () => {
		const response = await postTo(limited, "/api/accounts", {
			programId: "nothing",
		});

		expect(response.status).toBe(404);
	});
});

describe("the routes of the administrator", () => {
	/** The address of the user of the session. `insertUser` writes it. */
	const ADMIN_EMAIL = "primo@example.com";
	let admin: ReturnType<typeof createApp>;

	beforeEach(async () => {
		// Google verifies the address at the sign-in. The fixture does not.
		db.update(user)
			.set({ emailVerified: true })
			.where(eq(user.id, userId))
			.run();
		const auth = createAuth(db, {
			secret: "a-secret-for-the-test",
			baseURL: BASE_URL,
			google: {
				clientId: "client-id-test",
				clientSecret: "client-secret-test",
			},
		});
		admin = createApp(db, auth, [BASE_URL], { adminEmail: ADMIN_EMAIL });
	});

	function adminGet(target: ReturnType<typeof createApp>, path: string) {
		return target.request(path, { headers: { cookie } });
	}

	function adminPut(
		target: ReturnType<typeof createApp>,
		path: string,
		body: unknown,
		headers: Record<string, string> = {},
	) {
		return target.request(path, {
			method: "PUT",
			headers: { "content-type": "application/json", cookie, ...headers },
			body: JSON.stringify(body),
		});
	}

	describe("GET /api/me", () => {
		it("gives true to the administrator", async () => {
			const response = await adminGet(admin, "/api/me");
			expect(await response.json()).toEqual({
				admin: true,
				limits: false,
				tier: "free",
			});
		});

		it("gives false to an other user", async () => {
			const response = await adminGet(app, "/api/me");
			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({
				admin: false,
				limits: false,
				tier: "free",
			});
		});
	});

	describe("the protection", () => {
		// The answer of a path that does not exist. A user reads nothing about
		// the routes of the administrator.
		it("gives the status 404 to a user that is not the administrator", async () => {
			const list = await adminGet(app, "/api/admin/users");
			expect(list.status).toBe(404);
			expect(await list.json()).toEqual({ error: "not_found" });
			const write = await adminPut(
				app,
				`/api/admin/users/${OTHER_USER}/unlimited`,
				{ unlimited: true },
			);
			expect(write.status).toBe(404);
		});

		it("writes no flag for a user that is not the administrator", async () => {
			await adminPut(app, `/api/admin/users/${OTHER_USER}/unlimited`, {
				unlimited: true,
			});
			const row = db.select().from(user).where(eq(user.id, OTHER_USER)).get();
			expect(row?.unlimited).toBe(false);
		});

		it("refuses an address that is not verified", async () => {
			db.update(user)
				.set({ emailVerified: false })
				.where(eq(user.id, userId))
				.run();
			expect((await adminGet(admin, "/api/admin/users")).status).toBe(404);
		});

		it("gives the status 404 to a path of the administrator that does not exist", async () => {
			expect((await adminGet(admin, "/api/admin/other")).status).toBe(404);
		});

		it("refuses a form of an other origin", async () => {
			const response = await admin.request(
				`/api/admin/users/${OTHER_USER}/unlimited`,
				{
					method: "PUT",
					headers: {
						cookie,
						origin: "https://other.example.com",
						"content-type": "text/plain",
					},
					body: JSON.stringify({ unlimited: true }),
				},
			);
			expect(response.status).toBe(403);
		});
	});

	describe("GET /api/admin/users", () => {
		type Body = {
			users: {
				id: string;
				email: string;
				createdAt: string;
				tier: string;
				supporterUntil: string | null;
				unlimited: boolean;
			}[];
		};

		async function users(): Promise<Body["users"]> {
			const response = await adminGet(admin, "/api/admin/users");
			expect(response.status).toBe(200);
			return ((await response.json()) as Body).users;
		}

		it("gives each user with the level", async () => {
			const rows = await users();
			expect(rows.map((row) => row.id).toSorted()).toEqual(
				[OTHER_USER, userId].toSorted(),
			);
			expect(rows.find((row) => row.id === OTHER_USER)).toMatchObject({
				email: `${OTHER_USER}@example.com`,
				tier: "free",
				supporterUntil: null,
				unlimited: false,
			});
		});

		it("gives the dates in the ISO 8601 format", async () => {
			db.update(user)
				.set({
					createdAt: new Date("2026-01-02T03:04:05Z"),
					supporterUntil: new Date("2099-01-01T00:00:00Z"),
				})
				.where(eq(user.id, OTHER_USER))
				.run();
			const row = (await users()).find((item) => item.id === OTHER_USER);
			expect(row?.createdAt).toBe("2026-01-02T03:04:05.000Z");
			expect(row?.supporterUntil).toBe("2099-01-01T00:00:00.000Z");
			expect(row?.tier).toBe("supporter");
		});

		it("gives the level of the clock of the server", async () => {
			db.update(user)
				.set({ supporterUntil: new Date("2026-01-01T00:00:00Z") })
				.where(eq(user.id, OTHER_USER))
				.run();
			vi.useFakeTimers({ toFake: ["Date"] });
			vi.setSystemTime("2026-06-01T00:00:00Z");
			const row = (await users()).find((item) => item.id === OTHER_USER);
			expect(row?.tier).toBe("free");
		});

		it("gives the level unlimited before the date of the payment", async () => {
			db.update(user)
				.set({
					unlimited: true,
					supporterUntil: new Date("2099-01-01T00:00:00Z"),
				})
				.where(eq(user.id, OTHER_USER))
				.run();
			const row = (await users()).find((item) => item.id === OTHER_USER);
			expect(row?.tier).toBe("unlimited");
		});
	});

	describe("PUT /api/admin/users/:id/unlimited", () => {
		const path = `/api/admin/users/${OTHER_USER}/unlimited`;

		function unlimitedOf(id: string): boolean | undefined {
			return db.select().from(user).where(eq(user.id, id)).get()?.unlimited;
		}

		it("writes the flag", async () => {
			const response = await adminPut(admin, path, { unlimited: true });
			expect(response.status).toBe(204);
			expect(unlimitedOf(OTHER_USER)).toBe(true);
		});

		it("removes the flag", async () => {
			await adminPut(admin, path, { unlimited: true });
			const response = await adminPut(admin, path, { unlimited: false });
			expect(response.status).toBe(204);
			expect(unlimitedOf(OTHER_USER)).toBe(false);
		});

		// The administrator can give the level to the own account.
		it("writes the flag of the administrator", async () => {
			await adminPut(admin, `/api/admin/users/${userId}/unlimited`, {
				unlimited: true,
			});
			expect(unlimitedOf(userId)).toBe(true);
		});

		it("gives the status 404 for a user that does not exist", async () => {
			const response = await adminPut(
				admin,
				"/api/admin/users/nobody/unlimited",
				{ unlimited: true },
			);
			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({ error: "unknown_user" });
		});

		it("gives the status 400 for a body that is not correct", async () => {
			for (const body of [{}, { unlimited: "true" }, { unlimited: 1 }, null]) {
				const response = await adminPut(admin, path, body);
				expect(response.status).toBe(400);
			}
			expect(unlimitedOf(OTHER_USER)).toBe(false);
		});

		// The payment writes the date, and the administrator writes the flag only.
		it("refuses a field of the payment", async () => {
			const response = await adminPut(admin, path, {
				unlimited: true,
				supporterUntil: "2099-01-01T00:00:00Z",
			});
			expect(response.status).toBe(400);
			const row = db.select().from(user).where(eq(user.id, OTHER_USER)).get();
			expect(row?.supporterUntil).toBeNull();
		});
	});
});

/**
 * The assistants that the user authorised on the MCP server. Issue #97 and
 * paragraph 4.7.2 of `docs/architecture.md`.
 */
describe("the connections of the MCP server", () => {
	const CLAUDE = "https://claude.ai/oauth/mcp-client-metadata";
	const CLAUDE_CODE = "https://claude.ai/oauth/claude-code-client-metadata";

	beforeEach(() => {
		insertOAuthClient(db, CLAUDE, { name: "Claude" });
		insertOAuthClient(db, CLAUDE_CODE, { name: "Claude Code" });
	});

	/** The path of one connection: a client_id is a URL. */
	function pathOf(clientId: string): string {
		return `/api/connections/${encodeURIComponent(clientId)}`;
	}

	async function listed(): Promise<string[]> {
		const body = await getJson<{ connections: { clientId: string }[] }>(
			"/api/connections",
		);
		return body.connections.map((connection) => connection.clientId);
	}

	it("gives 401 with no session", async () => {
		expect((await app.request("/api/connections")).status).toBe(401);
		const response = await app.request(pathOf(CLAUDE), {
			method: "DELETE",
			headers: { origin: BASE_URL },
		});
		expect(response.status).toBe(401);
	});

	it("gives an empty list to a user with no consent", async () => {
		expect(await listed()).toEqual([]);
	});

	it("gives the clients of the user and no client of an other user", async () => {
		insertConnection(db, { id: "a", userId, clientId: CLAUDE });
		insertConnection(db, {
			id: "b",
			userId: OTHER_USER,
			clientId: CLAUDE_CODE,
		});

		const body = await getJson<{ connections: unknown[] }>("/api/connections");
		expect(body.connections).toEqual([
			{
				clientId: CLAUDE,
				name: "Claude",
				host: "claude.ai",
				connectedAt: expect.any(String),
			},
		]);
	});

	it("revokes a client, with a client_id that is a URL", async () => {
		insertConnection(db, { id: "a", userId, clientId: CLAUDE });
		insertConnection(db, { id: "b", userId, clientId: CLAUDE_CODE });

		const response = await remove(pathOf(CLAUDE));

		expect(response.status).toBe(204);
		expect(await listed()).toEqual([CLAUDE_CODE]);
	});

	it("gives 404 to a client of an other user and keeps its row", async () => {
		insertConnection(db, { id: "b", userId: OTHER_USER, clientId: CLAUDE });

		const response = await remove(pathOf(CLAUDE));

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "unknown_connection" });
		expect(listConnections(db, OTHER_USER)).toHaveLength(1);
	});

	it("gives 404 to a second revocation", async () => {
		insertConnection(db, { id: "a", userId, clientId: CLAUDE });

		expect((await remove(pathOf(CLAUDE))).status).toBe(204);
		expect((await remove(pathOf(CLAUDE))).status).toBe(404);
	});

	it("refuses a revocation from an other origin", async () => {
		insertConnection(db, { id: "a", userId, clientId: CLAUDE });

		const response = await app.request(pathOf(CLAUDE), {
			method: "DELETE",
			headers: { cookie, origin: "https://evil.example.com" },
		});

		expect(response.status).toBe(403);
		expect(await listed()).toEqual([CLAUDE]);
	});
});
