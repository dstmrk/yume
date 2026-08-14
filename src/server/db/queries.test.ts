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
	countUsers,
	createAccount,
	createInvitation,
	createInvitationForUser,
	currentBalances,
	deleteAccount,
	deleteSnapshot,
	favoriteCurrencies,
	findAccount,
	findInvitation,
	findUserByEmail,
	invitationsOfUser,
	markInvitationUsed,
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

describe("the queries of the invitation", () => {
	const EXPIRES = "2099-01-01T00:00:00.000Z";

	function invite(code: string) {
		return createInvitation(db, {
			code,
			createdByUserId: USER,
			expiresAt: EXPIRES,
		});
	}

	it("gives undefined for a code that no invitation has", () => {
		expect(findInvitation(db, "NO-SUCH-CODE")).toBeUndefined();
	});

	it("finds the invitation with the code", () => {
		invite("BUONO");
		expect(findInvitation(db, "BUONO")).toMatchObject({
			createdByUserId: USER,
			expiresAt: EXPIRES,
			usedAt: null,
			usedByUserId: null,
		});
	});

	it("marks the invitation with the user and the moment", () => {
		invite("BUONO");
		const marked = markInvitationUsed(db, {
			code: "BUONO",
			userId: OTHER_USER,
			at: "2026-08-13T10:00:00.000Z",
		});

		expect(marked).toBe(true);
		expect(findInvitation(db, "BUONO")).toMatchObject({
			usedAt: "2026-08-13T10:00:00.000Z",
			usedByUserId: OTHER_USER,
		});
	});

	// The second call gives false. Thus two sign-ups with the same code cannot
	// both mark the invitation.
	it("does not mark an invitation that is already used", () => {
		invite("BUONO");
		const input = {
			code: "BUONO",
			userId: OTHER_USER,
			at: "2026-08-13T10:00:00.000Z",
		};
		markInvitationUsed(db, input);

		expect(markInvitationUsed(db, { ...input, userId: USER })).toBe(false);
		expect(findInvitation(db, "BUONO")?.usedByUserId).toBe(OTHER_USER);
	});

	it("gives false for a code that no invitation has", () => {
		const marked = markInvitationUsed(db, {
			code: "NO-SUCH-CODE",
			userId: USER,
			at: "2026-08-13T10:00:00.000Z",
		});
		expect(marked).toBe(false);
	});
});

describe("createInvitationForUser", () => {
	const NOW = "2026-08-13T10:00:00.000Z";
	const LATER = "2026-08-15T10:00:00.000Z";

	it("gives a code that is valid for 24 hours", () => {
		const written = createInvitationForUser(db, { userId: USER, at: NOW });

		expect(written?.code).toHaveLength(10);
		expect(written?.expiresAt).toBe("2026-08-14T10:00:00.000Z");
	});

	it("writes the invitation with the user and the address", () => {
		const written = createInvitationForUser(db, {
			userId: USER,
			email: "amico@example.com",
			at: NOW,
		});

		expect(findInvitation(db, written?.code ?? "")).toMatchObject({
			createdByUserId: USER,
			email: "amico@example.com",
			usedAt: null,
		});
	});

	it("gives two invitations to one user", () => {
		expect(
			createInvitationForUser(db, { userId: USER, at: NOW }),
		).not.toBeNull();
		expect(
			createInvitationForUser(db, { userId: USER, at: NOW }),
		).not.toBeNull();
	});

	it("gives null for the third invitation", () => {
		createInvitationForUser(db, { userId: USER, at: NOW });
		createInvitationForUser(db, { userId: USER, at: NOW });

		expect(createInvitationForUser(db, { userId: USER, at: NOW })).toBeNull();
		expect(invitationsOfUser(db, USER)).toHaveLength(2);
	});

	// The limit belongs to one user. The invitations of an other user hold no
	// slot of this user.
	it("counts only the invitations of the same user", () => {
		createInvitationForUser(db, { userId: OTHER_USER, at: NOW });
		createInvitationForUser(db, { userId: OTHER_USER, at: NOW });

		expect(
			createInvitationForUser(db, { userId: USER, at: NOW }),
		).not.toBeNull();
	});

	// Two codes that expired give the two slots back.
	it("gives a new invitation after the two codes expire", () => {
		createInvitationForUser(db, { userId: USER, at: NOW });
		createInvitationForUser(db, { userId: USER, at: NOW });

		expect(
			createInvitationForUser(db, { userId: USER, at: LATER }),
		).not.toBeNull();
	});

	// A used code holds its slot also after the date of the end. Thus one user
	// brings a maximum of two users.
	it("gives no invitation when the two codes are used and expired", () => {
		const first = createInvitationForUser(db, { userId: USER, at: NOW });
		const second = createInvitationForUser(db, { userId: USER, at: NOW });
		for (const written of [first, second]) {
			markInvitationUsed(db, {
				code: written?.code ?? "",
				userId: OTHER_USER,
				at: NOW,
			});
		}

		expect(createInvitationForUser(db, { userId: USER, at: LATER })).toBeNull();
	});
});

describe("invitationsOfUser", () => {
	it("gives no invitation for a user who wrote no code", () => {
		expect(invitationsOfUser(db, USER)).toEqual([]);
	});

	it("gives only the invitations of the user", () => {
		createInvitation(db, {
			code: "MIO",
			createdByUserId: USER,
			expiresAt: "2099-01-01T00:00:00.000Z",
		});
		createInvitation(db, {
			code: "SUO",
			createdByUserId: OTHER_USER,
			expiresAt: "2099-01-01T00:00:00.000Z",
		});

		expect(invitationsOfUser(db, USER).map((one) => one.code)).toEqual(["MIO"]);
	});
});

describe("countUsers", () => {
	it("gives the quantity of users", () => {
		expect(countUsers(db)).toBe(2);
	});

	// The hook of the sign-up reads this state. A database with no user accepts
	// the code of the setup.
	it("gives 0 with a database that holds no user", () => {
		const empty = openDatabase(":memory:");
		migrate(empty, { migrationsFolder: "drizzle" });
		expect(countUsers(empty)).toBe(0);
	});
});

describe("findUserByEmail", () => {
	it("finds the user with the address", () => {
		expect(findUserByEmail(db, `${USER}@example.com`)?.id).toBe(USER);
	});

	it("gives undefined for an address that no user has", () => {
		expect(findUserByEmail(db, "no-such-user@example.com")).toBeUndefined();
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
