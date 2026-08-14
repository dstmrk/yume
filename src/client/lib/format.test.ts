import { describe, expect, it } from "vitest";
import { formatDate, formatMoment, formatPoints } from "./format.ts";

describe("formatPoints", () => {
	it("writes the separator of the thousands of Italy", () => {
		expect(formatPoints(1900)).toBe("1.900");
		expect(formatPoints(1234567)).toBe("1.234.567");
	});

	it("writes a small number with no separator", () => {
		expect(formatPoints(0)).toBe("0");
		expect(formatPoints(999)).toBe("999");
	});

	// The locale it-IT starts the groups at five digits. The board needs the
	// same shape for each number, thus the format always makes the groups.
	it("writes the separator also in a number of four digits", () => {
		expect(formatPoints(1000)).toBe("1.000");
	});
});

describe("formatDate", () => {
	it("writes the day, the month and the year", () => {
		expect(formatDate("2026-08-11")).toBe("11 ago 2026");
	});

	it("keeps the day of the date on the first day of a month", () => {
		// A date of the ISO format is midnight in UTC. Italy is in front of UTC,
		// thus a format in the time of Italy can give the day before.
		expect(formatDate("2026-01-01")).toBe("1 gen 2026");
	});

	it("gives the value again when the date is not correct", () => {
		expect(formatDate("non una data")).toBe("non una data");
	});

	// A text with three parts passes the examination of the quantity, but a part
	// that is not a number gives an invalid date. The format then stops the page
	// with a RangeError.
	it("gives the value again when a part is not a number", () => {
		expect(formatDate("a-b-c")).toBe("a-b-c");
		expect(formatDate("2026-ab-11")).toBe("2026-ab-11");
	});

	it("gives the value again when the date holds no part", () => {
		expect(formatDate("")).toBe("");
	});
});

describe("formatMoment", () => {
	it("writes the day, the month and the hour", () => {
		// The format uses the time zone of the machine, thus the test reads the
		// shape and no fixed hour.
		expect(formatMoment("2026-08-14T10:00:00.000Z")).toMatch(
			/^\d{1,2} \w+,? \d{2}:\d{2}$/,
		);
	});

	it("gives the value again when the moment is not correct", () => {
		expect(formatMoment("non un momento")).toBe("non un momento");
	});
});
