import { describe, expect, it } from "vitest";
import { currencies, programs } from "../../server/db/seed/catalogue.ts";
import {
	airlinesOf,
	airlinesSummary,
	currencyAirlines,
	PROGRAM_AIRLINES,
} from "./airlines.ts";

const airlineCurrencies = new Set(
	currencies
		.filter((currency) => currency.kind === "airline")
		.map((currency) => currency.id),
);
const airlinePrograms = programs.filter((program) =>
	airlineCurrencies.has(program.currencyId),
);

describe("PROGRAM_AIRLINES", () => {
	it("holds the airline programmes of the catalogue, in its order", () => {
		expect(Object.keys(PROGRAM_AIRLINES)).toEqual(
			airlinePrograms.map((program) => program.id),
		);
	});

	it("gives at least one airline to each programme", () => {
		for (const names of Object.values(PROGRAM_AIRLINES)) {
			expect(names.length).toBeGreaterThan(0);
		}
	});

	// One airline credits one account. A name in two lists sends the search
	// of the user to two accounts.
	it("gives each airline to one programme only", () => {
		const names = Object.values(PROGRAM_AIRLINES).flat();
		expect(new Set(names).size).toBe(names.length);
	});

	it("gives the seven airlines of Miles & More", () => {
		expect(PROGRAM_AIRLINES["miles-and-more"]).toEqual([
			"ITA Airways",
			"Lufthansa",
			"SWISS",
			"Austrian",
			"Brussels Airlines",
			"Air Dolomiti",
			"Eurowings",
		]);
	});
});

describe("airlinesOf", () => {
	it("gives the airlines of a programme", () => {
		expect(airlinesOf("flying-blue")).toEqual([
			"Air France",
			"KLM",
			"Transavia",
		]);
	});

	// A source is a programme of points, not of an airline.
	it("gives an empty list for a source", () => {
		expect(airlinesOf("amex-mr")).toEqual([]);
	});

	it("gives an empty list for a key of the prototype", () => {
		expect(airlinesOf("toString")).toEqual([]);
		expect(airlinesOf("__proto__")).toEqual([]);
	});
});

describe("currencyAirlines", () => {
	it("gives the airlines of each programme of a currency", () => {
		expect(currencyAirlines(programs, "avios")).toEqual([
			"British Airways",
			"Iberia",
			"Aer Lingus",
			"Finnair",
			"Qatar Airways",
			"Vueling",
		]);
	});

	// The API gives the programmes in an other order. The line must keep the
	// order of this file: British Airways first, not Aer Lingus.
	it("keeps the order of the list, not the order of the programmes", () => {
		const reversed = [...programs].reverse();
		expect(currencyAirlines(reversed, "avios")[0]).toBe("British Airways");
	});

	it("gives the airline of a currency with one programme", () => {
		expect(currencyAirlines(programs, "eurobonus")).toEqual(["SAS"]);
	});

	it("gives an empty list for a source", () => {
		expect(currencyAirlines(programs, "amex-mr")).toEqual([]);
	});
});

describe("airlinesSummary", () => {
	it("shows all the names when they enter the line", () => {
		expect(airlinesSummary(["Air France", "KLM", "Transavia"], 40)).toEqual({
			shown: ["Air France", "KLM", "Transavia"],
			hidden: 0,
		});
	});

	// "British Airways, Iberia, Aer Lingus" has 35 characters. The next name
	// gives 44.
	it("stops before the name that goes past the limit", () => {
		expect(
			airlinesSummary(
				[
					"British Airways",
					"Iberia",
					"Aer Lingus",
					"Finnair",
					"Qatar",
					"Vueling",
				],
				40,
			),
		).toEqual({
			shown: ["British Airways", "Iberia", "Aer Lingus"],
			hidden: 3,
		});
	});

	// A line with no name tells nothing.
	it("shows the first name also when it is longer than the limit", () => {
		expect(
			airlinesSummary(["A very long name of an airline", "B"], 10),
		).toEqual({ shown: ["A very long name of an airline"], hidden: 1 });
	});

	it("gives an empty summary for an empty list", () => {
		expect(airlinesSummary([], 40)).toEqual({ shown: [], hidden: 0 });
	});
});
