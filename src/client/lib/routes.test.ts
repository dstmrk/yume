import { describe, expect, it } from "vitest";
import type { BestRoute } from "../../shared/potential.ts";
import { groupRoutes } from "./routes.ts";

/** A route of one account of Amex, with the two programmes of the Avios family. */
function amex(
	points: number,
	iberia: number,
	britishAirways: number,
): BestRoute {
	return {
		fromProgramId: "amex-mr",
		toProgramId: "iberia-club",
		points,
		options: [
			{ toProgramId: "ba-club", points: britishAirways },
			{ toProgramId: "iberia-club", points: iberia },
		],
	};
}

describe("groupRoutes", () => {
	it("gives no line for an empty list", () => {
		expect(groupRoutes([])).toEqual([]);
	});

	it("adds the two accounts of the same source programme", () => {
		const grouped = groupRoutes([amex(400, 400, 0), amex(400, 400, 0)]);
		expect(grouped).toHaveLength(1);
		expect(grouped[0]?.points).toBe(800);
	});

	// Each account converts alone. Two accounts of 700 points give 0 through The
	// British Airways Club, and the minimum of 800 does not apply to the sum.
	it("adds the options of the same target programme", () => {
		const grouped = groupRoutes([amex(400, 400, 0), amex(400, 400, 0)]);
		expect(grouped[0]?.options).toEqual([
			{ toProgramId: "ba-club", points: 0 },
			{ toProgramId: "iberia-club", points: 800 },
		]);
	});

	it("adds an option that only one account has", () => {
		const first: BestRoute = {
			fromProgramId: "revolut",
			toProgramId: "ba-club",
			points: 250,
			options: [{ toProgramId: "ba-club", points: 250 }],
		};
		const second: BestRoute = {
			fromProgramId: "revolut",
			toProgramId: "ba-club",
			points: 100,
			options: [
				{ toProgramId: "ba-club", points: 100 },
				{ toProgramId: "vueling", points: 100 },
			],
		};
		expect(groupRoutes([first, second])[0]?.options).toEqual([
			{ toProgramId: "ba-club", points: 350 },
			{ toProgramId: "vueling", points: 100 },
		]);
	});

	it("keeps two source programmes separate", () => {
		const revolut: BestRoute = {
			fromProgramId: "revolut",
			toProgramId: "ba-club",
			points: 250,
			options: [{ toProgramId: "ba-club", points: 250 }],
		};
		expect(groupRoutes([amex(400, 400, 0), revolut])).toHaveLength(2);
	});

	it("keeps the sequence of the first route of each source", () => {
		const revolut: BestRoute = {
			fromProgramId: "revolut",
			toProgramId: "ba-club",
			points: 250,
			options: [{ toProgramId: "ba-club", points: 250 }],
		};
		const grouped = groupRoutes([revolut, amex(400, 400, 0), revolut]);
		expect(grouped.map((route) => route.fromProgramId)).toEqual([
			"revolut",
			"amex-mr",
		]);
		expect(grouped[0]?.points).toBe(500);
	});

	it("does not change the routes of the caller", () => {
		const route = amex(400, 400, 0);
		groupRoutes([route, amex(400, 400, 0)]);
		expect(route.points).toBe(400);
		expect(route.options).toEqual([
			{ toProgramId: "ba-club", points: 0 },
			{ toProgramId: "iberia-club", points: 400 },
		]);
	});
});
