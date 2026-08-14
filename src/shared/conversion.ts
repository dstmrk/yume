/**
 * The conversion of points between two programmes.
 *
 * These functions are pure. They do no I/O and they do not read the clock.
 * The caller gives the rules and the date as parameters.
 */

import type { CountryCode, IsoDate, TransferRule } from "./catalogue.ts";

/**
 * Calculates the target points for a balance of source points.
 *
 * The three steps stay in this sequence:
 *
 * 1. Decrease the balance to a multiple of `increment`.
 * 2. Compare the result with `minTransfer`.
 * 3. Multiply first, then divide.
 *
 * The calculation uses integers only. `Math.floor` prevents a value that is too
 * high, because a programme gives no partial mile.
 */
export function convert(balance: number, rule: TransferRule): number {
	if (balance <= 0) {
		return 0;
	}
	const transferable = Math.floor(balance / rule.increment) * rule.increment;
	if (transferable < rule.minTransfer) {
		return 0;
	}
	return Math.floor((transferable * rule.ratioNum) / rule.ratioDen);
}

/** Examines if a rule is valid at a date. */
export function isValidAt(rule: TransferRule, at: IsoDate): boolean {
	return rule.validFrom <= at && (rule.validTo === null || rule.validTo > at);
}

/**
 * Finds the rule for a pair of programmes in a country at a date.
 *
 * The result is undefined when no rule exists in that country at that date. A
 * transfer between the two programmes is then not possible.
 *
 * The comparison of the country is exact. A rule of an other country gives an
 * other ratio, thus it must give no value to this country.
 */
export function findRule(
	rules: readonly TransferRule[],
	fromProgramId: string,
	toProgramId: string,
	country: CountryCode,
	at: IsoDate,
): TransferRule | undefined {
	return rules.find(
		(rule) =>
			rule.fromProgramId === fromProgramId &&
			rule.toProgramId === toProgramId &&
			rule.country === country &&
			isValidAt(rule, at),
	);
}
