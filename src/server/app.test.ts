import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { createAuth } from "./auth.ts";
import { insertUser } from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";
import { addSnapshot, createAccount, currentBalances } from "./db/queries.ts";
import { currencies } from "./db/seed/catalogue.ts";
import { seedCatalogue } from "./db/seed/seed.ts";

const BASE_URL = "http://localhost:3000";
const EMAIL = "primo@example.com";
const PASSWORD = "una-parola-lunga";
const OTHER_USER = "an-other-user";

let db: Db;
let app: ReturnType<typeof createApp>;
/** The user of the session. Each request of a test comes from this user. */
let userId: string;
/** The cookie of the session. A request with no cookie gives the status 401. */
let cookie: string;

beforeEach(async () => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	seedCatalogue(db);
	insertUser(db, OTHER_USER);

	const auth = createAuth(db, {
		secret: "a-secret-for-the-test",
		baseURL: BASE_URL,
	});
	app = createApp(db, auth);

	// The call of `auth.api` holds no request, thus it needs no invitation.
	// Refer to the hook `before` of `auth.ts`.
	const created = await auth.api.signUpEmail({
		body: { name: "Primo", email: EMAIL, password: PASSWORD },
	});
	userId = created.user.id;
	cookie = await signIn();
});

/** Signs in and gives the cookie of the session. */
async function signIn(): Promise<string> {
	const response = await app.request("/api/auth/sign-in/email", {
		method: "POST",
		headers: { "content-type": "application/json", origin: BASE_URL },
		body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
	});
	expect(response.status).toBe(200);

	// The header holds the attributes of the cookie after the first `;`. A
	// request sends only the name and the value.
	const header = response.headers.get("set-cookie") ?? "";
	return header.split(";")[0] ?? "";
}

type PotentialRow = {
	currencyId: string;
	current: number;
	fromTransfers: number;
	total: number;
	routes: { fromProgramId: string; toProgramId: string; points: number }[];
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

describe("the session", () => {
	// The list holds each route of the data. A new route with no session must
	// make this test fail.
	const routes = [
		["GET", "/api/catalogue"],
		["GET", "/api/accounts"],
		["POST", "/api/accounts"],
		["POST", "/api/accounts/an-account/snapshots"],
		["GET", "/api/potential"],
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

describe("GET /api/accounts", () => {
	it("gives the account with its current balance", async () => {
		const account = createAccount(db, {
			userId,
			programId: "ba-club",
		});
		addSnapshot(db, {
			accountId: account,
			points: 1000,
			observedAt: "2026-08-01",
		});

		const body = await getJson<{ accounts: unknown[] }>("/api/accounts");
		expect(body.accounts).toMatchObject([
			{ programId: "ba-club", points: 1000, observedAt: "2026-08-01" },
		]);
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
			routes: [
				{ fromProgramId: "amex-mr", toProgramId: "iberia-club", points: 400 },
			],
		});
	});

	it("ignores an account with no snapshot", async () => {
		createAccount(db, { userId, programId: "amex-mr" });
		const body = await getJson<{ potential: PotentialRow[] }>("/api/potential");
		expect(body.potential.every((row) => row.total === 0)).toBe(true);
	});
});
