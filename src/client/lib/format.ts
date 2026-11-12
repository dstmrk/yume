/**
 * The format of the numbers and of the dates.
 *
 * Each function receives the locale of `Intl` of the language of the page.
 * Paragraph 5.8 of `docs/architecture.md` gives the rule.
 */

/**
 * One formatter for each locale. A new formatter of `Intl` is slow, and the
 * board writes many numbers.
 */
function cached<T>(make: (intl: string) => T): (intl: string) => T {
	const made = new Map<string, T>();
	return (intl) => {
		let value = made.get(intl);
		if (value === undefined) {
			value = make(intl);
			made.set(intl, value);
		}
		return value;
	};
}

/**
 * The option `useGrouping: "always"` is necessary. The locale `it-IT` starts the
 * groups at five digits, thus 1900 gives `1900` but 12345 gives `12.345`. On a
 * board the two numbers are one above the other, and the difference is an error
 * for the eye.
 */
const points = cached(
	(intl) => new Intl.NumberFormat(intl, { useGrouping: "always" }),
);

const day = cached(
	(intl) =>
		new Intl.DateTimeFormat(intl, {
			day: "numeric",
			month: "short",
			year: "numeric",
			timeZone: "UTC",
		}),
);

const euros = cached(
	(intl) => new Intl.NumberFormat(intl, { style: "currency", currency: "EUR" }),
);

/**
 * Writes a price in euros from its cents: 999 gives 9,99 € in Italian.
 *
 * The function gives the value to `Intl` as a decimal text. Thus no number
 * with a decimal part occurs, as the rule 1 of the data asks.
 */
export function formatEuros(cents: number, intl: string): string {
	const whole = Math.trunc(cents / 100);
	const part = String(cents % 100).padStart(2, "0");
	return euros(intl).format(`${whole}.${part}` as `${number}`);
}

/** Writes a quantity of points: 1900 gives 1.900 in Italian. */
export function formatPoints(value: number, intl: string): string {
	return points(intl).format(value);
}

/**
 * Writes a date of the ISO 8601 format for a person: 2026-08-11 gives 11 ago
 * 2026 in Italian.
 *
 * The function reads the three parts of the date and makes a date in UTC. A
 * date from `new Date("2026-08-11")` is midnight in UTC, and a format in the
 * time of the user can then give the day before.
 *
 * A date that the function cannot read gives the same text.
 * Thus a defect in the data shows a value and it stops no page. The
 * examination of the quantity of the parts is not sufficient: `2026-ab-11`
 * holds three parts, but one part is not a number and the format then gives a
 * RangeError.
 */
export function formatDate(iso: string, intl: string): string {
	const [year, month, date] = iso.split("-").map(Number);
	if (
		year === undefined ||
		month === undefined ||
		date === undefined ||
		Number.isNaN(year) ||
		Number.isNaN(month) ||
		Number.isNaN(date)
	) {
		return iso;
	}
	return day(intl).format(new Date(Date.UTC(year, month - 1, date)));
}

const decimal = cached(
	(intl) =>
		new Intl.NumberFormat(intl)
			.formatToParts(1.5)
			.find((part) => part.type === "decimal")?.value ?? ".",
);

/**
 * Writes a quantity in hundredths with two decimals: 8002 gives 80,02 in
 * Italian.
 *
 * The function divides with integers, thus it gives no error of a
 * floating-point number. Refer to the rule 1 of the data in `CLAUDE.md`.
 */
export function formatHundredths(value: number, intl: string): string {
	const whole = Math.floor(value / 100);
	const rest = String(value % 100).padStart(2, "0");
	return `${formatPoints(whole, intl)}${decimal(intl)}${rest}`;
}

const list = cached(
	(intl) => new Intl.ListFormat(intl, { style: "long", type: "conjunction" }),
);

/** Joins names with the conjunction of the locale: `Amex, Revolut e Klarna`. */
export function formatList(items: readonly string[], intl: string): string {
	return list(intl).format(items);
}
