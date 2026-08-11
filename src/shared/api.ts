/**
 * The shapes of the requests of the API.
 *
 * The client and the server use the same schemas. The schemas hold no text for
 * the user: the client writes the Italian text. Refer to the section Language
 * rules in `CLAUDE.md`.
 */

import { z } from "zod";

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
