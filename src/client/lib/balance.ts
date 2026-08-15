/**
 * A quantity of points, with the separator of the thousands of Italy or with
 * no separator. A group of the thousands holds three digits.
 *
 * The examination of the groups is necessary. Without it "1.9" gives 19, and
 * the balance of the user becomes incorrect. Refer to rule 1 of the section
 * Rules for the data in `CLAUDE.md`.
 */
const POINTS = /^\d{1,3}(\.\d{3})*$|^\d+$/;

/** The spaces that a keyboard of a telephone can write. */
const SPACES = /[\s  ]/g;

/**
 * Reads a quantity of points from the field of the form.
 *
 * It gives null when the text is not a quantity of points. Then the form shows
 * a message and it sends no request.
 */
export function parsePoints(input: string): number | null {
	const clean = input.replace(SPACES, "");
	if (!POINTS.test(clean)) {
		return null;
	}
	const value = Number(clean.replaceAll(".", ""));
	return Number.isSafeInteger(value) ? value : null;
}

/** The result of the field of the balance of the form of a new account. */
export type OptionalPoints =
	| { readonly ok: true; readonly points: number | null }
	| { readonly ok: false };

/**
 * Reads the balance from a field that is not necessary.
 *
 * The form of a new account holds this field. Thus the user makes the account
 * and writes the first balance with one operation.
 *
 * An empty field gives `null`: the form makes the account and it adds no
 * snapshot. A text that is not a quantity of points gives `ok: false`: the form
 * shows the message and it sends no request.
 */
export function readOptionalPoints(input: string): OptionalPoints {
	if (input.trim() === "") {
		return { ok: true, points: null };
	}
	const points = parsePoints(input);
	return points === null ? { ok: false } : { ok: true, points };
}

/**
 * The date of today, in the ISO 8601 format.
 *
 * The date comes from the clock of the user, not from UTC. Italy is in front of
 * UTC: at 00:30 in Rome the date in UTC is the day before, and the field then
 * holds a date that the user did not select.
 */
export function todayIso(now: Date): string {
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const date = String(now.getDate()).padStart(2, "0");
	return `${now.getFullYear()}-${month}-${date}`;
}
