/**
 * The public calculator: the potential miles of a quantity of points that a
 * visitor writes, with no account and no request to the server.
 *
 * The calculation is the calculation of the dashboard: `potentialMiles` of
 * `src/shared/potential.ts`, with the rules of the seed. The functions are pure.
 * Paragraph 5.5.6 of `docs/architecture.md` gives the rules of the page.
 */

import type { CountryCode, IsoDate } from "../../shared/catalogue.ts";
import { type BestRoute, potentialMiles } from "../../shared/potential.ts";
import { parsePoints } from "./balance.ts";
import type { Catalogue } from "./catalogue.ts";

/**
 * Reads the text of one field of the calculator.
 *
 * An empty field gives 0: the person does not hold that source. Each other text
 * passes `parsePoints`, thus the field reads the separator of the locale. The
 * result is null for a text that is not a quantity.
 */
export function readCalculatorPoints(
	input: string,
	intl: string,
): number | null {
	if (input.trim() === "") {
		return 0;
	}
	return parsePoints(input, intl);
}

export type CalculatorRow = {
	readonly currency: Catalogue["currencies"][number];
	readonly total: number;
	readonly routes: readonly BestRoute[];
};

/**
 * Gives the potential miles of each airline currency that the points reach,
 * from the largest value. Two equal values keep the sequence of the catalogue.
 *
 * `points` holds the quantity of each source, by the `id` of the programme. A
 * programme that is not a source gives nothing: the calculator holds no balance
 * of an airline programme.
 *
 * Each row is a maximum for one currency. The page must not add two rows: the
 * same points cannot go to two currencies.
 */
export function calculatorRows(input: {
	points: Readonly<Record<string, number>>;
	catalogue: Catalogue;
	country: CountryCode;
	at: IsoDate;
}): CalculatorRow[] {
	const { catalogue, country, at } = input;
	const kindOf = new Map(catalogue.currencies.map((c) => [c.id, c.kind]));
	const balances = catalogue.programs
		.filter(
			(program) =>
				kindOf.get(program.currencyId) !== "airline" &&
				(input.points[program.id] ?? 0) > 0,
		)
		.map((program) => ({
			programId: program.id,
			points: input.points[program.id] ?? 0,
		}));
	if (balances.length === 0) {
		return [];
	}

	const rows: CalculatorRow[] = [];
	for (const currency of catalogue.currencies) {
		if (currency.kind !== "airline") {
			continue;
		}
		const result = potentialMiles({
			currencyId: currency.id,
			balances,
			programs: catalogue.programs,
			rules: catalogue.rules,
			country,
			at,
		});
		if (result.total > 0) {
			rows.push({ currency, total: result.total, routes: result.routes });
		}
	}
	// `toSorted` is stable, thus two equal values keep the sequence above.
	return rows.toSorted((a, b) => b.total - a.total);
}

/**
 * Reads each field of the calculator. `typed` is true when one source holds
 * more than 0 points. A field with a text that is not a quantity goes in
 * `invalid`, and it gives no points.
 */
export function readCalculatorFields(
	fields: Readonly<Record<string, string>>,
	sourceIds: readonly string[],
	intl: string,
): { points: Record<string, number>; invalid: Set<string>; typed: boolean } {
	const points: Record<string, number> = {};
	const invalid = new Set<string>();
	for (const id of sourceIds) {
		const value = readCalculatorPoints(fields[id] ?? "", intl);
		if (value === null) {
			invalid.add(id);
		} else {
			points[id] = value;
		}
	}
	return {
		points,
		invalid,
		typed: Object.values(points).some((value) => value > 0),
	};
}
