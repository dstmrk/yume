import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	insertConnection,
	insertOAuthClient,
	insertUser,
} from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";
import { addSnapshot, createAccount, currentBalances } from "./db/queries.ts";
import { writeReviewer } from "./db/reviewer.ts";
import {
	account,
	oauthAccessToken,
	session,
	stripeCustomer,
	user,
} from "./db/schema.ts";
import { seedCatalogue } from "./db/seed/seed.ts";
import { removeUser } from "./removal.ts";
import { fakeStripe, STRIPE_ERROR } from "./stripe-fixtures.ts";

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

afterEach(() => {
	vi.restoreAllMocks();
});

function userIds(): string[] {
	return db
		.select({ id: user.id })
		.from(user)
		.all()
		.map((row) => row.id)
		.sort();
}

/** A Stripe that refuses each request: the test expects no request. */
function noNetwork() {
	return fakeStripe(() => {
		throw new Error("The test expects no request to Stripe.");
	});
}

function insertCustomer(userId: string) {
	db.insert(stripeCustomer)
		.values({
			userId,
			customerId: `cus_${userId}`,
			subscriptionId: `sub_${userId}`,
			status: "active",
			createdAt: "2026-11-11T09:00:00.000Z",
		})
		.run();
}

describe("removeUser", () => {
	it("removes the user and each row of the user", async () => {
		const accountId = createAccount(db, { userId: USER, programId: "amex-mr" });
		addSnapshot(db, { accountId, points: 1900, observedAt: "2026-11-10" });
		db.insert(session)
			.values({
				id: "s1",
				token: "t1",
				userId: USER,
				expiresAt: new Date("2030-01-01"),
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.run();
		insertOAuthClient(db, "https://claude.ai/oauth/mcp-oauth-client-metadata");
		insertConnection(db, {
			id: "c1",
			clientId: "https://claude.ai/oauth/mcp-oauth-client-metadata",
			userId: USER,
		});

		expect(await removeUser(db, undefined, USER)).toEqual({ ok: true });

		expect(userIds()).toEqual([OTHER_USER]);
		expect(currentBalances(db, USER)).toEqual([]);
		expect(db.select().from(session).all()).toEqual([]);
		expect(
			db
				.select()
				.from(oauthAccessToken)
				.where(eq(oauthAccessToken.userId, USER))
				.all(),
		).toEqual([]);
	});

	it("removes the customer in Stripe first", async () => {
		insertCustomer(USER);
		const { billing, calls } = fakeStripe(() => ({
			body: { id: `cus_${USER}`, object: "customer", deleted: true },
		}));

		expect(await removeUser(db, billing, USER)).toEqual({ ok: true });
		expect(calls.map((call) => call.path)).toEqual([
			`/v1/customers/cus_${USER}`,
		]);
		expect(db.select().from(stripeCustomer).all()).toEqual([]);
	});

	// Stripe would charge the card of a user that does not exist.
	it("removes nothing when Stripe does not answer", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		insertCustomer(USER);
		const { billing } = fakeStripe(() => STRIPE_ERROR);

		expect(await removeUser(db, billing, USER)).toEqual({
			ok: false,
			error: "payment_unavailable",
		});
		expect(userIds()).toEqual([OTHER_USER, USER].sort());
	});

	// A reviewer who tries the button removes the account of the test and its
	// data. Paragraph 4.1.1 of docs/architecture.md.
	it("refuses the account of the reviewers", async () => {
		await writeReviewer(db, "reviewer@example.com", "a-password-of-the-test");
		const reviewer = db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, "reviewer@example.com"))
			.get()?.id;
		if (reviewer === undefined) throw new Error("no reviewer");
		const { billing, calls } = noNetwork();

		expect(await removeUser(db, billing, reviewer)).toEqual({
			ok: false,
			error: "reviewer_account",
		});
		expect(calls).toEqual([]);
		expect(userIds()).toContain(reviewer);
		expect(
			db.select().from(account).where(eq(account.userId, reviewer)).all(),
		).toHaveLength(1);
	});

	it("removes no row of an other user", async () => {
		const accountId = createAccount(db, {
			userId: OTHER_USER,
			programId: "ba-club",
		});
		addSnapshot(db, { accountId, points: 500, observedAt: "2026-11-10" });
		insertCustomer(OTHER_USER);

		await removeUser(db, noNetwork().billing, USER);

		expect(currentBalances(db, OTHER_USER)).toHaveLength(1);
		expect(db.select().from(stripeCustomer).all()).toHaveLength(1);
	});
});
