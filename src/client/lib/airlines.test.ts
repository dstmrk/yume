import { describe, expect, it } from "vitest";
import { currencies, programs } from "../../server/db/seed/catalogue.ts";
import { airlinesOf, PROGRAM_AIRLINES } from "./airlines.ts";

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
			"Lufthansa",
			"SWISS",
			"Austrian",
			"Brussels Airlines",
			"Air Dolomiti",
			"Eurowings",
			"ITA Airways",
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
