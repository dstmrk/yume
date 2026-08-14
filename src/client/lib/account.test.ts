import { describe, expect, it } from "vitest";
import type { Currency, Program } from "../../shared/catalogue.ts";
import { sortPrograms, toCreateAccountBody } from "./account.ts";

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

describe("toCreateAccountBody", () => {
	it("keeps a nickname and a reference of the membership", () => {
		expect(
			toCreateAccountBody({
				programId: "ba-club",
				nickname: "Principale",
				membershipRef: "12345",
			}),
		).toEqual({
			programId: "ba-club",
			nickname: "Principale",
			membershipRef: "12345",
		});
	});

	// The two fields are not necessary. The schema of the API asks for one
	// character or for null, thus an empty field gives the status 400. The form
	// writes an empty string, therefore this function makes it null.
	it("makes an empty field null", () => {
		expect(
			toCreateAccountBody({
				programId: "ba-club",
				nickname: "",
				membershipRef: "",
			}),
		).toEqual({ programId: "ba-club", nickname: null, membershipRef: null });
	});

	it("makes a field of spaces only null", () => {
		expect(
			toCreateAccountBody({
				programId: "ba-club",
				nickname: "   ",
				membershipRef: "\t",
			}),
		).toEqual({ programId: "ba-club", nickname: null, membershipRef: null });
	});

	it("removes the spaces at the two ends of a field", () => {
		expect(
			toCreateAccountBody({
				programId: "ba-club",
				nickname: "  Principale  ",
				membershipRef: " 12345 ",
			}),
		).toEqual({
			programId: "ba-club",
			nickname: "Principale",
			membershipRef: "12345",
		});
	});
});
