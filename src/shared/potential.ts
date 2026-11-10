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

/** The best route from one source programme to the target currency. */
export type BestRoute = {
	readonly fromProgramId: string;
	/**
	 * The points that arrive in the target currency. It is the sum of the best
	 * result of each account of the source. It is more than 0.
	 */
	readonly points: number;
	/**
	 * Each programme of the currency that has a rule from this source, with the
	 * sum of the results of the accounts in that programme.
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
	 * The route of each source programme that gives more than 0, in the sequence
	 * of the first account of each programme. The card of the currency
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
 * 2. It selects the best result for each source account. One currency can
 *    have more than one programme, and each route has its own minimum and step.
 * 3. It calculates each source account alone. The minimum applies to one
 *    account. Then it adds the results of the accounts of one programme into
 *    one route.
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
	const bySource = new Map<
		string,
		{ points: number; options: Map<string, number> }
	>();

	for (const balance of balances) {
		const source = programById.get(balance.programId);
		if (source === undefined) {
			continue;
		}
		if (source.currencyId === currencyId) {
			current += balance.points;
			continue;
		}
		const options = routeOptions(
			balance.points,
			source.id,
			targets,
			rules,
			country,
			at,
		);
		if (options.length === 0) {
			continue;
		}
		let group = bySource.get(source.id);
		if (group === undefined) {
			group = { points: 0, options: new Map() };
			bySource.set(source.id, group);
		}
		group.points += Math.max(...options.map((option) => option.points));
		for (const option of options) {
			group.options.set(
				option.toProgramId,
				(group.options.get(option.toProgramId) ?? 0) + option.points,
			);
		}
	}

	const routes: BestRoute[] = [];
	let fromTransfers = 0;
	for (const [fromProgramId, group] of bySource) {
		if (group.points === 0) {
			continue;
		}
		fromTransfers += group.points;
		routes.push({
			fromProgramId,
			points: group.points,
			options: [...group.options].map(([toProgramId, points]) => ({
				toProgramId,
				points,
			})),
		});
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
 * Gives the result of one source account in each programme of the currency
 * that has a rule from the source. A result is 0 when the balance is below the
 * minimum of that rule.
 */
function routeOptions(
	points: number,
	fromProgramId: string,
	targets: readonly Program[],
	rules: readonly TransferRule[],
	country: CountryCode,
	at: IsoDate,
): RouteOption[] {
	const options: RouteOption[] = [];
	for (const target of targets) {
		const rule = findRule(rules, fromProgramId, target.id, country, at);
		if (rule !== undefined) {
			options.push({ toProgramId: target.id, points: convert(points, rule) });
		}
	}
	return options;
}
