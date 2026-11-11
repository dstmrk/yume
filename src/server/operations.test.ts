import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { insertUser } from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";
import { addSnapshot, createAccount, currentBalances } from "./db/queries.ts";
import { user } from "./db/schema.ts";
import { currencies } from "./db/seed/catalogue.ts";
import { seedCatalogue } from "./db/seed/seed.ts";
import {
	entitlementOf,
	latestObservedAt,
	potentialOf,
	recordSnapshot,
	today,
} from "./operations.ts";

const OTHER_USER = "an-other-user";
/** 00:30 in Rome on 10 November: UTC still holds 9 November. */
const NOW = new Date("2026-11-09T23:30:00.000Z");

let db: Db;
let userId: string;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	seedCatalogue(db);
	userId = insertUser(db, "primo");
	insertUser(db, OTHER_USER);
});

describe("today", () => {
	it("gives the date of the clock in UTC", () => {
		expect(today(NOW)).toBe("2026-11-09");
	});
});

describe("latestObservedAt", () => {
	it("gives the day after the date of the clock in UTC", () => {
		expect(latestObservedAt(NOW)).toBe("2026-11-10");
	});

	it("goes to the next year on 31 December", () => {
		expect(latestObservedAt(new Date("2026-12-31T12:00:00.000Z"))).toBe(
			"2027-01-01",
		);
	});
});

describe("recordSnapshot", () => {
	function record(
		accountId: string,
		body: unknown,
		user = userId,
		limits = false,
	) {
		return recordSnapshot(db, {
			userId: user,
			accountId,
			body,
			now: NOW,
			limits,
		});
	}

	it("writes the snapshot of an account of the user", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });
		const result = record(accountId, {
			points: 1900,
			observedAt: "2026-11-09",
		});

		expect(result.ok).toBe(true);
		expect(currentBalances(db, userId)[0]).toMatchObject({
			points: 1900,
			observedAt: "2026-11-09",
		});
	});

	it("gives the id of the new snapshot", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });
		const result = record(accountId, {
			points: 1900,
			observedAt: "2026-11-09",
		});

		expect(result).toEqual({
			ok: true,
			id: currentBalances(db, userId)[0]?.snapshotId,
		});
	});

	it("writes the expiry lots of the snapshot", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });
		record(accountId, {
			points: 1900,
			observedAt: "2026-11-09",
			lots: [{ points: 500, expiresOn: "2027-03-31" }],
		});

		expect(currentBalances(db, userId)[0]?.lots).toEqual([
			{ points: 500, expiresOn: "2027-03-31" },
		]);
	});

	it("refuses an account of an other user and writes nothing", () => {
		const accountId = createAccount(db, {
			userId: OTHER_USER,
			programId: "amex-mr",
		});

		expect(
			record(accountId, { points: 1900, observedAt: "2026-11-09" }),
		).toEqual({ ok: false, error: "unknown_account" });
		expect(currentBalances(db, OTHER_USER)[0]?.points).toBeNull();
	});

	it("refuses an account that does not exist", () => {
		expect(
			record("no-such-account", { points: 1900, observedAt: "2026-11-09" }),
		).toEqual({ ok: false, error: "unknown_account" });
	});

	// The route examines the account before the body. An other user thus
	// receives the same answer with each body, and learns nothing.
	it("refuses an unknown account before it reads the body", () => {
		expect(record("no-such-account", null)).toEqual({
			ok: false,
			error: "unknown_account",
		});
	});

	it("refuses a body that the schema refuses, with the issues", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });
		const result = record(accountId, { points: 1.5, observedAt: "2026-11-09" });

		expect(result).toMatchObject({ ok: false, error: "invalid_body" });
		expect(result.ok === false && "issues" in result && result.issues).toEqual([
			expect.objectContaining({ path: ["points"] }),
		]);
	});

	it("refuses a body that is not an object", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		expect(record(accountId, null)).toMatchObject({
			ok: false,
			error: "invalid_body",
		});
	});

	it("accepts the date of tomorrow in UTC", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		expect(
			record(accountId, { points: 1900, observedAt: "2026-11-10" }).ok,
		).toBe(true);
	});

	it("refuses a date after tomorrow in UTC and writes nothing", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		expect(
			record(accountId, { points: 1900, observedAt: "2026-11-11" }),
		).toEqual({ ok: false, error: "future_date" });
		expect(currentBalances(db, userId)[0]?.points).toBeNull();
	});
});

describe("potentialOf", () => {
	it("gives the date of the calculation", () => {
		expect(potentialOf(db, userId, "2026-11-09").at).toBe("2026-11-09");
	});

	it("gives one result for each airline currency", () => {
		const airline = currencies
			.filter((currency) => currency.kind === "airline")
			.map((currency) => currency.id);

		expect(
			potentialOf(db, userId, "2026-11-09")
				.potential.map((row) => row.currencyId)
				.sort(),
		).toEqual([...airline].sort());
	});

	it("adds the two balances of Avios and the best route", () => {
		for (const [programId, points] of [
			["ba-club", 1000],
			["iberia-club", 500],
			["amex-mr", 700],
		] as const) {
			const accountId = createAccount(db, { userId, programId });
			addSnapshot(db, { accountId, points, observedAt: "2026-08-11" });
		}

		const avios = potentialOf(db, userId, "2026-11-09").potential.find(
			(row) => row.currencyId === "avios",
		);
		expect(avios).toMatchObject({
			current: 1500,
			fromTransfers: 400,
			total: 1900,
			routes: [{ fromProgramId: "amex-mr", points: 400 }],
		});
	});

	it("skips an account with no balance", () => {
		createAccount(db, { userId, programId: "ba-club" });

		const avios = potentialOf(db, userId, "2026-11-09").potential.find(
			(row) => row.currencyId === "avios",
		);
		expect(avios).toMatchObject({ current: 0, fromTransfers: 0, total: 0 });
	});

	it("reads no balance of an other user", () => {
		const accountId = createAccount(db, {
			userId: OTHER_USER,
			programId: "ba-club",
		});
		addSnapshot(db, { accountId, points: 1000, observedAt: "2026-08-11" });

		const avios = potentialOf(db, userId, "2026-11-09").potential.find(
			(row) => row.currencyId === "avios",
		);
		expect(avios?.total).toBe(0);
	});
});

describe("entitlementOf", () => {
	it("gives free to a new user", () => {
		expect(entitlementOf(db, userId, true, NOW)).toEqual({
			limits: true,
			tier: "free",
		});
	});

	it("reads the flag unlimited of the user", () => {
		db.update(user).set({ unlimited: true }).where(eq(user.id, userId)).run();
		expect(entitlementOf(db, userId, true, NOW).tier).toBe("unlimited");
		expect(entitlementOf(db, OTHER_USER, true, NOW).tier).toBe("free");
	});

	it("reads the end of the supporter account at the clock", () => {
		db.update(user)
			.set({ supporterUntil: new Date("2026-11-10T00:00:00.000Z") })
			.where(eq(user.id, userId))
			.run();
		expect(entitlementOf(db, userId, true, NOW).tier).toBe("supporter");
		expect(
			entitlementOf(db, userId, true, new Date("2026-11-10T00:00:00.000Z"))
				.tier,
		).toBe("free");
	});

	it("gives free to a user that does not exist", () => {
		expect(entitlementOf(db, "nobody", true, NOW).tier).toBe("free");
	});
});

describe("recordSnapshot with the limits of the free account", () => {
	const LOTS = [{ points: 500, expiresOn: "2027-03-31" }];

	function recordLimited(accountId: string, body: unknown) {
		return recordSnapshot(db, {
			userId,
			accountId,
			body,
			now: NOW,
			limits: true,
		});
	}

	it("refuses the lots of a free account and writes no snapshot", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		const result = recordLimited(accountId, {
			points: 1900,
			observedAt: "2026-11-09",
			lots: LOTS,
		});

		expect(result).toEqual({ ok: false, error: "supporter_required" });
		expect(currentBalances(db, userId)[0]?.points).toBeNull();
	});

	it("accepts a snapshot of a free account with no lot", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		expect(
			recordLimited(accountId, { points: 1900, observedAt: "2026-11-09" }).ok,
		).toBe(true);
		expect(
			recordLimited(accountId, {
				points: 2000,
				observedAt: "2026-11-09",
				lots: [],
			}).ok,
		).toBe(true);
	});

	// A former supporter keeps the lots of the current balance, and the form
	// sends them again with each new balance. Paragraph 4.6.
	it("accepts the current lots of a free account again", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });
		addSnapshot(db, {
			accountId,
			points: 1900,
			observedAt: "2026-11-01",
			lots: [...LOTS, { points: 200, expiresOn: "2027-06-30" }],
		});

		const result = recordLimited(accountId, {
			points: 2500,
			observedAt: "2026-11-09",
			lots: LOTS,
		});

		expect(result.ok).toBe(true);
		expect(currentBalances(db, userId)[0]?.lots).toEqual(LOTS);
	});

	it("refuses a lot that the current balance of the account does not hold", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });
		addSnapshot(db, {
			accountId,
			points: 1900,
			observedAt: "2026-11-01",
			lots: LOTS,
		});

		const result = recordLimited(accountId, {
			points: 2500,
			observedAt: "2026-11-09",
			lots: [{ points: 600, expiresOn: "2027-03-31" }],
		});

		expect(result).toEqual({ ok: false, error: "supporter_required" });
	});

	it("reads the lots of the same account only", () => {
		const withLots = createAccount(db, { userId, programId: "amex-mr" });
		addSnapshot(db, {
			accountId: withLots,
			points: 1900,
			observedAt: "2026-11-01",
			lots: LOTS,
		});
		const other = createAccount(db, { userId, programId: "revolut" });

		const result = recordLimited(other, {
			points: 1900,
			observedAt: "2026-11-09",
			lots: LOTS,
		});

		expect(result).toEqual({ ok: false, error: "supporter_required" });
	});

	it("accepts the lots of an unlimited account", () => {
		db.update(user).set({ unlimited: true }).where(eq(user.id, userId)).run();
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		const result = recordLimited(accountId, {
			points: 1900,
			observedAt: "2026-11-09",
			lots: LOTS,
		});

		expect(result.ok).toBe(true);
	});

	// An account of an other user gives the same answer with each body. Thus no
	// answer says that the account exists.
	it("examines the account before the level", () => {
		const accountId = createAccount(db, {
			userId: OTHER_USER,
			programId: "amex-mr",
		});

		const result = recordLimited(accountId, {
			points: 1900,
			observedAt: "2026-11-09",
			lots: LOTS,
		});

		expect(result).toEqual({ ok: false, error: "unknown_account" });
	});

	it("examines the body before the level", () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		const result = recordLimited(accountId, {
			points: -1,
			observedAt: "2026-11-09",
			lots: LOTS,
		});

		expect(result.ok).toBe(false);
		expect(!result.ok && result.error).toBe("invalid_body");
	});
});
