/**
 * The tables of the database.
 *
 * The tables `currency`, `program` and `transfer_rule` hold application data.
 * The seed script writes them from `src/server/db/seed/catalogue.ts`.
 *
 * The tables `user_account` and `balance_snapshot` hold user data.
 *
 * The tables `user`, `session`, `account` and `verification` belong to Better
 * Auth. Paragraph 4 of `docs/architecture.md` gives the reason for one schema.
 *
 * All the points are integers. All the dates are text in the ISO 8601 format.
 * Paragraph 3.3 of `docs/architecture.md` gives the reason. The four tables of
 * Better Auth are the exception: that library reads and writes a `Date`, thus
 * those columns hold an integer of seconds.
 */

import { sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

/**
 * The user. Better Auth controls this table.
 *
 * The name of each property is the name of the field of Better Auth. The
 * Drizzle adapter finds a field with that name. The name of the column is free,
 * thus it keeps the form of the other tables of this file.
 */
export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/** A session of a user. Better Auth controls this table. */
export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

/**
 * The credentials of a user. Better Auth controls this table.
 *
 * This table is not `user_account`. Better Auth keeps the password of the
 * sign-in here. `user_account` holds the account of the user with a loyalty
 * programme.
 */
export const account = sqliteTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", {
		mode: "timestamp",
	}),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", {
		mode: "timestamp",
	}),
	scope: text("scope"),
	password: text("password"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/** A token with a limit of time. Better Auth controls this table. */
export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * An invitation to the application.
 *
 * Registration is possible only with an invitation. A hook of Better Auth
 * examines the code at the sign-up. Then the same operation writes `used_at`
 * and `used_by_user_id`. Paragraph 4 of `docs/architecture.md` gives the rule.
 *
 * The dates are text in the ISO 8601 format, as in the other tables of the
 * application. Better Auth does not control this table.
 */
export const invitation = sqliteTable("invitation", {
	id: text("id").primaryKey(),
	code: text("code").notNull().unique(),
	createdByUserId: text("created_by_user_id")
		.notNull()
		.references(() => user.id),
	/** The address of the person who receives the code. It is only a note. */
	email: text("email"),
	expiresAt: text("expires_at").notNull(),
	usedAt: text("used_at"),
	usedByUserId: text("used_by_user_id").references(() => user.id),
});

/** A currency of points or of miles. More than one programme can use one currency. */
export const currency = sqliteTable("currency", {
	id: text("id").primaryKey(),
	code: text("code").notNull().unique(),
	name: text("name").notNull(),
	kind: text("kind", {
		enum: ["airline", "flexible", "hotel", "rail"],
	}).notNull(),
});

/** A loyalty programme. The user has an account with a programme. */
export const program = sqliteTable("program", {
	id: text("id").primaryKey(),
	currencyId: text("currency_id")
		.notNull()
		.references(() => currency.id),
	code: text("code").notNull().unique(),
	name: text("name").notNull(),
	transferable: integer("transferable", { mode: "boolean" }).notNull(),
});

/**
 * A rule for a transfer from one programme to one other programme.
 *
 * The key is the pair of programmes with `valid_from`. Thus one pair cannot
 * have two rules that start on the same day. A rule is historical data: to
 * change a ratio, write a date in `valid_to` and add a new rule.
 */
export const transferRule = sqliteTable(
	"transfer_rule",
	{
		fromProgramId: text("from_program_id")
			.notNull()
			.references(() => program.id),
		toProgramId: text("to_program_id")
			.notNull()
			.references(() => program.id),
		ratioNum: integer("ratio_num").notNull(),
		ratioDen: integer("ratio_den").notNull(),
		minTransfer: integer("min_transfer").notNull(),
		increment: integer("increment").notNull(),
		validFrom: text("valid_from").notNull(),
		validTo: text("valid_to"),
	},
	(table) => [
		primaryKey({
			columns: [table.fromProgramId, table.toProgramId, table.validFrom],
		}),
	],
);

/**
 * An account of the user with a programme.
 *
 * The removal of a user removes the accounts of that user, and then the
 * snapshots of those accounts.
 */
export const userAccount = sqliteTable("user_account", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	programId: text("program_id")
		.notNull()
		.references(() => program.id),
	membershipRef: text("membership_ref"),
	nickname: text("nickname"),
});

/**
 * The balance of an account at a date.
 *
 * The current balance is the most recent snapshot of the account. The database
 * keeps no record of the changes. Paragraph 3.2 of `docs/architecture.md` gives
 * the reason.
 */
export const balanceSnapshot = sqliteTable(
	"balance_snapshot",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id")
			.notNull()
			.references(() => userAccount.id, { onDelete: "cascade" }),
		points: integer("points").notNull(),
		observedAt: text("observed_at").notNull(),
		note: text("note"),
	},
	(table) => [
		// The application reads the most recent snapshot of an account.
		index("balance_snapshot_account_observed_at").on(
			table.accountId,
			sql`${table.observedAt} desc`,
		),
	],
);
