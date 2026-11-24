/**
 * The potential miles of a household. Paragraph 4.10 of
 * `docs/architecture.md` gives the decisions.
 *
 * This function is pure. It does no I/O and it does not read the clock.
 */

import type {
	AccountBalance,
	CountryCode,
	HouseholdPool,
	IsoDate,
	Program,
	TransferRule,
} from "./catalogue.ts";
import { isValidAt } from "./conversion.ts";
import { type PotentialMiles, potentialMiles } from "./potential.ts";

/** The potential of one member of the household for one currency. */
export type MemberPotential = {
	readonly memberId: string;
	readonly potential: PotentialMiles;
};

export type HouseholdPotential = {
	readonly currencyId: string;
	/** True when a programme of the currency lets the household pool. */
	readonly pooled: boolean;
	/** One row for each member, in the order of the input. */
	readonly members: readonly MemberPotential[];
	/**
	 * The sum of the totals of the members, or null with no pool. Two people
	 * cannot spend their miles in one booking without a pool, thus a sum is a
	 * value that nobody can use.
	 */
	readonly total: number | null;
};

/**
 * Examines if the currency has a pool in the country at the date. One
 * programme of the currency is sufficient: the six programmes of Avios move
 * Avios between them at no cost.
 */
export function hasHouseholdPool(input: {
	currencyId: string;
	programs: readonly Program[];
	pools: readonly HouseholdPool[];
	country: CountryCode;
	at: IsoDate;
}): boolean {
	const { currencyId, programs, pools, country, at } = input;
	const ids = new Set(
		programs
			.filter((program) => program.currencyId === currencyId)
			.map((program) => program.id),
	);
	return pools.some(
		(pool) =>
			ids.has(pool.programId) &&
			pool.country === country &&
			isValidAt(pool, at),
	);
}

/**
 * Calculates the potential miles of one currency for each member of a
 * household, with the country of the household.
 *
 * Each member is a separate calculation: the minimum of a transfer applies to
 * the account of one person, and a source of one person cannot send points to
 * the account of an other person. The function adds the totals of the members
 * only when the currency has a pool.
 */
export function householdPotential(input: {
	currencyId: string;
	members: readonly {
		readonly memberId: string;
		readonly balances: readonly AccountBalance[];
	}[];
	programs: readonly Program[];
	rules: readonly TransferRule[];
	pools: readonly HouseholdPool[];
	country: CountryCode;
	at: IsoDate;
}): HouseholdPotential {
	const { currencyId, members, programs, rules, pools, country, at } = input;
	const rows = members.map((member) => ({
		memberId: member.memberId,
		potential: potentialMiles({
			currencyId,
			balances: member.balances,
			programs,
			rules,
			country,
			at,
		}),
	}));
	const pooled = hasHouseholdPool({ currencyId, programs, pools, country, at });
	return {
		currencyId,
		pooled,
		members: rows,
		total: pooled
			? rows.reduce((sum, row) => sum + row.potential.total, 0)
			: null,
	};
}
