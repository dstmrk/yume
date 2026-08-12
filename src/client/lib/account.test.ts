import { describe, expect, it } from "vitest";
import type { Program } from "../../shared/catalogue.ts";
import { sortPrograms, toCreateAccountBody } from "./account.ts";

function program(id: string, name: string, currencyId = "avios"): Program {
	return { id, currencyId, code: id.toUpperCase(), name, transferable: true };
}

describe("sortPrograms", () => {
	it("puts the names in the order of the alphabet", () => {
		const result = sortPrograms([
			program("iberia-club", "Iberia"),
			program("aegean", "Aegean"),
			program("ba-club", "British Airways"),
		]);
		expect(result.map((row) => row.name)).toEqual([
			"Aegean",
			"British Airways",
			"Iberia",
		]);
	});

	// The default comparison of JavaScript reads the numbers of the characters.
	// With that comparison a capital letter comes before each small letter, and
	// "TAP" arrives before "Turkish" but also before "iberia". The user reads the
	// names in the order of a dictionary.
	it("does not put the capital letters first", () => {
		const result = sortPrograms([
			program("emirates", "emirates"),
			program("tap", "TAP"),
		]);
		expect(result.map((row) => row.name)).toEqual(["emirates", "TAP"]);
	});

	it("reads a letter with an accent as the letter", () => {
		const result = sortPrograms([
			program("z", "Zurigo"),
			program("a", "Ãgean"),
			program("b", "Berlino"),
		]);
		expect(result.map((row) => row.name)).toEqual([
			"Ãgean",
			"Berlino",
			"Zurigo",
		]);
	});

	it("does not change the list of the caller", () => {
		const programs = [program("b", "Bravo"), program("a", "Alfa")];
		sortPrograms(programs);
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
