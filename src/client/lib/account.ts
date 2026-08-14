import type { CreateAccountInput } from "../../shared/api.ts";
import type { Currency, Program } from "../../shared/catalogue.ts";

/**
 * The comparison of the names, for Italy.
 *
 * The default comparison of JavaScript reads the numbers of the characters.
 * With that comparison each capital letter comes before each small letter, and
 * a letter with an accent comes after `z`. The catalogue holds 22
 * programmes, thus the list needs the order of a dictionary.
 */
const byName = new Intl.Collator("it-IT");

/**
 * Gives a new list of the programmes. Each source comes first, then the order
 * of the alphabet.
 *
 * A source is a programme of a currency with the kind `flexible`: Amex
 * Membership Rewards and Revolut RevPoints. The potential of a currency grows
 * only with a source. Refer to paragraph 3.5 of `docs/architecture.md`.
 * Therefore a user who adds only airline programmes reads a potential that is
 * equal to each balance. The two sources are in the middle of 22 names in the
 * order of the alphabet, thus this function moves them to the top.
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
 * Makes the body of the request from the fields of the form.
 *
 * The nickname and the reference of the membership are not necessary. The
 * schema of the API asks for one character or for null. A form writes an empty
 * string, and that value gives the status 400. Therefore an empty field becomes
 * null here.
 */
export function toCreateAccountBody(fields: {
	programId: string;
	nickname: string;
	membershipRef: string;
}): CreateAccountInput {
	return {
		programId: fields.programId,
		nickname: fields.nickname.trim() || null,
		membershipRef: fields.membershipRef.trim() || null,
	};
}
