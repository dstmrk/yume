/**
 * Gives a comparison that puts the largest value first.
 *
 * A list of balances reads better from the largest value. The name of the
 * programme is not a useful sequence: the user looks for the largest quantity.
 *
 * A value that is null goes to the end. An account with no snapshot has no
 * quantity, thus it cannot come before an account with a balance.
 *
 * The comparison gives 0 for two equal values. `Array.prototype.sort` is
 * stable, therefore two equal values keep their first sequence.
 */
export function byValueDesc<T>(
	value: (item: T) => number | null,
): (a: T, b: T) => number {
	return (a, b) => {
		const left = value(a);
		const right = value(b);
		if (left === right) {
			return 0;
		}
		if (left === null) {
			return 1;
		}
		if (right === null) {
			return -1;
		}
		return right - left;
	};
}
