/**
 * The format of the numbers and of the dates, for Italy.
 *
 * Refer to the section Rules for the user interface in `CLAUDE.md`.
 */

/**
 * The option `useGrouping: "always"` is necessary. The locale `it-IT` starts the
 * groups at five digits, thus 1900 gives `1900` but 12345 gives `12.345`. On a
 * board the two numbers are one above the other, and the difference is an error
 * for the eye.
 */
const points = new Intl.NumberFormat("it-IT", { useGrouping: "always" });

const day = new Intl.DateTimeFormat("it-IT", {
	day: "numeric",
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});

/**
 * The moment of the end of an invitation holds the hour. The format uses the
 * time zone of the machine: the user reads the hour of the clock in the room.
 */
const moment = new Intl.DateTimeFormat("it-IT", {
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
});

/** Writes a quantity of points with the separators of Italy: 1900 gives 1.900. */
export function formatPoints(value: number): string {
	return points.format(value);
}

/**
 * Writes a date of the ISO 8601 format for a person: 2026-08-11 gives 11 ago 2026.
 *
 * The function reads the three parts of the date and makes a date in UTC. A
 * date from `new Date("2026-08-11")` is midnight in UTC, and a format in the
 * time of Italy can then give the day before.
 */
export function formatDate(iso: string): string {
	const [year, month, date] = iso.split("-").map(Number);
	if (year === undefined || month === undefined || date === undefined) {
		return iso;
	}
	return day.format(new Date(Date.UTC(year, month - 1, date)));
}

/**
 * Writes a moment of the ISO 8601 format for a person, with the hour.
 *
 * A moment that the function cannot read gives the same text. Thus a defect in
 * the data shows a value and it stops no page.
 */
export function formatMoment(iso: string): string {
	const value = Date.parse(iso);
	return Number.isNaN(value) ? iso : moment.format(value);
}
