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

/** A date in the ISO 8601 format, for example `2026-08-11`. */
export const isoDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine((value) => !Number.isNaN(Date.parse(value)));

export const createAccountSchema = z.object({
	programId: z.string().min(1),
	nickname: z.string().min(1).max(60).nullish(),
	membershipRef: z.string().min(1).max(60).nullish(),
});

export const addSnapshotSchema = z.object({
	/** Points are integers and no balance is below 0. */
	points: z.number().int().min(0),
	observedAt: isoDateSchema,
	note: z.string().max(200).nullish(),
});

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
	nickname: string | null;
	/**
	 * The id of the most recent snapshot. The client sends this id to remove the
	 * balance that it shows. It is null when the account has no snapshot.
	 */
	snapshotId: string | null;
	/** It is null when the account has no snapshot. */
	points: number | null;
	observedAt: string | null;
};

/**
 * The state of an invitation at a moment. Only `valid` gives the sign-up.
 *
 * An invitation that a person used stays `used`, also after the date of the
 * end. Refer to `src/server/invitation.ts`.
 */
export type InvitationState = "valid" | "expired" | "used";

/** One invitation that the user wrote. */
export type InvitationRow = {
	code: string;
	expiresAt: string;
	state: InvitationState;
};

export type InvitationsResponse = {
	invitations: InvitationRow[];
	/** The quantity of invitations that the user can still write. */
	left: number;
};

export type CatalogueResponse = {
	currencies: Currency[];
	programs: Program[];
};

export type AccountsResponse = {
	accounts: AccountRow[];
};

export type PotentialResponse = {
	/** The date of the calculation. A rule has versions. */
	at: string;
	potential: PotentialMiles[];
};
