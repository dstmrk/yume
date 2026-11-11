import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { insertUser } from "./fixtures.ts";
import { type Db, openDatabase } from "./index.ts";
import { writeReviewer } from "./reviewer.ts";
import { account, session, user } from "./schema.ts";

const EMAIL = "reviewer@example.com";
const PASSWORD = "a-password-of-the-test";

let db: Db;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
});

function credentialOf(userId: string) {
	return db
		.select()
		.from(account)
		.where(eq(account.userId, userId))
		.all()
		.find((row) => row.providerId === "credential");
}

describe("writeReviewer", () => {
	it("makes a user with a password", async () => {
		expect(await writeReviewer(db, EMAIL, PASSWORD)).toBe("created");

		const [row] = db.select().from(user).all();
		expect(row?.email).toBe(EMAIL);
		const credential = credentialOf(row?.id ?? "");
		expect(credential?.accountId).toBe(row?.id);
		expect(
			await verifyPassword({
				hash: credential?.password ?? "",
				password: PASSWORD,
			}),
		).toBe(true);
	});

	// A verified address makes the administrator of `ADMIN_EMAIL`, and it lets
	// a Google account with the same address link to this user.
	it("makes a user with an address that is not verified", async () => {
		await writeReviewer(db, EMAIL, PASSWORD);

		expect(db.select().from(user).all()[0]?.emailVerified).toBe(false);
	});

	it("makes a free account", async () => {
		await writeReviewer(db, EMAIL, PASSWORD);

		const [row] = db.select().from(user).all();
		expect(row?.unlimited).toBe(false);
		expect(row?.supporterUntil).toBeNull();
	});

	// Better Auth writes the address in lower case at the sign-in.
	it("writes the address in lower case with no spaces", async () => {
		await writeReviewer(db, "  Reviewer@Example.COM ", PASSWORD);

		expect(db.select().from(user).all()[0]?.email).toBe(EMAIL);
	});

	it("keeps no password in clear text", async () => {
		await writeReviewer(db, EMAIL, PASSWORD);

		const [row] = db.select().from(account).all();
		expect(row?.password).not.toContain(PASSWORD);
	});

	it("changes the password of the same user at a second call", async () => {
		await writeReviewer(db, EMAIL, PASSWORD);
		const [first] = db.select().from(user).all();

		expect(await writeReviewer(db, EMAIL, "a-new-password-of-the-test")).toBe(
			"updated",
		);

		expect(db.select().from(user).all()).toHaveLength(1);
		const credential = credentialOf(first?.id ?? "");
		expect(
			await verifyPassword({
				hash: credential?.password ?? "",
				password: "a-new-password-of-the-test",
			}),
		).toBe(true);
		expect(db.select().from(account).all()).toHaveLength(1);
	});

	// A new password closes each session of the old password.
	it("removes the sessions of the user at a new password", async () => {
		await writeReviewer(db, EMAIL, PASSWORD);
		const [row] = db.select().from(user).all();
		const now = new Date();
		db.insert(session)
			.values({
				id: "session-1",
				token: "token-1",
				userId: row?.id ?? "",
				expiresAt: new Date(now.getTime() + 60_000),
				createdAt: now,
				updatedAt: now,
			})
			.run();

		await writeReviewer(db, EMAIL, "a-new-password-of-the-test");

		expect(db.select().from(session).all()).toHaveLength(0);
	});

	// A Google user is a real person: a password on that account gives an
	// other path to the data of the person.
	it("refuses the address of a user with no password", async () => {
		const id = insertUser(db, "primo");
		const now = new Date();
		db.insert(account)
			.values({
				id: "account-1",
				accountId: "google-sub",
				providerId: "google",
				userId: id,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		await expect(
			writeReviewer(db, "primo@example.com", PASSWORD),
		).rejects.toThrow(/no password/);
		expect(db.select().from(account).all()).toHaveLength(1);
	});

	it("refuses a text that is not an email address", async () => {
		await expect(writeReviewer(db, "reviewer", PASSWORD)).rejects.toThrow(
			/email address/,
		);
		expect(db.select().from(user).all()).toHaveLength(0);
	});

	// Better Auth refuses a password of less than 8 characters or of more
	// than 128 characters at the sign-in. The account then gives no sign-in.
	it.each([
		["short", "short"],
		["long", "x".repeat(129)],
	])("refuses a %s password", async (_name, password) => {
		await expect(writeReviewer(db, EMAIL, password)).rejects.toThrow(
			/8 to 128 characters/,
		);
		expect(db.select().from(user).all()).toHaveLength(0);
	});
});
