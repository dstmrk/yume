import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
	deleteExpired,
	deleteSnapshot,
	favoriteCurrencies,
	findAccount,
	removeFavorite,
} from "./queries.ts";
import {
	account,
	balanceSnapshot,
	favoriteCurrency,
	session,
	user,
	userAccount,
	verification,
} from "./schema.ts";
import { seedCatalogue } from "./seed/seed.ts";

const USER = "user-1";
const OTHER_USER = "user-2";

/** Three ids of a snapshot. The order of the text is LOW, MIDDLE, HIGH. */
const LOW_ID = "00000000-0000-4000-8000-000000000000";
const MIDDLE_ID = "88888888-8888-4888-8888-888888888888";
const HIGH_ID = "ffffffff-ffff-4fff-bfff-ffffffffffff";

let db: Db;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	seedCatalogue(db);
	insertUser(db, USER);
	insertUser(db, OTHER_USER);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

/**
 * Writes a snapshot at a given moment and with a given id.
 *
 * The test then sets the order of the writes and the order of the ids. Thus a
 * random id cannot give the expected row by chance.
 */
function writeSnapshot(
	input: { accountId: string; points: number; observedAt: string },
	at: { moment: string; id: ReturnType<Crypto["randomUUID"]> },
): string {
	vi.setSystemTime(at.moment);
	vi.spyOn(crypto, "randomUUID").mockReturnValueOnce(at.id);
	return addSnapshot(db, input);
}

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

	// The form gives the date of today. Thus a correction on the same day holds
	// the same date. The id of the correction sorts first, thus an order by the
	// id gives the old value.
	it("gives the snapshot written last when the dates are equal", () => {
		const account = createAccount(db, { userId: USER, programId: "ba-club" });
		writeSnapshot(
			{ accountId: account, points: 10000, observedAt: "2026-11-09" },
			{ moment: "2026-11-09T09:00:00.000Z", id: HIGH_ID },
		);
		const correction = writeSnapshot(
			{ accountId: account, points: 12000, observedAt: "2026-11-09" },
			{ moment: "2026-11-09T09:05:00.000Z", id: LOW_ID },
		);

		expect(currentBalances(db, USER)).toMatchObject([
			{ snapshotId: correction, points: 12000, observedAt: "2026-11-09" },
		]);
	});

	// A snapshot of an older date is a late record of an old balance. It is not
	// a correction of the current balance.
	it("keeps the current snapshot after a write of an older date", () => {
		const account = createAccount(db, { userId: USER, programId: "ba-club" });
		const current = writeSnapshot(
			{ accountId: account, points: 1500, observedAt: "2026-08-01" },
			{ moment: "2026-08-01T09:00:00.000Z", id: LOW_ID },
		);
		writeSnapshot(
			{ accountId: account, points: 1200, observedAt: "2026-04-01" },
			{ moment: "2026-08-02T09:00:00.000Z", id: HIGH_ID },
		);

		expect(currentBalances(db, USER)).toMatchObject([
			{ snapshotId: current, points: 1500, observedAt: "2026-08-01" },
		]);
	});

	// Two calls of `addSnapshot` one after the other fall in one millisecond
	// nine times in ten. Then `rowid` gives the order of the writes.
	it("gives the snapshot written last when the moments are equal", () => {
		const account = createAccount(db, { userId: USER, programId: "ba-club" });
		const moment = "2026-11-09T09:00:00.000Z";
		writeSnapshot(
			{ accountId: account, points: 10000, observedAt: "2026-11-09" },
			{ moment, id: HIGH_ID },
		);
		const correction = writeSnapshot(
			{ accountId: account, points: 12000, observedAt: "2026-11-09" },
			{ moment, id: LOW_ID },
		);

		expect(currentBalances(db, USER)).toMatchObject([
			{ snapshotId: correction, points: 12000 },
		]);
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

	// The user corrects a balance two times on one day, then removes the last
	// correction. The balance goes back to the correction before it, not to the
	// first value of the day. A late record of an older date stays behind them.
	it("gives the snapshot written before it on the same date", () => {
		const account = createAccount(db, { userId: USER, programId: "ba-club" });
		writeSnapshot(
			{ accountId: account, points: 10000, observedAt: "2026-11-09" },
			{ moment: "2026-11-09T09:00:00.000Z", id: HIGH_ID },
		);
		const previous = writeSnapshot(
			{ accountId: account, points: 11000, observedAt: "2026-11-09" },
			{ moment: "2026-11-09T09:05:00.000Z", id: LOW_ID },
		);
		const last = writeSnapshot(
			{ accountId: account, points: 12000, observedAt: "2026-11-09" },
			{ moment: "2026-11-09T09:10:00.000Z", id: MIDDLE_ID },
		);
		vi.setSystemTime("2026-11-09T09:15:00.000Z");
		addSnapshot(db, {
			accountId: account,
			points: 9000,
			observedAt: "2026-10-01",
		});

		deleteSnapshot(db, last, account);

		expect(currentBalances(db, USER)).toMatchObject([
			{ snapshotId: previous, points: 11000, observedAt: "2026-11-09" },
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

describe("deleteExpired", () => {
	/** The moment of the cleanup. The columns hold seconds, thus no milliseconds. */
	const NOW = new Date("2026-11-09T12:00:00Z");
	const BEFORE = new Date(NOW.getTime() - 1000);
	const AFTER = new Date(NOW.getTime() + 1000);

	function writeSession(id: string, expiresAt: Date): void {
		db.insert(session)
			.values({
				id,
				expiresAt,
				token: `token-${id}`,
				createdAt: NOW,
				updatedAt: NOW,
				ipAddress: "192.0.2.1",
				userAgent: "Test",
				userId: USER,
			})
			.run();
	}

	function writeVerification(id: string, expiresAt: Date): void {
		db.insert(verification)
			.values({
				id,
				identifier: `state-${id}`,
				value: "{}",
				expiresAt,
				createdAt: NOW,
				updatedAt: NOW,
			})
			.run();
	}

	function ids(table: typeof session | typeof verification): string[] {
		return db
			.select({ id: table.id })
			.from(table)
			.all()
			.map((row) => row.id)
			.sort();
	}

	it("removes an expired session and keeps a valid session", () => {
		writeSession("expired", BEFORE);
		writeSession("valid", AFTER);
		expect(deleteExpired(db, NOW)).toEqual({ sessions: 1, verifications: 0 });
		expect(ids(session)).toEqual(["valid"]);
	});

	it("keeps a session that expires at the moment of the cleanup", () => {
		writeSession("now", NOW);
		expect(deleteExpired(db, NOW)).toEqual({ sessions: 0, verifications: 0 });
		expect(ids(session)).toEqual(["now"]);
	});

	it("removes an expired verification and keeps a sign-in in progress", () => {
		writeVerification("expired", BEFORE);
		writeVerification("valid", AFTER);
		expect(deleteExpired(db, NOW)).toEqual({ sessions: 0, verifications: 1 });
		expect(ids(verification)).toEqual(["valid"]);
	});

	it("changes no user, no credential and no data of the application", () => {
		db.insert(account)
			.values({
				id: "google-1",
				accountId: "sub-1",
				providerId: "google",
				userId: USER,
				createdAt: NOW,
				updatedAt: NOW,
			})
			.run();
		const accountId = createAccount(db, { userId: USER, programId: "ba-club" });
		addSnapshot(db, { accountId, points: 1000, observedAt: "2026-11-01" });
		addFavorite(db, { userId: USER, currencyId: "avios" });
		writeSession("expired", BEFORE);

		deleteExpired(db, NOW);

		expect(db.select().from(user).all()).toHaveLength(2);
		expect(db.select().from(account).all()).toHaveLength(1);
		expect(db.select().from(userAccount).all()).toHaveLength(1);
		expect(db.select().from(balanceSnapshot).all()).toHaveLength(1);
		expect(db.select().from(favoriteCurrency).all()).toHaveLength(1);
	});

	it("gives zero and throws nothing with no rows", () => {
		expect(deleteExpired(db, NOW)).toEqual({ sessions: 0, verifications: 0 });
	});
});
