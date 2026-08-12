import type { BestRoute } from "../../shared/potential.ts";

/** One programme of the currency, with the points that arrive in it. */
export type RouteOption = {
	toProgramId: string;
	points: number;
};

export type GroupedRoute = {
	fromProgramId: string;
	/** The largest quantity of points that this source can send. */
	points: number;
	options: RouteOption[];
};

/**
 * Adds the routes that come from the same programme.
 *
 * The calculation gives one route for each source account. Two accounts of the
 * same programme therefore give two routes. The card shows one line for each
 * source programme, with the sum of the values.
 *
 * The function also adds the options of the same target programme, because each
 * account converts alone. Two accounts of 700 Membership Rewards points give
 * 400 Avios each through Iberia Club, and 0 through The British Airways Club.
 * Thus the line shows 800, and the list shows 800 and 0.
 *
 * The function keeps the sequence of the first route of each source.
 */
export function groupRoutes(routes: readonly BestRoute[]): GroupedRoute[] {
	const bySource = new Map<string, GroupedRoute>();

	for (const route of routes) {
		const found = bySource.get(route.fromProgramId);
		if (found === undefined) {
			bySource.set(route.fromProgramId, {
				fromProgramId: route.fromProgramId,
				points: route.points,
				options: route.options.map((option) => ({ ...option })),
			});
			continue;
		}

		found.points += route.points;
		for (const option of route.options) {
			const same = found.options.find(
				(one) => one.toProgramId === option.toProgramId,
			);
			if (same === undefined) {
				found.options.push({ ...option });
			} else {
				same.points += option.points;
			}
		}
	}

	return [...bySource.values()];
}
