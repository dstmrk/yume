/**
 * The shapes of the requests of the API.
 *
 * The client and the server use the same schemas. The schemas hold no text for
 * the user: the client writes the Italian text. Refer to the section Language
 * rules in `CLAUDE.md`.
 */

import { z } from "zod";
import type { Currency, Program } from "./catalogue.ts";
import type { PotentialMiles } from "./potential.ts";
import type { AccountTier } from "./tier.ts";

/**
 * A date in the ISO 8601 format, for example `2026-08-11`.
 *
 * `Date.parse` is not sufficient: V8 accepts a day up to 31 in each month, and
 * `2026-02-30` gives 2 March. Thus the schema makes the date in UTC from its
 * three parts and compares the result with those parts.
 */
export const isoDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine((value) => {
		// The regular expression gives three parts.
		const [year, month, day] = value.split("-").map(Number) as [
			number,
			number,
			number,
		];
		const date = new Date(Date.UTC(year, month - 1, day));
		return (
			date.getUTCFullYear() === year &&
			date.getUTCMonth() === month - 1 &&
			date.getUTCDate() === day
		);
	});

/**
 * The maximum quantity of expiry lots of one snapshot.
 *
 * A programme shows some dates of expiry, not one date for each month of ten
 * years. The limit keeps the body below `MAX_BODY_BYTES` of the server.
 */
export const MAX_EXPIRY_LOTS = 50;

/**
 * A quantity of points of a balance that expires at a date.
 *
 * The point is the smallest unit, but the database keeps one row for one date,
 * not one row for one point. Paragraph 3.2.1 of `docs/architecture.md` gives
 * the model.
 */
export const expiryLotSchema = z.object({
	points: z.number().int().min(1),
	expiresOn: isoDateSchema,
});

/**
 * A snapshot of the balance, with its expiry lots.
 *
 * The lots are not necessary, and they can hold a part of the balance only.
 * The schema refuses these lots:
 *
 * - lots with a sum above the balance;
 * - two lots with the same date;
 * - a lot that expires before the date of the balance. That lot is not in the
 *   balance.
 */
export const addSnapshotSchema = z
	.object({
		/** Points are integers and no balance is below 0. */
		points: z.number().int().min(0),
		observedAt: isoDateSchema,
		lots: z.array(expiryLotSchema).max(MAX_EXPIRY_LOTS).optional(),
	})
	.superRefine((snapshot, context) => {
		const lots = snapshot.lots ?? [];
		const sum = lots.reduce((total, lot) => total + lot.points, 0);
		if (sum > snapshot.points) {
			context.addIssue({
				code: "custom",
				path: ["lots"],
				message: "The lots are above the balance.",
			});
		}
		if (new Set(lots.map((lot) => lot.expiresOn)).size !== lots.length) {
			context.addIssue({
				code: "custom",
				path: ["lots"],
				message: "Two lots hold the same date.",
			});
		}
		if (lots.some((lot) => lot.expiresOn < snapshot.observedAt)) {
			context.addIssue({
				code: "custom",
				path: ["lots"],
				message: "A lot expires before the date of the balance.",
			});
		}
	});

/**
 * A new account. `snapshot` is the first balance, and it is not necessary.
 *
 * The server writes the account and the snapshot in one transaction. Thus one
 * error gives no row, and a second request gives no second account.
 */
export const createAccountSchema = z.object({
	programId: z.string().min(1),
	snapshot: addSnapshotSchema.optional(),
});

/**
 * The error of `POST /api/accounts` when the user holds the maximum quantity of
 * accounts. The client reads it and shows its own message.
 */
export const TOO_MANY_ACCOUNTS = "too_many_accounts";

/**
 * The error of a request that the free account cannot do, with the status 403:
 * an account above the limits, or the expiry lots of a snapshot. The client
 * knows the form of the request and shows its own message. Paragraph 4.6 of
 * `docs/architecture.md` gives the limits.
 */
export const SUPPORTER_REQUIRED = "supporter_required";

/**
 * The body of `PUT /api/admin/users/:id/unlimited`.
 *
 * The schema is strict: the administrator writes the flag only. The payment
 * writes `supporterUntil`. Paragraph 4.6 of `docs/architecture.md` gives the
 * two writers.
 */
export const setUnlimitedSchema = z.strictObject({ unlimited: z.boolean() });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type AddSnapshotInput = z.infer<typeof addSnapshotSchema>;
export type ExpiryLot = z.infer<typeof expiryLotSchema>;

/**
 * The shapes of the answers of the API. The server gives these types to its
 * routes, and the client reads them. Thus the two sides cannot become
 * different.
 */

/** One account of the user with its current balance. */
export type AccountRow = {
	accountId: string;
	programId: string;
	/**
	 * The id of the most recent snapshot. The client sends this id to remove the
	 * balance that it shows, and no balance that an other device wrote after it.
	 * It is null when the account has no snapshot.
	 */
	snapshotId: string | null;
	/** It is null when the account has no snapshot. */
	points: number | null;
	observedAt: string | null;
	/**
	 * The expiry lots of the most recent snapshot, in the order of the date. The
	 * list is empty when the account has no snapshot.
	 */
	lots: ExpiryLot[];
};

export type CatalogueResponse = {
	currencies: Currency[];
	programs: Program[];
};

export type AccountsResponse = {
	accounts: AccountRow[];
};

/**
 * The currencies that the user marks as a favourite.
 *
 * The dashboard shows the cards of these currencies first. The list holds a
 * currency and not a programme: one card shows one currency.
 */
export type FavoritesResponse = {
	currencyIds: string[];
};

export type PotentialResponse = {
	/** The date of the calculation. A rule has versions. */
	at: string;
	potential: PotentialMiles[];
};

/**
 * The user of the session. `admin` is true for the address of `ADMIN_EMAIL`
 * only. The client shows the link of the page of the administrator with it.
 *
 * `limits` and `tier` give the entitlement of the user. The client disables
 * the options of the forms with `canAddAccount` and `canWriteExpiryLots`. The
 * server examines each request again: the client is not the protection.
 */
export type MeResponse = {
	admin: boolean;
	/** The value of `FREE_ACCOUNT_LIMITS`. */
	limits: boolean;
	tier: AccountTier;
};

/**
 * One user of the instance, for the administrator. The row holds no account,
 * no balance and no programme. Paragraph 4.8 of `docs/architecture.md` gives the rule.
 */
export type AdminUser = {
	id: string;
	email: string;
	/** The instant of the first sign-in, in the ISO 8601 format. */
	createdAt: string;
	/** The level at the clock of the server. */
	tier: AccountTier;
	/** The end of the supporter account, in the ISO 8601 format, or null. */
	supporterUntil: string | null;
	unlimited: boolean;
};

export type AdminUsersResponse = {
	/** The newest user first. */
	users: AdminUser[];
};
