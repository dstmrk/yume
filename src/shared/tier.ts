/**
 * The level of the account of a user. Paragraph 4.6 of
 * `docs/architecture.md` gives the decision.
 *
 * The database keeps no level. It keeps two sources, and this function gives
 * the level from them:
 *
 * - `supporterUntil`: the end of the supporter account. Only the payment
 *   writes it.
 * - `unlimited`: a flag that the administrator writes by hand. It gives each
 *   function of the supporter account with no payment.
 *
 * The payment thus cannot remove an unlimited account. This function is pure:
 * the caller gives the clock.
 */

export type AccountTier = "free" | "supporter" | "unlimited";

/** The fields of the table `user` that give the level. */
export type TierSource = {
	readonly supporterUntil: Date | null;
	readonly unlimited: boolean;
};

/**
 * Gives the level of the account at the instant `now`.
 *
 * The supporter account stops at `supporterUntil`: at that exact instant the
 * level is free.
 */
export function accountTier(source: TierSource, now: Date): AccountTier {
	if (source.unlimited) return "unlimited";
	if (
		source.supporterUntil !== null &&
		now.getTime() < source.supporterUntil.getTime()
	) {
		return "supporter";
	}
	return "free";
}
