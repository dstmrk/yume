/**
 * The calculation of the potential miles of a currency.
 *
 * This function is pure. It does no I/O and it does not read the clock.
 * The caller gives the catalogue, the balances and the date as parameters.
 */

import type {
	AccountBalance,
	IsoDate,
	Program,
	TransferRule,
} from "./catalogue.js";
import { convert, findRule } from "./conversion.js";

export type PotentialMiles = {
	readonly currencyId: string;
	/** The sum of the balances of the currency now. */
	readonly current: number;
	/** The miles that the transfers can add. */
	readonly fromTransfers: number;
	/** The sum of the two values above. */
	readonly total: number;
};

/**
 * Calculates the potential miles of one currency.
 *
 * The calculation obeys these four rules:
 *
 * 1. It adds the balance of each account of the currency. Avios from Iberia
 *    Club and Avios from The British Airways Club are one balance.
 * 2. It selects the best route for each source account. One currency can have
 *    more than one programme, and each route has its own minimum and step.
 * 3. It calculates each source account alone. The minimum applies to one
 *    account.
 * 4. It ignores a balance of the currency C as a source. That balance is
 *    already in the current balance.
 *
 * The result is a maximum for one currency. The user cannot send the same
 * points to two currencies. Do not add the results of two currencies.
 */
export function potentialMiles(input: {
	currencyId: string;
	balances: readonly AccountBalance[];
	programs: readonly Program[];
	rules: readonly TransferRule[];
	at: IsoDate;
}): PotentialMiles {
	const { currencyId, balances, programs, rules, at } = input;
	const programById = new Map(programs.map((program) => [program.id, program]));
	const targets = programs.filter(
		(program) => program.currencyId === currencyId,
	);

	let current = 0;
	let fromTransfers = 0;

	for (const balance of balances) {
		const source = programById.get(balance.programId);
		if (source === undefined) {
			continue;
		}
		if (source.currencyId === currencyId) {
			current += balance.points;
			continue;
		}
		fromTransfers += bestRoute(balance.points, source.id, targets, rules, at);
	}

	return { currencyId, current, fromTransfers, total: current + fromTransfers };
}

/** Gives the largest quantity of points that one account can send to a currency. */
function bestRoute(
	points: number,
	fromProgramId: string,
	targets: readonly Program[],
	rules: readonly TransferRule[],
	at: IsoDate,
): number {
	let best = 0;
	for (const target of targets) {
		const rule = findRule(rules, fromProgramId, target.id, at);
		if (rule === undefined) {
			continue;
		}
		best = Math.max(best, convert(points, rule));
	}
	return best;
}
