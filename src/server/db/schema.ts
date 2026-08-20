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

/**
 * A loyalty programme. The user has an account with a programme.
 *
 * The column `chart_kind` gives the kind of the award chart. A `region`
 * programme and a `distance` programme hold rows in `award`. A `dynamic`
 * programme holds no row: it publishes no chart. Paragraph 3.1.1 of
 * `docs/monetisation.md` gives the three kinds.
 *
 * The column holds null while no person read the official page of the
 * programme. Null is not `dynamic`: the value `dynamic` is the result of an
 * examination, and null is the absence of that examination.
 */
export const program = sqliteTable("program", {
	id: text("id").primaryKey(),
	currencyId: text("currency_id")
		.notNull()
		.references(() => currency.id),
	code: text("code").notNull().unique(),
	name: text("name").notNull(),
	transferable: integer("transferable", { mode: "boolean" }).notNull(),
	chartKind: text("chart_kind", { enum: ["region", "distance", "dynamic"] }),
});

/**
 * A rule for a transfer from one programme to one other programme.
 *
 * The key is the pair of programmes with `country` and with `valid_from`. Thus
 * one pair in one country cannot have two rules that start on the same day, and
 * two countries can hold a different rule for the same pair. A rule is
 * historical data: to change a ratio, write a date in `valid_to` and add a new
 * rule.
 *
 * The column `country` holds a country in the ISO 3166-1 alpha-2 format. The
 * catalogue holds `IT` only now. Paragraph 3.3.2 of `docs/architecture.md`
 * gives the reason.
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
		country: text("country").notNull(),
		ratioNum: integer("ratio_num").notNull(),
		ratioDen: integer("ratio_den").notNull(),
		minTransfer: integer("min_transfer").notNull(),
		increment: integer("increment").notNull(),
		validFrom: text("valid_from").notNull(),
		validTo: text("valid_to"),
	},
	(table) => [
		primaryKey({
			columns: [
				table.fromProgramId,
				table.toProgramId,
				table.country,
				table.validFrom,
			],
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
});

/**
 * A currency that the user marks as a favourite.
 *
 * The row marks a currency, not a programme. The dashboard shows one card for
 * one currency, and the heart of that card writes this row. Six programmes use
 * Avios, thus a favourite of a programme gives six marks for one card.
 *
 * The key is the pair of the user and the currency. Therefore one user marks
 * one currency one time, and a second mark changes no row.
 */
export const favoriteCurrency = sqliteTable(
	"favorite_currency",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		currencyId: text("currency_id")
			.notNull()
			.references(() => currency.id),
	},
	(table) => [primaryKey({ columns: [table.userId, table.currencyId] })],
);

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
	},
	(table) => [
		// The application reads the most recent snapshot of an account.
		index("balance_snapshot_account_observed_at").on(
			table.accountId,
			sql`${table.observedAt} desc`,
		),
	],
);

/**
 * An award of a programme: the miles and the taxes for one route.
 *
 * The shape follows `transfer_rule`: integers only, and the two fields of the
 * version. An award is historical data. To change a quantity of miles, write a
 * date in `valid_to` of the old row. Then add a new row with a new
 * `valid_from`.
 *
 * The key is the route with the cabin, the season and `valid_from`. Therefore
 * one programme cannot hold two awards of the same route and of the same cabin
 * that start on the same day.
 *
 * A programme that publishes no chart holds no row here. The interface then
 * shows the state `dynamic`, and it shows no quantity of miles. Paragraph 3.1.1
 * of `docs/monetisation.md` gives the reason.
 *
 * The columns `from_zone` and `to_zone` hold a zone of the chart of the
 * programme. Each programme gives its own names, thus the two values have a
 * meaning with `program_id` only.
 */
export const award = sqliteTable(
	"award",
	{
		programId: text("program_id")
			.notNull()
			.references(() => program.id),
		fromZone: text("from_zone").notNull(),
		toZone: text("to_zone").notNull(),
		cabin: text("cabin", {
			enum: ["economy", "premium", "business", "first"],
		}).notNull(),
		/** `all` is the season of a programme with no calendar of the seasons. */
		season: text("season", {
			enum: ["peak", "off-peak", "all"],
		}).notNull(),
		miles: integer("miles").notNull(),
		/** The taxes and the charges, in cents. Refer to the rule of the integers. */
		taxesCents: integer("taxes_cents").notNull(),
		validFrom: text("valid_from").notNull(),
		validTo: text("valid_to"),
	},
	(table) => [
		primaryKey({
			columns: [
				table.programId,
				table.fromZone,
				table.toZone,
				table.cabin,
				table.season,
				table.validFrom,
			],
		}),
	],
);

/**
 * A period of one season in the calendar of a programme.
 *
 * The calendar gives the season of a date. Thus the month is no second source
 * of data, and one pure function reads this table with one date. Paragraph
 * 3.1.2 of `docs/monetisation.md` gives the rule.
 *
 * The two fields of the version have the same meaning as in `award`. The key is
 * the programme with `from_date` and with `valid_from`.
 *
 * This table holds `peak` and `off-peak` only. The value `all` of `award` is
 * the award of a programme with no calendar, therefore that value is no period.
 */
export const awardSeason = sqliteTable(
	"award_season",
	{
		programId: text("program_id")
			.notNull()
			.references(() => program.id),
		fromDate: text("from_date").notNull(),
		toDate: text("to_date").notNull(),
		season: text("season", { enum: ["peak", "off-peak"] }).notNull(),
		validFrom: text("valid_from").notNull(),
		validTo: text("valid_to"),
	},
	(table) => [
		primaryKey({
			columns: [table.programId, table.fromDate, table.validFrom],
		}),
	],
);
