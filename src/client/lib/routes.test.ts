import { describe, expect, it } from "vitest";
import { groupRoutes } from "./routes.ts";

describe("groupRoutes", () => {
	it("gives no route for an empty list", () => {
		expect(groupRoutes([])).toEqual([]);
	});

	it("adds the routes of the same pair of programmes", () => {
		// Two accounts of Membership Rewards give two routes to Iberia Club.
		expect(
			groupRoutes([
				{ fromProgramId: "amex-mr", toProgramId: "iberia-club", points: 400 },
				{ fromProgramId: "amex-mr", toProgramId: "iberia-club", points: 800 },
			]),
		).toEqual([
			{ fromProgramId: "amex-mr", toProgramId: "iberia-club", points: 1200 },
		]);
	});

	it("keeps two pairs of programmes separate", () => {
		expect(
			groupRoutes([
				{ fromProgramId: "amex-mr", toProgramId: "iberia-club", points: 400 },
				{ fromProgramId: "revolut", toProgramId: "ba-club", points: 250 },
			]),
		).toHaveLength(2);
	});

	it("keeps the sequence of the first route of each pair", () => {
		const grouped = groupRoutes([
			{ fromProgramId: "revolut", toProgramId: "ba-club", points: 250 },
			{ fromProgramId: "amex-mr", toProgramId: "iberia-club", points: 400 },
			{ fromProgramId: "revolut", toProgramId: "ba-club", points: 50 },
		]);
		expect(grouped.map((route) => route.fromProgramId)).toEqual([
			"revolut",
			"amex-mr",
		]);
		expect(grouped[0]?.points).toBe(300);
	});
});
