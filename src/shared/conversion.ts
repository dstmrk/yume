/**
 * The conversion of points between two currencies.
 *
 * These functions are pure. They do no I/O and they do not read the clock.
 * The caller gives the rules and the date as parameters.
 */

/**
 * A date in the ISO 8601 format, for example `2026-08-11`.
 *
 * All the dates use the same format. Thus a comparison of two strings gives the
 * same result as a comparison of two dates.
 */
export type IsoDate = string;

/**
 * A rule for a transfer from one currency to one other currency.
 *
 * The ratio is two integers. `ratioNum` is the quantity of target points and
 * `ratioDen` is the quantity of source points. Amex gives 4 Avios for 5
 * Membership Rewards points. Thus `ratioNum` is 4 and `ratioDen` is 5.
 *
 * A rule is historical data. To change a ratio, write the date in `validTo` of
 * the old rule. Then add a new rule.
 */
export type TransferRule = {
	readonly fromCurrencyId: string;
	readonly toCurrencyId: string;
	/** The quantity of target points. It is more than 0. */
	readonly ratioNum: number;
	/** The quantity of source points. It is more than 0. */
	readonly ratioDen: number;
	/** The smallest transfer that the programme accepts. */
	readonly minTransfer: number;
	/** The step of the transfer. It is 1 or more. */
	readonly increment: number;
	readonly validFrom: IsoDate;
	/** The last date of the rule. It is null for an active rule. */
	readonly validTo: IsoDate | null;
};

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
 * Finds the rule for a pair of currencies at a date.
 *
 * The result is undefined when no rule exists at that date. A transfer between
 * the two currencies is then not possible.
 */
export function findRule(
	rules: readonly TransferRule[],
	fromCurrencyId: string,
	toCurrencyId: string,
	at: IsoDate,
): TransferRule | undefined {
	return rules.find(
		(rule) =>
			rule.fromCurrencyId === fromCurrencyId &&
			rule.toCurrencyId === toCurrencyId &&
			isValidAt(rule, at),
	);
}
