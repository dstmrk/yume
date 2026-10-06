import { describe, expect, it } from "vitest";
import { programs } from "../../server/db/seed/catalogue.ts";
import { airlinesOf, PROGRAM_AIRLINES } from "./airlines.ts";
import {
	AIRLINE_LOGOS,
	catalogueLogos,
	logoOf,
	PROGRAM_LOGOS,
} from "./logos.ts";

describe("PROGRAM_LOGOS", () => {
	it("holds one logo for each programme of the catalogue", () => {
		expect(Object.keys(PROGRAM_LOGOS).sort()).toEqual(
			programs.map((program) => program.id).sort(),
		);
	});

	it("keeps the order of the catalogue", () => {
		expect(Object.keys(PROGRAM_LOGOS)).toEqual(
			programs.map((program) => program.id),
		);
	});

	it("gives a path that starts with a move", () => {
		for (const logo of Object.values(PROGRAM_LOGOS)) {
			expect(logo.path).toMatch(/^M/);
		}
	});
});

describe("logoOf", () => {
	it("gives the logo of a programme", () => {
		expect(logoOf("amex-mr")?.title).toBe("American Express");
	});

	it("gives null for a programme that is not in the list", () => {
		expect(logoOf("unknown")).toBeNull();
	});

	// A key of `Object.prototype` is not a programme.
	it("gives null for a key of the prototype", () => {
		expect(logoOf("toString")).toBeNull();
		expect(logoOf("__proto__")).toBeNull();
	});
});

/** The airlines of a programme with more than one airline. */
const sharedAirlines = Object.values(PROGRAM_AIRLINES)
	.filter((names) => names.length > 1)
	.flat();

describe("AIRLINE_LOGOS", () => {
	// A programme with one airline shows the logo of the programme. Only the
	// airlines of Miles & More and Flying Blue need a logo of their own.
	it("holds one logo for each airline of a programme with more airlines", () => {
		expect(Object.keys(AIRLINE_LOGOS).sort()).toEqual(
			[...sharedAirlines].sort(),
		);
	});

	it("gives a path that starts with a move", () => {
		for (const logo of Object.values(AIRLINE_LOGOS)) {
			expect(logo.path).toMatch(/^M/);
		}
	});
});

describe("catalogueLogos", () => {
	const items = catalogueLogos();
	const titles = items.map((item) => item.logo.title);

	it("gives the sources first", () => {
		expect(titles.slice(0, 3)).toEqual([
			"American Express",
			"Revolut",
			"Klarna",
		]);
	});

	// The visitor looks for the airline. Miles & More is the account, ITA
	// Airways is the brand.
	it("gives the airlines of Miles & More and not the programme", () => {
		expect(titles).toContain("ITA Airways");
		expect(titles).toContain("Lufthansa");
		expect(titles).not.toContain("Miles & More");
	});

	it("gives the airlines of Flying Blue and not the programme", () => {
		expect(titles).toContain("KLM");
		expect(titles).not.toContain("Flying Blue");
	});

	it("gives the programme logo for a programme with one airline", () => {
		expect(titles).toContain(PROGRAM_LOGOS.sas?.title);
	});

	it("gives one item for each source and each airline", () => {
		const programs = Object.keys(PROGRAM_LOGOS);
		const expected = programs.reduce(
			(count, id) => count + Math.max(1, airlinesOf(id).length),
			0,
		);
		expect(items).toHaveLength(expected);
		expect(new Set(items.map((item) => item.key)).size).toBe(items.length);
	});
});
