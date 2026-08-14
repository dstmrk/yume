/**
 * Gives the list of the marks with the currency added or removed.
 *
 * The dashboard writes the answer of the server before the request arrives.
 * Thus the heart changes with the tap, and the sequence of the cards changes at
 * the same moment.
 *
 * The function removes the currency first. Therefore a list that already holds
 * that currency keeps one item only.
 */
export function toggleFavorite(
	currencyIds: readonly string[],
	currencyId: string,
	favorite: boolean,
): string[] {
	const others = currencyIds.filter((id) => id !== currencyId);
	return favorite ? [...others, currencyId] : others;
}
