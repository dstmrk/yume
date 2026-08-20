import { describe, expect, it } from "vitest";
import type { Award, Program } from "./catalogue.ts";
import { goalFor } from "./goal.ts";
import type { PotentialMiles } from "./potential.ts";

const programs: Program[] = [
	{
		id: "iberia-club",
		currencyId: "avios",
		code: "IB",
		name: "Iberia",
		transferable: true,
		chartKind: "distance",
	},
	{
		id: "flying-blue",
		currencyId: "flying-blue",
		code: "FB",
		name: "Flying Blue",
		transferable: true,
		chartKind: "dynamic",
	},
];

/** Milano to New York, business, off-peak. Refer to paragraph 3.1 of the plan. */
const award: Award = {
	programId: "iberia-club",
	fromZone: "europe",
	toZone: "north-america",
	cabin: "business",
	season: "off-peak",
	miles: 34_000,
	taxesCents: 25_000,
	validFrom: "2026-08-20",
	validTo: null,
};

/** The potential of one currency, with no route. The routes change no state. */
function potential(currencyId: string, total: number): PotentialMiles {
	return {
		currencyId,
		current: total,
		fromTransfers: 0,
		total,
		routes: [],
	};
}

describe("goalFor", () => {
	it("gives the state reached when the potential is above the award", () => {
		const goal = goalFor({
			potential: potential("avios", 41_200),
			award,
			programs,
		});
		expect(goal).toEqual({ state: "reached" });
	});

	// The user reaches the award with no point of spare.
	it("gives the state reached when the two values are equal", () => {
		const goal = goalFor({
			potential: potential("avios", 34_000),
			award,
			programs,
		});
		expect(goal).toEqual({ state: "reached" });
	});

	it("gives the points that the user misses", () => {
		const goal = goalFor({
			potential: potential("avios", 25_000),
			award,
			programs,
		});
		expect(goal).toEqual({ state: "missing", points: 9_000 });
	});

	it("gives all the miles when the potential is 0", () => {
		const goal = goalFor({ potential: potential("avios", 0), award, programs });
		expect(goal).toEqual({ state: "missing", points: 34_000 });
	});

	// Rule 2 of the data: a currency is different from a programme. The balance of
	// The British Airways Club pays an award of Iberia Club, because the two
	// programmes use Avios.
	it("reads the currency of the programme, not the programme", () => {
		const goal = goalFor({
			potential: potential("avios", 34_000),
			award: { ...award, programId: "ba-club" },
			programs: [
				...programs,
				{
					id: "ba-club",
					currencyId: "avios",
					code: "BA",
					name: "British Airways",
					transferable: true,
					chartKind: null,
				},
			],
		});
		expect(goal).toEqual({ state: "reached" });
	});

	// The taxes are cents. The miles are points. A sum of the two values gives a
	// number that no programme asks for.
	it("reads no taxes", () => {
		const high = goalFor({
			potential: potential("avios", 34_000),
			award: { ...award, taxesCents: 90_000 },
			programs,
		});
		expect(high).toEqual({ state: "reached" });
	});

	// The user cannot pay an award of Iberia Club with Flying Blue miles.
	it("gives no route for the potential of an other currency", () => {
		const goal = goalFor({
			potential: potential("flying-blue", 100_000),
			award,
			programs,
		});
		expect(goal).toEqual({ state: "no-route" });
	});

	it("gives no route when the catalogue holds no programme of the award", () => {
		const goal = goalFor({
			potential: potential("avios", 100_000),
			award: { ...award, programId: "no-such-program" },
			programs,
		});
		expect(goal).toEqual({ state: "no-route" });
	});
});
