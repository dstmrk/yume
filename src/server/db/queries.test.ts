import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { insertUser } from "./fixtures.ts";
import { type Db, openDatabase } from "./index.ts";
import {
	addFavorite,
	addSnapshot,
	allPrograms,
	allTransferRules,
	createAccount,
	currentBalances,
	deleteAccount,
	deleteSnapshot,
	favoriteCurrencies,
	findAccount,
	removeFavorite,
} from "./queries.ts";
import { balanceSnapshot, user } from "./schema.ts";
import { seedCatalogue } from "./seed/seed.ts";

const USER = "user-1";
const OTHER_USER = "user-2";

let db: Db;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	seedCatalogue(db);
	insertUser(db, USER);
	insertUser(db, OTHER_USER);
});

/** The quantity of snapshots of an account, also the rows that no query gives. */
function snapshotCount(accountId: string): number {
	return db
		.select()
		.from(balanceSnapshot)
		.where(eq(balanceSnapshot.accountId, accountId))
		.all().length;
}

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
		const first = createAccount(db, { userId: USER, programId: "amex-mr" });
		const second = createAccount(db, { userId: USER, programId: "amex-mr" });
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
		expect(rows.map((row) => row.accountId).sort()).toEqual(
			[first, second].sort(),
		);
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

	it("gives the id of the most recent snapshot", () => {
		const account = createAccount(db, { userId: USER, programId: "ba-club" });
		addSnapshot(db, {
			accountId: account,
			points: 100,
			observedAt: "2026-01-01",
		});
		const last = addSnapshot(db, {
			accountId: account,
			points: 200,
			observedAt: "2026-08-01",
		});

		expect(currentBalances(db, USER)).toMatchObject([{ snapshotId: last }]);
	});

	it("gives no id of a snapshot for an account with no snapshot", () => {
		createAccount(db, { userId: USER, programId: "ba-club" });
		expect(currentBalances(db, USER)).toMatchObject([{ snapshotId: null }]);
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
			country: "IT",
			ratioNum: 4,
			ratioDen: 5,
			minTransfer: 500,
			increment: 500,
			validTo: null,
		});
	});
});

describe("findAccount", () => {
	it("finds the account of the user", () => {
		const id = createAccount(db, { userId: USER, programId: "ba-club" });
		expect(findAccount(db, id, USER)?.id).toBe(id);
	});

	it("does not find the account of an other user", () => {
		const id = createAccount(db, { userId: OTHER_USER, programId: "ba-club" });
		expect(findAccount(db, id, USER)).toBeUndefined();
	});

	it("does not find an account that does not exist", () => {
		expect(findAccount(db, "does-not-exist", USER)).toBeUndefined();
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

describe("deleteAccount", () => {
	it("removes the account of the user", () => {
		const id = createAccount(db, { userId: USER, programId: "ba-club" });

		expect(deleteAccount(db, id, USER)).toBe(true);
		expect(currentBalances(db, USER)).toEqual([]);
	});

	// The column `balance_snapshot.account_id` holds `on delete cascade`, and
	// `openDatabase` sets the pragma `foreign_keys`. Thus the removal of the
	// account also removes its snapshots.
	it("removes the snapshots of the account", () => {
		const id = createAccount(db, { userId: USER, programId: "ba-club" });
		addSnapshot(db, { accountId: id, points: 100, observedAt: "2026-08-01" });

		deleteAccount(db, id, USER);

		expect(snapshotCount(id)).toBe(0);
	});

	it("keeps the other account of the user", () => {
		const first = createAccount(db, { userId: USER, programId: "ba-club" });
		createAccount(db, { userId: USER, programId: "amex-mr" });

		deleteAccount(db, first, USER);

		expect(currentBalances(db, USER)).toMatchObject([{ programId: "amex-mr" }]);
	});

	it("keeps the account of an other user and gives false", () => {
		const id = createAccount(db, { userId: OTHER_USER, programId: "ba-club" });

		expect(deleteAccount(db, id, USER)).toBe(false);
		expect(findAccount(db, id, OTHER_USER)?.id).toBe(id);
	});

	it("gives false for an account that does not exist", () => {
		expect(deleteAccount(db, "does-not-exist", USER)).toBe(false);
	});
});

describe("deleteSnapshot", () => {
	it("removes the snapshot of the account", () => {
		const account = createAccount(db, { userId: USER, programId: "ba-club" });
		const id = addSnapshot(db, {
			accountId: account,
			points: 100,
			observedAt: "2026-08-01",
		});

		expect(deleteSnapshot(db, id, account)).toBe(true);
		expect(snapshotCount(account)).toBe(0);
	});

	// This is the correction of a value that the user wrote in a wrong way. The
	// balance of the account then goes back to the snapshot before it.
	it("gives the snapshot before it as the current balance", () => {
		const account = createAccount(db, { userId: USER, programId: "ba-club" });
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

		deleteSnapshot(db, wrong, account);

		expect(currentBalances(db, USER)).toMatchObject([
			{ points: 1900, observedAt: "2026-01-01" },
		]);
	});

	it("gives an account with no balance after the last snapshot", () => {
		const account = createAccount(db, { userId: USER, programId: "ba-club" });
		const id = addSnapshot(db, {
			accountId: account,
			points: 100,
			observedAt: "2026-08-01",
		});

		deleteSnapshot(db, id, account);

		expect(currentBalances(db, USER)).toMatchObject([
			{ points: null, observedAt: null, snapshotId: null },
		]);
	});

	it("keeps the snapshot of an other account and gives false", () => {
		const mine = createAccount(db, { userId: USER, programId: "ba-club" });
		const other = createAccount(db, { userId: USER, programId: "amex-mr" });
		const id = addSnapshot(db, {
			accountId: other,
			points: 100,
			observedAt: "2026-08-01",
		});

		expect(deleteSnapshot(db, id, mine)).toBe(false);
		expect(snapshotCount(other)).toBe(1);
	});

	it("gives false for a snapshot that does not exist", () => {
		const account = createAccount(db, { userId: USER, programId: "ba-club" });
		expect(deleteSnapshot(db, "does-not-exist", account)).toBe(false);
	});
});

describe("the favourites of the user", () => {
	it("gives no currency for a user with no favourite", () => {
		expect(favoriteCurrencies(db, USER)).toEqual([]);
	});

	it("gives the currency that the user marked", () => {
		addFavorite(db, { userId: USER, currencyId: "avios" });
		expect(favoriteCurrencies(db, USER)).toEqual(["avios"]);
	});

	// The user taps the heart two times on two devices. The second mark must
	// give the same result, and no error of the primary key.
	it("keeps one row for a second mark of the same currency", () => {
		addFavorite(db, { userId: USER, currencyId: "avios" });
		addFavorite(db, { userId: USER, currencyId: "avios" });
		expect(favoriteCurrencies(db, USER)).toEqual(["avios"]);
	});

	it("gives no favourite of an other user", () => {
		addFavorite(db, { userId: OTHER_USER, currencyId: "avios" });
		expect(favoriteCurrencies(db, USER)).toEqual([]);
	});

	it("removes the mark and gives true", () => {
		addFavorite(db, { userId: USER, currencyId: "avios" });
		expect(removeFavorite(db, USER, "avios")).toBe(true);
		expect(favoriteCurrencies(db, USER)).toEqual([]);
	});

	it("gives false for a currency that the user did not mark", () => {
		expect(removeFavorite(db, USER, "avios")).toBe(false);
	});

	it("keeps the mark of an other user", () => {
		addFavorite(db, { userId: OTHER_USER, currencyId: "avios" });
		expect(removeFavorite(db, USER, "avios")).toBe(false);
		expect(favoriteCurrencies(db, OTHER_USER)).toEqual(["avios"]);
	});

	// The column `user_id` holds `on delete cascade`. Thus the removal of a user
	// removes the marks of that user, and no row keeps a user that is absent.
	it("removes the marks with the user", () => {
		addFavorite(db, { userId: OTHER_USER, currencyId: "avios" });
		db.delete(user).where(eq(user.id, OTHER_USER)).run();
		expect(favoriteCurrencies(db, OTHER_USER)).toEqual([]);
	});

	// The pragma `foreign_keys` is ON. A currency that is absent gives an error
	// at the insert, thus no mark points to a currency that does not exist.
	it("refuses a currency that does not exist", () => {
		expect(() =>
			addFavorite(db, { userId: USER, currencyId: "does-not-exist" }),
		).toThrow();
	});
});
