/**
 * The tables of the database, against two sources of truth.
 *
 * The first test reads the fields from `getAuthTables` of Better Auth. Better
 * Auth writes and reads those fields through the Drizzle adapter. The adapter
 * finds a field with the name of the property of the table, not with the name
 * of the column. Therefore a new version of Better Auth with a new field breaks
 * this test, and no user finds the defect at the sign-in.
 *
 * The second test reads the columns from the database after the migrations. It
 * fails when a person changes `schema.ts` and does not run `npm run db:generate`.
 */

import { getAuthTables } from "better-auth/db";
import { eq, getTableColumns, getTableName, is, sql, Table } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { insertUser } from "./fixtures.ts";
import { type Db, openDatabase } from "./index.ts";
import { addSnapshot, createAccount } from "./queries.ts";
import * as schema from "./schema.ts";
import { seedCatalogue } from "./seed/seed.ts";

let db: Db;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
});

/** The tables of `schema.ts`, with the name of the export of each one. */
const tables = Object.entries(schema).filter(([, value]) =>
	is(value, Table),
) as [string, Table][];

describe("the tables of Better Auth", () => {
	// The adapter reads `schema[model]`. Thus the name of the export must be the
	// name of the model.
	for (const [model, table] of Object.entries(getAuthTables({}))) {
		it(`holds each field of the model ${model}`, () => {
			const found = tables.find(([name]) => name === model);
			expect(found, `schema.ts holds no export ${model}`).toBeDefined();

			const columns = Object.keys(getTableColumns(found?.[1] as Table));
			for (const field of ["id", ...Object.keys(table.fields)]) {
				expect(columns).toContain(field);
			}
		});
	}
});

describe("the migrations of drizzle/", () => {
	for (const [name, table] of tables) {
		it(`makes each column of ${name}`, () => {
			const rows = db.all<{ name: string }>(
				sql.raw(`pragma table_info(${getTableName(table)})`),
			);
			const inDatabase = rows.map((row) => row.name);

			for (const column of Object.values(getTableColumns(table))) {
				expect(inDatabase).toContain(column.name);
			}
		});
	}
});

describe("the foreign key of user_account", () => {
	it("refuses an account of a user that does not exist", () => {
		expect(() =>
			db
				.insert(schema.userAccount)
				.values({
					id: "account-1",
					userId: "no-such-user",
					programId: "ba-club",
				})
				.run(),
		).toThrow();
	});
});

describe("the removal of a user", () => {
	it("removes the accounts of the user and their snapshots", () => {
		seedCatalogue(db);
		insertUser(db, "user-1");
		const account = createAccount(db, {
			userId: "user-1",
			programId: "ba-club",
		});
		addSnapshot(db, {
			accountId: account,
			points: 100,
			observedAt: "2026-08-11",
		});

		db.delete(schema.user).where(eq(schema.user.id, "user-1")).run();

		expect(db.select().from(schema.userAccount).all()).toEqual([]);
		expect(db.select().from(schema.balanceSnapshot).all()).toEqual([]);
	});
});

describe("the table invitation", () => {
	it("refuses two invitations with the same code", () => {
		const now = new Date();
		db.insert(schema.user)
			.values({
				id: "user-1",
				name: "Uno",
				email: "uno@example.com",
				emailVerified: false,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		const invitation = {
			code: "ABC123",
			createdByUserId: "user-1",
			expiresAt: "2026-12-31",
		};
		db.insert(schema.invitation)
			.values({ id: "invitation-1", ...invitation })
			.run();

		expect(() =>
			db
				.insert(schema.invitation)
				.values({ id: "invitation-2", ...invitation })
				.run(),
		).toThrow();
	});
});
