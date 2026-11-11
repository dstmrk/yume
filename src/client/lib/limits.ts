/**
 * The limits of the free account in the forms. Paragraph 4.6 of
 * `docs/architecture.md` gives the rules.
 *
 * The client reads the same functions as the server, thus one rule has one
 * place. The form disables an option before the request. The server examines
 * each request again: the client is not the protection. With no answer of
 * `GET /api/me`, the functions block nothing.
 */

import type { MeResponse } from "../../shared/api.ts";
import type { Currency, Program } from "../../shared/catalogue.ts";
import { canAddAccount, canWriteExpiryLots } from "../../shared/tier.ts";

/** The programmes that the user cannot add now. */
export function blockedPrograms(
	me: MeResponse | undefined,
	programs: readonly Program[],
	currencies: readonly Currency[],
	accountProgramIds: readonly string[],
): ReadonlySet<string> {
	if (me === undefined) return new Set();
	const entitlement = { limits: me.limits, tier: me.tier };
	return new Set(
		programs
			.filter(
				(program) =>
					!canAddAccount({
						entitlement,
						programId: program.id,
						accountProgramIds,
						catalogue: { programs, currencies },
					}),
			)
			.map((program) => program.id),
	);
}

/**
 * True when the user cannot write a new expiry lot. The form then keeps the
 * current lots as they are: the user can only remove them.
 */
export function lotsLocked(me: MeResponse | undefined): boolean {
	return (
		me !== undefined &&
		!canWriteExpiryLots({ limits: me.limits, tier: me.tier })
	);
}
