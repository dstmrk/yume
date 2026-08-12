import type { AddSnapshotInput } from "../../shared/api.ts";

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

/**
 * Makes the body of the request from the fields of the form.
 *
 * The note is not necessary. The schema of the API asks for a text or for null,
 * thus an empty string gives the status 400.
 */
export function toAddSnapshotBody(fields: {
	points: number;
	observedAt: string;
	note: string;
}): AddSnapshotInput {
	return {
		points: fields.points,
		observedAt: fields.observedAt,
		note: fields.note.trim() || null,
	};
}
