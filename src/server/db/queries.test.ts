import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { insertUser } from "./fixtures.ts";
import { type Db, openDatabase } from "./index.ts";
import {
	addSnapshot,
	allPrograms,
	allTransferRules,
	createAccount,
	createInvitation,
	currentBalances,
	findAccount,
	findInvitation,
	findUserByEmail,
	markInvitationUsed,
} from "./queries.ts";
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
