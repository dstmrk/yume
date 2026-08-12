import type { BestRoute } from "../../shared/potential.ts";

export type GroupedRoute = {
	fromProgramId: string;
	toProgramId: string;
	points: number;
};

/**
 * Adds the routes that have the same pair of programmes.
 *
 * The calculation gives one route for each source account. Two accounts of the
 * same programme therefore give two routes with the same pair. The card shows
 * one line for each pair, with the sum of the two values.
 *
 * The function keeps the sequence of the first route of each pair.
 */
export function groupRoutes(routes: readonly BestRoute[]): GroupedRoute[] {
	const byPair = new Map<string, GroupedRoute>();
	for (const route of routes) {
		const key = `${route.fromProgramId}>${route.toProgramId}`;
		const found = byPair.get(key);
		if (found === undefined) {
			byPair.set(key, {
				fromProgramId: route.fromProgramId,
				toProgramId: route.toProgramId,
				points: route.points,
			});
		} else {
			found.points += route.points;
		}
	}
	return [...byPair.values()];
}
