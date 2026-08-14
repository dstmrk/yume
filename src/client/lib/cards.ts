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
 * The favourites of the user come first, then the other currencies. Each of the
 * two groups goes from the largest value to the smallest one. The user marks
 * the currencies of interest, and the value alone does not give that sequence.
 *
 * The catalogue holds 15 airline currencies, but the user reads the dashboard
 * on a telephone. Therefore the first view holds the first three cards of that
 * sequence, and a button opens the other ones. A favourite with a small value
 * takes the place of a larger currency: that result is the reason of the mark.
 */
export function cardsToShow<T extends { currencyId: string; total: number }>(
	rows: readonly T[],
	expanded: boolean,
	favorites: ReadonlySet<string>,
): CardList<T> {
	const withValue = rows.filter((row) => row.total > 0);
	const byValue = byValueDesc<T>((row) => row.total);
	const sorted = [
		...withValue.filter((row) => favorites.has(row.currencyId)).sort(byValue),
		...withValue.filter((row) => !favorites.has(row.currencyId)).sort(byValue),
	];

	if (expanded) {
		return { cards: sorted, hidden: 0 };
	}
	return {
		cards: sorted.slice(0, HOME_CARDS),
		hidden: Math.max(0, sorted.length - HOME_CARDS),
	};
}
