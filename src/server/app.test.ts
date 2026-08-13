import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp, SINGLE_USER_ID } from "./app.ts";
import { createAuth } from "./auth.ts";
import { insertUser } from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";
import { addSnapshot, createAccount } from "./db/queries.ts";
import { currencies } from "./db/seed/catalogue.ts";
import { seedCatalogue } from "./db/seed/seed.ts";

const OTHER_USER = "an-other-user";

let db: Db;
let app: Hono;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	seedCatalogue(db);
	insertUser(db, SINGLE_USER_ID);
	insertUser(db, OTHER_USER);
	app = createApp(
		db,
		createAuth(db, {
			secret: "a-secret-for-the-test",
			baseURL: "http://localhost:3000",
		}),
	);
});

type PotentialRow = {
	currencyId: string;
	current: number;
	fromTransfers: number;
	total: number;
	routes: { fromProgramId: string; toProgramId: string; points: number }[];
};

async function getJson<T>(path: string): Promise<T> {
	const response = await app.request(path);
	expect(response.status).toBe(200);
	return (await response.json()) as T;
}

function post(path: string, body: unknown) {
	return app.request(path, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

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
			headers: { "content-type": "application/json" },
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
			userId: SINGLE_USER_ID,
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
			userId: SINGLE_USER_ID,
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
			userId: SINGLE_USER_ID,
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
			userId: SINGLE_USER_ID,
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
			userId: SINGLE_USER_ID,
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
				userId: SINGLE_USER_ID,
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
		createAccount(db, { userId: SINGLE_USER_ID, programId: "amex-mr" });
		const body = await getJson<{ potential: PotentialRow[] }>("/api/potential");
		expect(body.potential.every((row) => row.total === 0)).toBe(true);
	});
});
