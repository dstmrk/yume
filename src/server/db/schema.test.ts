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

import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAuthTables } from "better-auth/db";
import { eq, getTableColumns, getTableName, is, sql, Table } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { insertUser } from "./fixtures.ts";
import { type Db, openDatabase } from "./index.ts";
import { addFavorite, addSnapshot, createAccount } from "./queries.ts";
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

/**
 * A copy of `drizzle/` with the migrations until `tag` only. A test applies it,
 * writes the rows of that old version, then applies the full folder.
 */
function migrationsUntil(tag: string): string {
	const folder = mkdtempSync(join(tmpdir(), "yume-drizzle-"));
	cpSync("drizzle", folder, { recursive: true });
	const path = join(folder, "meta", "_journal.json");
	const journal = JSON.parse(readFileSync(path, "utf8")) as {
		entries: { idx: number; tag: string }[];
	};
	const last = journal.entries.findIndex((entry) => entry.tag === tag);
	expect(last).toBeGreaterThan(-1);
	journal.entries = journal.entries.slice(0, last + 1);
	writeFileSync(path, JSON.stringify(journal));
	return folder;
}

/**
 * The migration of the sign-in with Google. Paragraph 4.2 of
 * `docs/architecture.md` gives the decision: the data of the first version goes
 * away, and the table `invitation` goes away.
 *
 * The test applies the migrations of the first version from a copy of
 * `drizzle/` with a short journal. Then it writes the rows of a user of that
 * version and applies the other migrations.
 */
describe("the migration of the sign-in with Google", () => {
	/** The last migration of the version with the invitations. */
	const LAST_OLD = "0005_clear_maelstrom";

	function oldMigrations(): string {
		return migrationsUntil(LAST_OLD);
	}

	function tablesOf(old: Db): string[] {
		return old
			.all<{ name: string }>(
				sql`select name from sqlite_master where type = 'table'`,
			)
			.map((row) => row.name);
	}

	it("removes the users of the first version and their data", () => {
		const old = openDatabase(":memory:");
		migrate(old, { migrationsFolder: oldMigrations() });
		seedCatalogue(old);
		expect(tablesOf(old)).toContain("invitation");

		const now = Math.floor(Date.now() / 1000);
		old.run(sql`insert into user (id, name, email, email_verified, created_at, updated_at)
			values ('author', 'Autore', 'autore@example.com', 0, ${now}, ${now})`);
		old.run(sql`insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
			values ('account-1', 'author', 'credential', 'author', 'hash', ${now}, ${now})`);
		old.run(sql`insert into session (id, token, user_id, expires_at, created_at, updated_at)
			values ('session-1', 'token-1', 'author', ${now + 3600}, ${now}, ${now})`);
		old.run(sql`insert into verification (id, identifier, value, expires_at, created_at, updated_at)
			values ('verification-1', 'x', 'y', ${now + 3600}, ${now}, ${now})`);
		old.run(sql`insert into invitation (id, code, created_by_user_id, expires_at)
			values ('invitation-1', 'ABCDEFGHJK', 'author', '2026-12-31')`);
		const accountId = createAccount(old, {
			userId: "author",
			programId: "amex-mr",
		});
		addSnapshot(old, { accountId, points: 1900, observedAt: "2026-11-01" });
		addFavorite(old, { userId: "author", currencyId: "revpoints" });

		migrate(old, { migrationsFolder: "drizzle" });

		expect(tablesOf(old)).not.toContain("invitation");
		for (const table of [
			schema.user,
			schema.account,
			schema.session,
			schema.verification,
			schema.userAccount,
			schema.balanceSnapshot,
			schema.favoriteCurrency,
		]) {
			expect(old.select().from(table).all(), getTableName(table)).toEqual([]);
		}
		// The catalogue is application data, not user data. It stays.
		expect(old.select().from(schema.program).all().length).toBeGreaterThan(0);
	});
});

/**
 * Yume asks Google for the email address only. The users of the version
 * before hold the name and the photo of the Google account, and the migration
 * 0007 removes them. Paragraph 4.1 of `docs/architecture.md` gives the rule.
 */
describe("the migration that removes the profile of Google", () => {
	it("removes the name and the photo and keeps the user", () => {
		const old = openDatabase(":memory:");
		migrate(old, { migrationsFolder: migrationsUntil("0006_google_sign_in") });

		const now = Math.floor(Date.now() / 1000);
		old.run(sql`insert into user (id, name, email, email_verified, image, created_at, updated_at)
			values ('author', 'Mario Rossi', 'autore@example.com', 1, 'https://example.com/photo', ${now}, ${now})`);

		migrate(old, { migrationsFolder: "drizzle" });

		const rows = old.select().from(schema.user).all();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.email).toBe("autore@example.com");
		expect(rows[0]?.name).toBe("");
		expect(rows[0]?.image).toBeNull();
	});
});
