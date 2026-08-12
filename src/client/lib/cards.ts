import { byValueDesc } from "./sort.ts";

/** The quantity of cards of the first view of the dashboard. */
export const HOME_CARDS = 3;

export type CardList<T> = {
	readonly cards: readonly T[];
	/** The quantity of cards that the first view does not show. */
	readonly hidden: number;
};

/**
 * Selects the cards of the dashboard.
 *
 * A currency with a potential of 0 gives no information: the user has no
 * balance of that currency, and no source reaches it. Thus the list removes
 * that currency.
 *
 * The catalogue holds 15 airline currencies, but the user reads the dashboard
 * on a telephone. Therefore the first view holds the three largest values, and
 * a button opens the other ones.
 */
export function cardsToShow<T extends { total: number }>(
	rows: readonly T[],
	expanded: boolean,
): CardList<T> {
	const withValue = rows
		.filter((row) => row.total > 0)
		.sort(byValueDesc((row) => row.total));

	if (expanded) {
		return { cards: withValue, hidden: 0 };
	}
	return {
		cards: withValue.slice(0, HOME_CARDS),
		hidden: Math.max(0, withValue.length - HOME_CARDS),
	};
}
