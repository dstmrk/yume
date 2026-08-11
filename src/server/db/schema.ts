/**
 * The tables of the database.
 *
 * The tables `currency`, `program` and `transfer_rule` hold application data.
 * The seed script writes them from `src/server/db/seed/catalogue.ts`.
 *
 * The tables `user_account` and `balance_snapshot` hold user data.
 *
 * All the points are integers. All the dates are text in the ISO 8601 format.
 * Paragraph 3.3 of `docs/architecture.md` gives the reason.
 */

import { sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

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
		sourceUrl: text("source_url").notNull(),
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
 * The column `user_id` has no foreign key now. Better Auth makes the table
 * `user` in a later step. Paragraph 4 of `docs/architecture.md` gives the plan.
 */
export const userAccount = sqliteTable("user_account", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
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
