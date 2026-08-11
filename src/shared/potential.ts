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

/** The best route from one source account to the target currency. */
export type BestRoute = {
	readonly fromProgramId: string;
	/** The programme of the target currency that gives the largest result. */
	readonly toProgramId: string;
	/** The points that arrive in the target currency. It is more than 0. */
	readonly points: number;
};

export type PotentialMiles = {
	readonly currencyId: string;
	/** The sum of the balances of the currency now. */
	readonly current: number;
	/** The miles that the transfers can add. */
	readonly fromTransfers: number;
	/** The sum of the two values above. */
	readonly total: number;
	/**
	 * The route of each source that gives more than 0. The card of the currency
	 * shows this list. Refer to paragraph 5.0 of `docs/architecture.md`.
	 */
	readonly routes: readonly BestRoute[];
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
	const routes: BestRoute[] = [];

	for (const balance of balances) {
		const source = programById.get(balance.programId);
		if (source === undefined) {
			continue;
		}
		if (source.currencyId === currencyId) {
			current += balance.points;
			continue;
		}
		const route = bestRoute(balance.points, source.id, targets, rules, at);
		if (route === undefined) {
			continue;
		}
		fromTransfers += route.points;
		routes.push(route);
	}

	return {
		currencyId,
		current,
		fromTransfers,
		total: current + fromTransfers,
		routes,
	};
}

/**
 * Gives the route that sends the largest quantity of points to the currency.
 *
 * The result is undefined when no route gives more than 0. Two routes with the
 * same result keep the first programme of the catalogue.
 */
function bestRoute(
	points: number,
	fromProgramId: string,
	targets: readonly Program[],
	rules: readonly TransferRule[],
	at: IsoDate,
): BestRoute | undefined {
	let best: BestRoute | undefined;
	for (const target of targets) {
		const rule = findRule(rules, fromProgramId, target.id, at);
		if (rule === undefined) {
			continue;
		}
		const converted = convert(points, rule);
		if (converted > 0 && (best === undefined || converted > best.points)) {
			best = { fromProgramId, toProgramId: target.id, points: converted };
		}
	}
	return best;
}
