import { describe, expect, it } from "vitest";
import {
	formatDate,
	formatEuros,
	formatHundredths,
	formatList,
	formatPoints,
} from "./format.ts";

const IT = "it-IT";

describe("formatPoints", () => {
	it("writes the separator of the thousands of Italy", () => {
		expect(formatPoints(1900, IT)).toBe("1.900");
		expect(formatPoints(1234567, IT)).toBe("1.234.567");
	});

	it("writes a small number with no separator", () => {
		expect(formatPoints(0, IT)).toBe("0");
		expect(formatPoints(999, IT)).toBe("999");
	});

	// The locale it-IT starts the groups at five digits. The board needs the
	// same shape for each number, thus the format always makes the groups.
	it("writes the separator also in a number of four digits", () => {
		expect(formatPoints(1000, IT)).toBe("1.000");
	});
});

describe("formatDate", () => {
	it("writes the day, the month and the year", () => {
		expect(formatDate("2026-08-11", IT)).toBe("11 ago 2026");
	});

	it("keeps the day of the date on the first day of a month", () => {
		// A date of the ISO format is midnight in UTC. Italy is in front of UTC,
		// thus a format in the time of Italy can give the day before.
		expect(formatDate("2026-01-01", IT)).toBe("1 gen 2026");
	});

	it("gives the value again when the date is not correct", () => {
		expect(formatDate("non una data", IT)).toBe("non una data");
	});

	// A text with three parts passes the examination of the quantity, but a part
	// that is not a number gives an invalid date. The format then stops the page
	// with a RangeError.
	it("gives the value again when a part is not a number", () => {
		expect(formatDate("a-b-c", IT)).toBe("a-b-c");
		expect(formatDate("2026-ab-11", IT)).toBe("2026-ab-11");
	});

	it("gives the value again when the date holds no part", () => {
		expect(formatDate("", IT)).toBe("");
	});
});

// The format follows the language. Paragraph 5.8 of `docs/architecture.md`
// gives the rule.
describe("the format in an other language", () => {
	it("writes the separator of the thousands of English", () => {
		expect(formatPoints(1900, "en-GB")).toBe("1,900");
	});

	it("writes the month of English", () => {
		expect(formatDate("2026-08-11", "en-GB")).toBe("11 Aug 2026");
	});
});

describe("formatEuros", () => {
	it("writes the price of the supporter account in Italian", () => {
		expect(formatEuros(999, IT)).toBe("9,99\u00a0€");
	});

	it("writes a price with no cents and a price below one euro", () => {
		expect(formatEuros(1000, IT)).toBe("10,00\u00a0€");
		expect(formatEuros(5, IT)).toBe("0,05\u00a0€");
	});

	it("writes the price in English", () => {
		expect(formatEuros(999, "en-GB")).toBe("€9.99");
	});
});

describe("formatHundredths", () => {
	it("writes the two decimals with the separator of the locale", () => {
		expect(formatHundredths(8002, IT)).toBe("80,02");
		expect(formatHundredths(13224, IT)).toBe("132,24");
	});

	it("keeps a zero after the separator", () => {
		expect(formatHundredths(8005, IT)).toBe("80,05");
		expect(formatHundredths(8000, IT)).toBe("80,00");
	});

	it("writes the separator of the thousands", () => {
		expect(formatHundredths(123456, IT)).toBe("1.234,56");
	});

	it("follows the locale", () => {
		expect(formatHundredths(8002, "en-GB")).toBe("80.02");
	});
});

describe("formatList", () => {
	it("joins the items with the conjunction of the locale", () => {
		expect(formatList(["Amex", "Revolut", "Klarna"], IT)).toBe(
			"Amex, Revolut e Klarna",
		);
		expect(formatList(["Amex", "Revolut"], IT)).toBe("Amex e Revolut");
	});

	it("gives one item alone", () => {
		expect(formatList(["Amex"], IT)).toBe("Amex");
	});

	it("gives an empty text with no item", () => {
		expect(formatList([], IT)).toBe("");
	});
});
