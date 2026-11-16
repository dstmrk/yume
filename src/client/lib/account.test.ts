import { describe, expect, it } from "vitest";
import {
	currencies as seedCurrencies,
	programs as seedPrograms,
	transferRules as seedRules,
} from "../../server/db/seed/catalogue.ts";
import type {
	Currency,
	Program,
	TransferRule,
} from "../../shared/catalogue.ts";
import { COUNTRIES } from "../../shared/catalogue.ts";
import {
	isTooManyAccounts,
	matchesProgram,
	newAccountBody,
	programAirlinesLine,
	programsOfCountry,
	searchNamesOf,
	sortPrograms,
} from "./account.ts";
import { ApiError } from "./errors.ts";

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
			"it-IT",
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
			"it-IT",
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
			"it-IT",
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
			"it-IT",
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
			"it-IT",
		);
		expect(result.map((row) => row.name)).toEqual(["emirates", "TAP"]);
	});

	it("reads a letter with an accent as the letter", () => {
		const result = sortPrograms(
			[program("z", "Zurigo"), program("a", "Ãgean"), program("b", "Berlino")],
			currencies,
			"it-IT",
		);
		expect(result.map((row) => row.name)).toEqual([
			"Ãgean",
			"Berlino",
			"Zurigo",
		]);
	});

	it("does not change the list of the caller", () => {
		const programs = [program("b", "Bravo"), program("a", "Alfa")];
		sortPrograms(programs, currencies, "it-IT");
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

describe("isTooManyAccounts", () => {
	it("is true for the error of the ceiling of the accounts", () => {
		expect(
			isTooManyAccounts(
				new ApiError("/api/accounts", 409, "too_many_accounts"),
			),
		).toBe(true);
	});

	// The status alone is not sufficient: an other conflict must show the
	// general message.
	it("is false for an other code with the same status", () => {
		expect(
			isTooManyAccounts(new ApiError("/api/accounts", 409, "other_conflict")),
		).toBe(false);
	});

	it("is false for an error of the network", () => {
		expect(isTooManyAccounts(new TypeError("Failed to fetch"))).toBe(false);
	});

	it("is false with no error", () => {
		expect(isTooManyAccounts(null)).toBe(false);
	});
});

describe("newAccountBody", () => {
	// 23:30 of 9 November in the time zone of the test machine.
	const now = new Date(2026, 10, 9, 23, 30);

	it("gives the account with its first balance, at the date of the user", () => {
		expect(newAccountBody("amex-mr", 10000, now)).toEqual({
			programId: "amex-mr",
			snapshot: { points: 10000, observedAt: "2026-11-09" },
		});
	});

	it("gives no snapshot with an empty field", () => {
		expect(newAccountBody("amex-mr", null, now)).toEqual({
			programId: "amex-mr",
		});
	});

	// A balance of 0 is a value of the user, not an empty field.
	it("gives a snapshot of 0 points", () => {
		expect(newAccountBody("amex-mr", 0, now).snapshot?.points).toBe(0);
	});
});

function rule(
	fromProgramId: string,
	country: string,
	validTo: string | null = null,
): TransferRule {
	return {
		fromProgramId,
		toProgramId: "ba-club",
		country,
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: "2026-01-01",
		validTo,
	};
}

describe("programsOfCountry", () => {
	const amex = program("amex-mr", "Amex", "mr");
	const klarna = program("klarna", "Klarna", "mr");
	const ba = program("ba-club", "British Airways");

	// Paragraph 4 of the skill `catalogue-discovery`: a source with no rule in
	// the country of the user gives no potential, thus the list does not show it.
	it("removes a source with no rule in the country of the user", () => {
		const result = programsOfCountry(
			[amex, klarna, ba],
			currencies,
			[rule("amex-mr", "ES"), rule("klarna", "IT")],
			"ES",
		);
		expect(result.map((row) => row.id)).toEqual(["amex-mr", "ba-club"]);
	});

	// An airline programme holds a balance with no source. The list keeps it in
	// each country.
	it("keeps each programme that is not a source", () => {
		const result = programsOfCountry([ba], currencies, [], "ES");
		expect(result.map((row) => row.id)).toEqual(["ba-club"]);
	});

	// A closed rule is historical data. It sends no point today.
	it("removes a source with only closed rules in the country", () => {
		const result = programsOfCountry(
			[klarna],
			currencies,
			[rule("klarna", "ES", "2026-06-01")],
			"ES",
		);
		expect(result).toEqual([]);
	});

	// The rule of the source must be from the source, not to it.
	it("does not count a rule to the source", () => {
		const toKlarna: TransferRule = {
			...rule("amex-mr", "ES"),
			toProgramId: "klarna",
		};
		const result = programsOfCountry([klarna], currencies, [toKlarna], "ES");
		expect(result).toEqual([]);
	});

	// Before the choice of the country, and while `GET /api/me` loads, the list
	// has no country to compare. It then shows each programme.
	// The owner asked for it (2026-11-16): each airline programme of the
	// catalogue is in the list of each country, also with no source there. A
	// person keeps a balance of a programme that no card reaches.
	it("keeps each airline programme of the catalogue in each country", () => {
		const airline = new Set(
			seedCurrencies.filter((c) => c.kind === "airline").map((c) => c.id),
		);
		const airlinePrograms = seedPrograms.filter((p) =>
			airline.has(p.currencyId),
		);
		for (const country of COUNTRIES) {
			const list = programsOfCountry(
				seedPrograms,
				seedCurrencies,
				seedRules,
				country,
			);
			for (const program of airlinePrograms) {
				expect(list, `${program.id} in ${country}`).toContainEqual(program);
			}
		}
	});

	it("keeps each programme with no country", () => {
		const result = programsOfCountry([amex, klarna, ba], currencies, [], null);
		expect(result.map((row) => row.id)).toEqual([
			"amex-mr",
			"klarna",
			"ba-club",
		]);
	});
});
