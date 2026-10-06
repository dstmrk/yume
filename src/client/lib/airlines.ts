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
	"miles-and-more": [
		"Lufthansa",
		"SWISS",
		"Austrian",
		"Brussels Airlines",
		"Air Dolomiti",
		"Eurowings",
		"ITA Airways",
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
