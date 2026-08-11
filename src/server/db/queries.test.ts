import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "./index.ts";
import {
	addSnapshot,
	allPrograms,
	allTransferRules,
	createAccount,
	currentBalances,
} from "./queries.ts";
import { seedCatalogue } from "./seed/seed.ts";

const USER = "user-1";
const OTHER_USER = "user-2";

let db: Db;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	seedCatalogue(db);
});

describe("currentBalances", () => {
	it("gives no row when the user has no account", () => {
		expect(currentBalances(db, USER)).toEqual([]);
	});

	it("gives an account with no snapshot", () => {
		createAccount(db, { userId: USER, programId: "ba-club" });
		expect(currentBalances(db, USER)).toMatchObject([
			{ programId: "ba-club", points: null, observedAt: null },
		]);
	});

	it("gives the most recent snapshot of an account", () => {
		const account = createAccount(db, { userId: USER, programId: "ba-club" });
		addSnapshot(db, {
			accountId: account,
			points: 1000,
			observedAt: "2026-01-01",
		});
		addSnapshot(db, {
			accountId: account,
			points: 1500,
			observedAt: "2026-08-01",
		});
		addSnapshot(db, {
			accountId: account,
			points: 1200,
			observedAt: "2026-04-01",
		});

		expect(currentBalances(db, USER)).toMatchObject([
			{ points: 1500, observedAt: "2026-08-01" },
		]);
	});

	it("gives the account of the user and no other account", () => {
		const mine = createAccount(db, { userId: USER, programId: "ba-club" });
		const other = createAccount(db, {
			userId: OTHER_USER,
			programId: "ba-club",
		});
		addSnapshot(db, { accountId: mine, points: 100, observedAt: "2026-08-01" });
		addSnapshot(db, {
			accountId: other,
			points: 999,
			observedAt: "2026-08-01",
		});

		expect(currentBalances(db, USER)).toMatchObject([{ points: 100 }]);
	});

	it("gives two accounts of the same programme", () => {
		const first = createAccount(db, {
			userId: USER,
			programId: "amex-mr",
			nickname: "Personale",
		});
		const second = createAccount(db, {
			userId: USER,
			programId: "amex-mr",
			nickname: "Business",
		});
		addSnapshot(db, {
			accountId: first,
			points: 400,
			observedAt: "2026-08-01",
		});
		addSnapshot(db, {
			accountId: second,
			points: 400,
			observedAt: "2026-08-01",
		});

		const rows = currentBalances(db, USER);
		expect(rows).toHaveLength(2);
		expect(rows.map((row) => row.nickname).sort()).toEqual([
			"Business",
			"Personale",
		]);
	});

	it("keeps one row for each account when the dates are equal", () => {
		const account = createAccount(db, { userId: USER, programId: "ba-club" });
		addSnapshot(db, {
			accountId: account,
			points: 100,
			observedAt: "2026-08-01",
		});
		addSnapshot(db, {
			accountId: account,
			points: 200,
			observedAt: "2026-08-01",
		});

		expect(currentBalances(db, USER)).toHaveLength(1);
	});
});

describe("the catalogue queries", () => {
	it("gives each programme and each rule", () => {
		expect(allPrograms(db).length).toBeGreaterThan(0);
		expect(allTransferRules(db).length).toBeGreaterThan(0);
	});

	it("gives a rule with the shape of the shared type", () => {
		const rule = allTransferRules(db).find(
			(row) => row.toProgramId === "iberia-club",
		);
		expect(rule).toMatchObject({
			fromProgramId: "amex-mr",
			ratioNum: 4,
			ratioDen: 5,
			minTransfer: 500,
			increment: 500,
			validTo: null,
		});
	});
});

describe("createAccount", () => {
	it("refuses an account with a programme that does not exist", () => {
		expect(() =>
			createAccount(db, { userId: USER, programId: "does-not-exist" }),
		).toThrow();
	});
});

describe("addSnapshot", () => {
	it("refuses a snapshot of an account that does not exist", () => {
		expect(() =>
			addSnapshot(db, {
				accountId: "does-not-exist",
				points: 10,
				observedAt: "2026-08-01",
			}),
		).toThrow();
	});
});
