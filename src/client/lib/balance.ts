/** The spaces that a keyboard of a telephone can write. */
const SPACES = /[\s\u00a0\u202f]/g;

/** The separator of the thousands of each locale, read one time. */
const groups = new Map<string, string>();

/** Gives the separator of the thousands of the locale of `Intl`. */
function groupOf(intl: string): string {
	let group = groups.get(intl);
	if (group === undefined) {
		group =
			new Intl.NumberFormat(intl, { useGrouping: "always" })
				.formatToParts(1000)
				.find((part) => part.type === "group")?.value ?? "";
		groups.set(intl, group);
	}
	return group;
}

/** Writes a text in a regular expression with no special character. */
function literal(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reads a quantity of points from the field of the form.
 *
 * The text holds the separator of the thousands of the locale, or no
 * separator. Paragraph 5.8 of `docs/architecture.md` gives the rule. In Italian
 * `1.900` is 1900. In English the same text is a decimal number, thus the
 * function refuses it: the reading 1900 gives a balance 1000 times too large.
 *
 * A group of the thousands holds three digits. Without that examination "1.9"
 * gives 19, and the balance of the user becomes incorrect. Refer to rule 1 of
 * the section Rules for the data in `CLAUDE.md`.
 *
 * A space between the groups is the separator of the thousands in each locale,
 * with the same rule of three digits. Thus "1 900" gives 1900, and "1 9" is
 * refused: without that examination it gives 19, the same defect as "1.9". A
 * locale with a space as its separator, for example French, gives the same
 * result.
 *
 * It gives null when the text is not a quantity of points. Then the form shows
 * a message and it sends no request.
 */
export function parsePoints(input: string, intl: string): number | null {
	const group = groupOf(intl);
	const clean = input.trim().replace(SPACES, group);

	const points =
		group === ""
			? /^\d+$/
			: new RegExp(`^\\d{1,3}(${literal(group)}\\d{3})*$|^\\d+$`);
	if (!points.test(clean)) {
		return null;
	}
	const value = Number(group === "" ? clean : clean.replaceAll(group, ""));
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
export function readOptionalPoints(
	input: string,
	intl: string,
): OptionalPoints {
	if (input.trim() === "") {
		return { ok: true, points: null };
	}
	const points = parsePoints(input, intl);
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
