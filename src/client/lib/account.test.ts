import { describe, expect, it } from "vitest";
import type { Currency, Program } from "../../shared/catalogue.ts";
import {
	matchesProgram,
	programAirlinesLine,
	searchNamesOf,
	sortPrograms,
} from "./account.ts";

function program(id: string, name: string, currencyId = "avios"): Program {
	return { id, currencyId, code: id.toUpperCase(), name, transferable: true };
}

/** The currencies of the tests. Only `mr` is a source. */
const currencies: Currency[] = [
	{ id: "avios", code: "AVIOS", name: "Avios", kind: "airline" },
	{ id: "mr", code: "MR", name: "Membership Rewards", kind: "flexible" },
];

describe("sortPrograms", () => {
	it("puts the names in the order of the alphabet", () => {
		const result = sortPrograms(
			[
				program("iberia-club", "Iberia"),
				program("aegean", "Aegean"),
				program("ba-club", "British Airways"),
			],
			currencies,
		);
		expect(result.map((row) => row.name)).toEqual([
			"Aegean",
			"British Airways",
			"Iberia",
		]);
	});

	// A source is a programme of a currency with the kind `flexible`. The
	// potential of a currency grows only with a source. A user who adds only
	// airline programmes reads a potential that is equal to each balance.
	it("puts each source before each other programme", () => {
		const result = sortPrograms(
			[
				program("aegean", "Aegean"),
				program("amex-mr", "Amex Membership Rewards", "mr"),
				program("ba-club", "British Airways"),
			],
			currencies,
		);
		expect(result.map((row) => row.name)).toEqual([
			"Amex Membership Rewards",
			"Aegean",
			"British Airways",
		]);
	});

	it("puts the sources in the order of the alphabet", () => {
		const result = sortPrograms(
			[
				program("revolut", "Revolut RevPoints", "mr"),
				program("amex-mr", "Amex Membership Rewards", "mr"),
			],
			currencies,
		);
		expect(result.map((row) => row.name)).toEqual([
			"Amex Membership Rewards",
			"Revolut RevPoints",
		]);
	});

	// A programme of a currency that the list of the currencies does not hold is
	// not a source. Then a catalogue that is not complete moves no programme to
	// the top.
	it("reads a currency that it does not find as no source", () => {
		const result = sortPrograms(
			[program("aegean", "Aegean"), program("other", "Altro", "unknown")],
			currencies,
		);
		expect(result.map((row) => row.name)).toEqual(["Aegean", "Altro"]);
	});

	// The default comparison of JavaScript reads the numbers of the characters.
	// With that comparison a capital letter comes before each small letter, and
	// "TAP" arrives before "Turkish" but also before "iberia". The user reads the
	// names in the order of a dictionary.
	it("does not put the capital letters first", () => {
		const result = sortPrograms(
			[program("emirates", "emirates"), program("tap", "TAP")],
			currencies,
		);
		expect(result.map((row) => row.name)).toEqual(["emirates", "TAP"]);
	});

	it("reads a letter with an accent as the letter", () => {
		const result = sortPrograms(
			[program("z", "Zurigo"), program("a", "Ãgean"), program("b", "Berlino")],
			currencies,
		);
		expect(result.map((row) => row.name)).toEqual([
			"Ãgean",
			"Berlino",
			"Zurigo",
		]);
	});

	it("does not change the list of the caller", () => {
		const programs = [program("b", "Bravo"), program("a", "Alfa")];
		sortPrograms(programs, currencies);
		expect(programs.map((row) => row.name)).toEqual(["Bravo", "Alfa"]);
	});
});

describe("matchesProgram", () => {
	const mm = ["Miles & More", "Lufthansa", "ITA Airways"];

	it("accepts each programme for an empty search", () => {
		expect(matchesProgram("", mm)).toBe(true);
		expect(matchesProgram("   ", mm)).toBe(true);
	});

	it("finds a programme by the start of its name", () => {
		expect(matchesProgram("miles", mm)).toBe(true);
	});

	it("finds a programme by the start of a word of its name", () => {
		expect(matchesProgram("more", mm)).toBe(true);
	});

	// The user writes "ITA" and the account is Miles & More.
	it("finds a programme by one of its airlines", () => {
		expect(matchesProgram("ita", mm)).toBe(true);
		expect(matchesProgram("lufth", mm)).toBe(true);
	});

	// The card shows the currency, thus the user can write its name.
	it("finds a programme by the name of its currency", () => {
		expect(matchesProgram("eurobonus", ["SAS", "EuroBonus"])).toBe(true);
	});

	it("ignores the case and the spaces at the ends", () => {
		expect(matchesProgram("  ITA ", mm)).toBe(true);
	});

	// "ita" is inside "British". A match inside a word gives a list of noise.
	it("does not find a text in the middle of a word", () => {
		const ba = ["British Airways", "Avios"];
		expect(matchesProgram("ita", ba)).toBe(false);
	});

	it("reads a symbol as a space", () => {
		const turkish = ["Turkish", "Miles&Smiles"];
		expect(matchesProgram("smiles", turkish)).toBe(true);
		expect(matchesProgram("miles more", mm)).toBe(true);
	});

	it("finds two words in sequence", () => {
		const af = ["Flying Blue", "Air France", "KLM"];
		expect(matchesProgram("air fr", af)).toBe(true);
		expect(matchesProgram("air klm", af)).toBe(false);
	});

	it("ignores an accent", () => {
		const accent = ["Crédit"];
		expect(matchesProgram("credit", accent)).toBe(true);
	});
});

describe("programAirlinesLine", () => {
	it("gives no line for a programme with one airline", () => {
		expect(programAirlinesLine(["Delta"])).toBeNull();
	});

	it("gives no line for a source", () => {
		expect(programAirlinesLine([])).toBeNull();
	});

	// The line tells the user that "ITA" is inside Miles & More.
	it("gives the airlines of a programme with more than one airline", () => {
		expect(programAirlinesLine(["Air France", "KLM", "Transavia"])).toBe(
			"Air France, KLM, Transavia",
		);
	});
});

describe("searchNamesOf", () => {
	it("gives the name, the airlines and the currency of a programme", () => {
		const names = searchNamesOf(
			[program("miles-and-more", "Miles & More", "mm")],
			[{ id: "mm", code: "MM", name: "Miles & More", kind: "airline" }],
		);
		expect(names.get("miles-and-more")).toEqual([
			"Miles & More",
			"ITA Airways",
			"Lufthansa",
			"SWISS",
			"Austrian",
			"Brussels Airlines",
			"Air Dolomiti",
			"Eurowings",
			"Miles & More",
		]);
	});

	it("gives the name and the currency of a source", () => {
		const names = searchNamesOf([program("amex-mr", "Amex", "mr")], currencies);
		expect(names.get("amex-mr")).toEqual(["Amex", "Membership Rewards"]);
	});

	// A currency that the catalogue does not hold adds no name.
	it("gives only the name when the currency is not in the list", () => {
		const names = searchNamesOf([program("x", "X", "unknown")], currencies);
		expect(names.get("x")).toEqual(["X"]);
	});
});
