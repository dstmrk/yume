import type { Currency, Program } from "../../shared/catalogue.ts";
import { airlinesOf } from "./airlines.ts";

/**
 * The comparison of the names, for Italy.
 *
 * The default comparison of JavaScript reads the numbers of the characters.
 * With that comparison each capital letter comes before each small letter, and
 * a letter with an accent comes after `z`. The catalogue holds 29
 * programmes, thus the list needs the order of a dictionary.
 */
const byName = new Intl.Collator("it-IT");

/**
 * Gives a new list of the programmes. Each source comes first, then the order
 * of the alphabet.
 *
 * A source is a programme of a currency with the kind `flexible`: Amex
 * Membership Rewards, Revolut RevPoints and Klarna Cashback. The potential of a currency grows
 * only with a source. Refer to paragraph 3.5 of `docs/architecture.md`.
 * Therefore a user who adds only airline programmes reads a potential that is
 * equal to each balance. The three sources are in the middle of 29 names in
 * the order of the alphabet, thus this function moves them to the top.
 */
export function sortPrograms(
	programs: readonly Program[],
	currencies: readonly Currency[],
): Program[] {
	const sources = new Set(
		currencies
			.filter((currency) => currency.kind === "flexible")
			.map((currency) => currency.id),
	);
	const rank = (program: Program) => (sources.has(program.currencyId) ? 0 : 1);
	return [...programs].sort(
		(a, b) => rank(a) - rank(b) || byName.compare(a.name, b.name),
	);
}

/**
 * Gives a text of words in small letters, with no accent and no symbol.
 *
 * A space starts the text, thus `" " + search` finds the start of a word.
 */
function words(value: string): string {
	return ` ${value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim()}`;
}

/**
 * Tells if a programme matches the search of the user.
 *
 * The search reads each name of the programme: its own name, the names of its
 * airlines and the name of its currency. A user who flies ITA Airways writes
 * "ITA", and the account is Miles & More. A user who reads EuroBonus on a card
 * writes "EuroBonus", and the account is SAS.
 *
 * The text must start a word. A match inside a word, for example "ita" in
 * "British", fills the list with noise.
 */
export function matchesProgram(
	search: string,
	names: readonly string[],
): boolean {
	const wanted = words(search);
	if (wanted === " ") {
		return true;
	}
	return names.some((name) => words(name).includes(wanted));
}

/**
 * Gives the line of the airlines under the name of a programme in the list.
 *
 * A programme with one airline shows no line: the name is sufficient. The
 * line shows the user why "ITA" gives Miles & More.
 */
export function programAirlinesLine(
	airlines: readonly string[],
): string | null {
	return airlines.length > 1 ? airlines.join(", ") : null;
}

/**
 * Gives the names that the search reads for each programme: its own name, the
 * names of its airlines and the name of its currency. Refer to
 * `matchesProgram`.
 */
export function searchNamesOf(
	programs: readonly Program[],
	currencies: readonly Currency[],
): Map<string, string[]> {
	const currencyNames = new Map(
		currencies.map((currency) => [currency.id, currency.name]),
	);
	return new Map(
		programs.map((program) => {
			const currency = currencyNames.get(program.currencyId);
			return [
				program.id,
				[
					program.name,
					...airlinesOf(program.id),
					...(currency === undefined ? [] : [currency]),
				],
			];
		}),
	);
}
