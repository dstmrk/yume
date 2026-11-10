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

export const addSnapshotSchema = z.object({
	/** Points are integers and no balance is below 0. */
	points: z.number().int().min(0),
	observedAt: isoDateSchema,
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

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type AddSnapshotInput = z.infer<typeof addSnapshotSchema>;

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
