import type { Program } from "../../shared/catalogue.ts";

/**
 * The airlines of each airline programme of the catalogue.
 *
 * A user knows the airline, not always the programme: a person who flies ITA
 * Airways looks for "ITA", and the account is Miles & More. Thus the search of
 * the new account reads these names. Paragraph 3.1 of `docs/architecture.md`
 * gives the three levels: the airline, the programme and the currency.
 *
 * The list holds the brands that a user in Italy knows. It holds no small
 * subsidiary, for example Discover Airlines or Edelweiss: each airline needs a
 * logo and a check of its licence. Add an airline when a user asks for it.
 *
 * The key is the `id` of the programme in `src/server/db/seed/catalogue.ts`,
 * in the order of the catalogue. A source has no entry: it is a programme of
 * points, not of an airline.
 */
export const PROGRAM_AIRLINES: Readonly<Record<string, readonly string[]>> = {
	"ba-club": ["British Airways"],
	"iberia-club": ["Iberia"],
	"flying-blue": ["Air France", "KLM", "Transavia"],
	sas: ["SAS"],
	cathay: ["Cathay Pacific"],
	delta: ["Delta"],
	singapore: ["Singapore Airlines"],
	"aer-lingus": ["Aer Lingus"],
	finnair: ["Finnair"],
	qatar: ["Qatar Airways"],
	vueling: ["Vueling"],
	emirates: ["Emirates"],
	turkish: ["Turkish Airlines"],
	aegean: ["Aegean"],
	avianca: ["Avianca"],
	"china-southern": ["China Southern"],
	etihad: ["Etihad"],
	icelandair: ["Icelandair"],
	tap: ["TAP Air Portugal"],
	united: ["United"],
	thai: ["Thai Airways"],
	// ITA Airways comes first: the catalogue is for Italy, and the card shows the
	// first names only.
	"miles-and-more": [
		"ITA Airways",
		"Lufthansa",
		"SWISS",
		"Austrian",
		"Brussels Airlines",
		"Air Dolomiti",
		"Eurowings",
	],
	"korean-air": ["Korean Air"],
	ana: ["ANA"],
	jal: ["Japan Airlines"],
	qantas: ["Qantas"],
};

/** The airlines of one programme. A source gives an empty list. */
export function airlinesOf(programId: string): readonly string[] {
	return Object.hasOwn(PROGRAM_AIRLINES, programId)
		? (PROGRAM_AIRLINES[programId] ?? [])
		: [];
}

/**
 * The airlines of a currency: the airlines of each programme of that currency,
 * in the order of this file. The card of a currency shows them under its name,
 * thus a user who reads "EuroBonus" also reads "SAS".
 *
 * The order comes from this file and not from `programs`: the API gives the
 * programmes in the order of the alphabet, and Aer Lingus then comes before
 * British Airways.
 */
export function currencyAirlines(
	programs: readonly Program[],
	currencyId: string,
): string[] {
	const ofCurrency = new Set(
		programs
			.filter((program) => program.currencyId === currencyId)
			.map((program) => program.id),
	);
	return Object.entries(PROGRAM_AIRLINES)
		.filter(([programId]) => ofCurrency.has(programId))
		.flatMap(([, names]) => names);
}

/**
 * Divides the names of the airlines into the names of the line and the
 * quantity of the other names.
 *
 * The line holds the names while the text, with ", " between two names, stays
 * at `maxLength` characters or less. The card then shows "+3" for the other
 * names. The line always holds the first name: a line with no name tells
 * nothing.
 */
export function airlinesSummary(
	names: readonly string[],
	maxLength: number,
): { shown: string[]; hidden: number } {
	const shown: string[] = [];
	let length = 0;
	for (const name of names) {
		const next = shown.length === 0 ? name.length : length + 2 + name.length;
		if (shown.length > 0 && next > maxLength) {
			break;
		}
		shown.push(name);
		length = next;
	}
	return { shown, hidden: names.length - shown.length };
}
