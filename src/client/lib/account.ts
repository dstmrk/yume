import {
	type CreateAccountInput,
	TOO_MANY_ACCOUNTS,
} from "../../shared/api.ts";
import type {
	CountryCode,
	Currency,
	Program,
	TransferRule,
} from "../../shared/catalogue.ts";
import { airlinesOf } from "./airlines.ts";
import { todayIso } from "./balance.ts";
import { ApiError } from "./errors.ts";

/**
 * The comparison of the names, in the order of the dictionary of the language.
 *
 * The default comparison of JavaScript reads the numbers of the characters.
 * With that comparison each capital letter comes before each small letter, and
 * a letter with an accent comes after `z`. The catalogue holds 30
 * programmes, thus the list needs the order of a dictionary.
 */
const collators = new Map<string, Intl.Collator>();

function collatorOf(intl: string): Intl.Collator {
	let collator = collators.get(intl);
	if (collator === undefined) {
		collator = new Intl.Collator(intl);
		collators.set(intl, collator);
	}
	return collator;
}

/**
 * Gives a new list of the programmes. Each source comes first, then the order
 * of the alphabet.
 *
 * A source is a programme of a currency with the kind `flexible`: Amex
 * Membership Rewards, Revolut RevPoints and Klarna Cashback. The potential of a currency grows
 * only with a source. Refer to paragraph 3.5 of `docs/architecture.md`.
 * Therefore a user who adds only airline programmes reads a potential that is
 * equal to each balance. The three sources are in the middle of 30 names in
 * the order of the alphabet, thus this function moves them to the top.
 */
export function sortPrograms(
	programs: readonly Program[],
	currencies: readonly Currency[],
	intl: string,
): Program[] {
	const sources = new Set(
		currencies
			.filter((currency) => currency.kind === "flexible")
			.map((currency) => currency.id),
	);
	const rank = (program: Program) => (sources.has(program.currencyId) ? 0 : 1);
	const byName = collatorOf(intl);
	return [...programs].sort(
		(a, b) => rank(a) - rank(b) || byName.compare(a.name, b.name),
	);
}

/**
 * Gives the programmes of the list of the country of the user.
 *
 * A source with no active rule in that country gives no potential: Klarna
 * converts no cashback for a user of a country with no Klarna rule. The list
 * then does not show that source. Each programme that is not a source stays,
 * because it holds a balance with no rule. Paragraph 4 of the skill
 * `catalogue-discovery` gives the rule.
 *
 * With no country, before the choice or while `GET /api/me` loads, the list
 * shows each programme.
 */
export function programsOfCountry(
	programs: readonly Program[],
	currencies: readonly Currency[],
	rules: readonly TransferRule[],
	country: CountryCode | null,
): Program[] {
	if (country === null) {
		return [...programs];
	}
	const sources = new Set(
		currencies
			.filter((currency) => currency.kind === "flexible")
			.map((currency) => currency.id),
	);
	const active = new Set(
		rules
			.filter((rule) => rule.country === country && rule.validTo === null)
			.map((rule) => rule.fromProgramId),
	);
	return programs.filter(
		(program) => !sources.has(program.currencyId) || active.has(program.id),
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

/**
 * True when the server refuses the account because the user holds the maximum
 * quantity of accounts. The form then shows its own message, not the general
 * message of an error.
 */
export function isTooManyAccounts(error: unknown): boolean {
	return error instanceof ApiError && error.code === TOO_MANY_ACCOUNTS;
}

/**
 * Gives the body of `POST /api/accounts` from the fields of the form.
 *
 * A balance of null is an empty field: the body holds no snapshot. The date of
 * the snapshot comes from the clock of the user, because Italy is in front of
 * UTC. Refer to `todayIso`.
 */
export function newAccountBody(
	programId: string,
	balance: number | null,
	now: Date,
): CreateAccountInput {
	if (balance === null) {
		return { programId };
	}
	return {
		programId,
		snapshot: { points: balance, observedAt: todayIso(now) },
	};
}
