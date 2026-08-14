/**
 * The calculation of the potential miles of a currency.
 *
 * This function is pure. It does no I/O and it does not read the clock.
 * The caller gives the catalogue, the balances and the date as parameters.
 */

import type {
	AccountBalance,
	CountryCode,
	IsoDate,
	Program,
	TransferRule,
} from "./catalogue.ts";
import { convert, findRule } from "./conversion.ts";

/** One programme of the target currency, with the result of that route. */
export type RouteOption = {
	readonly toProgramId: string;
	/** The points that arrive. It is 0 when the balance is below the minimum. */
	readonly points: number;
};

/** The best route from one source account to the target currency. */
export type BestRoute = {
	readonly fromProgramId: string;
	/** The programme of the target currency that gives the largest result. */
	readonly toProgramId: string;
	/** The points that arrive in the target currency. It is more than 0. */
	readonly points: number;
	/**
	 * Each programme of the currency that has a rule from this source, with the
	 * result of that programme. The list holds the best route too.
	 *
	 * The card shows this list, because it names no programme. Two programmes of
	 * one currency can give the same result, and then the name of one programme
	 * is a choice without a reason. The list also shows a route that gives 0, and
	 * a transfer of points is permanent.
	 */
	readonly options: readonly RouteOption[];
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
 * It uses the rules of the country `country` only. A rule of an other country
 * gives an other ratio.
 *
 * The result is a maximum for one currency. The user cannot send the same
 * points to two currencies. Do not add the results of two currencies.
 */
export function potentialMiles(input: {
	currencyId: string;
	balances: readonly AccountBalance[];
	programs: readonly Program[];
	rules: readonly TransferRule[];
	country: CountryCode;
	at: IsoDate;
}): PotentialMiles {
	const { currencyId, balances, programs, rules, country, at } = input;
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
		const route = bestRoute(
			balance.points,
			source.id,
			targets,
			rules,
			country,
			at,
		);
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
 * The result is undefined when no route gives more than 0.
 *
 * Two routes to the same currency can give the same result. Amex sends 2 000
 * points to The British Airways Club or to Iberia Club, and both routes give
 * 1 600 Avios. The choice then falls on the route with the smallest minimum:
 * that route also operates with a balance that is smaller. Two routes with the
 * same minimum keep the first programme of the catalogue.
 */
function bestRoute(
	points: number,
	fromProgramId: string,
	targets: readonly Program[],
	rules: readonly TransferRule[],
	country: CountryCode,
	at: IsoDate,
): BestRoute | undefined {
	const options: RouteOption[] = [];
	let toProgramId: string | undefined;
	let bestPoints = 0;
	let bestMinTransfer = 0;

	for (const target of targets) {
		const rule = findRule(rules, fromProgramId, target.id, country, at);
		if (rule === undefined) {
			continue;
		}
		const converted = convert(points, rule);
		options.push({ toProgramId: target.id, points: converted });
		if (converted === 0) {
			continue;
		}
		const better =
			toProgramId === undefined ||
			converted > bestPoints ||
			(converted === bestPoints && rule.minTransfer < bestMinTransfer);
		if (better) {
			toProgramId = target.id;
			bestPoints = converted;
			bestMinTransfer = rule.minTransfer;
		}
	}

	if (toProgramId === undefined) {
		return undefined;
	}
	return { fromProgramId, toProgramId, points: bestPoints, options };
}
