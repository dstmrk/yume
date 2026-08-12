import type { CreateAccountInput } from "../../shared/api.ts";
import type { Program } from "../../shared/catalogue.ts";

/**
 * The comparison of the names, for Italy.
 *
 * The default comparison of JavaScript reads the numbers of the characters.
 * With that comparison each capital letter comes before each small letter, and
 * a letter with an accent comes after `z`. The catalogue grows to 19
 * programmes, thus the list needs the order of a dictionary.
 */
const byName = new Intl.Collator("it-IT");

/** Gives a new list of the programmes, in the order of the alphabet. */
export function sortPrograms(programs: readonly Program[]): Program[] {
	return [...programs].sort((a, b) => byName.compare(a.name, b.name));
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
