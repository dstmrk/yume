/**
 * The logic of the page of the household. Paragraph 4.10 of
 * `docs/architecture.md` gives the decisions.
 */

import {
	ALREADY_IN_HOUSEHOLD,
	ALREADY_MEMBER,
	COUNTRY_MISMATCH,
	HOUSEHOLD_FULL,
	type MeResponse,
	SUPPORTER_REQUIRED,
} from "../../shared/api.ts";
import type { HouseholdPotential } from "../../shared/household.ts";
import { canManageHousehold } from "../../shared/tier.ts";
import { ApiError } from "./errors.ts";
import { byValueDesc } from "./sort.ts";

/**
 * The value that orders the cards: the total of a currency with a pool, or the
 * largest member of a currency with no pool. The second value is not a sum,
 * because nobody can spend that sum.
 */
export function cardValue(row: HouseholdPotential): number {
	return row.total ?? Math.max(0, ...row.members.map((m) => m.potential.total));
}

/**
 * The cards of the page: each currency with a potential above 0 for one
 * member, from the largest value to the smallest one.
 */
export function householdCards(
	rows: readonly HouseholdPotential[],
): HouseholdPotential[] {
	return rows.filter((row) => cardValue(row) > 0).sort(byValueDesc(cardValue));
}

export type HouseholdErrorKey =
	| "countryMismatch"
	| "full"
	| "alreadyMember"
	| "alreadyInHousehold"
	| "supporterRequired"
	| "invalid"
	| "general";

const KEYS: Readonly<Record<string, HouseholdErrorKey>> = {
	[COUNTRY_MISMATCH]: "countryMismatch",
	[HOUSEHOLD_FULL]: "full",
	[ALREADY_MEMBER]: "alreadyMember",
	[ALREADY_IN_HOUSEHOLD]: "alreadyInHousehold",
	[SUPPORTER_REQUIRED]: "supporterRequired",
	invalid_body: "invalid",
};

/** The key of the message of an error of a request of the household. */
export function householdErrorKey(error: unknown): HouseholdErrorKey {
	if (!(error instanceof ApiError) || error.code === null) return "general";
	return KEYS[error.code] ?? "general";
}

/**
 * Examines if the user can make a household. With no answer of `GET /api/me`
 * the client blocks nothing, and the server examines the request.
 */
export function canCreateHousehold(me: MeResponse | undefined): boolean {
	return (
		me === undefined || canManageHousehold({ limits: me.limits, tier: me.tier })
	);
}
