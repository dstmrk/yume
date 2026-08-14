import { describe, expect, it } from "vitest";
import { parsePoints, readOptionalPoints, todayIso } from "./balance.ts";

describe("parsePoints", () => {
	it("reads a number with no separator", () => {
		expect(parsePoints("1900")).toBe(1900);
		expect(parsePoints("0")).toBe(0);
	});

	// The interface writes each number with the locale it-IT. Therefore the user
	// reads "1.900" on the screen and can write the same text.
	it("reads the separator of the thousands of Italy", () => {
		expect(parsePoints("1.900")).toBe(1900);
		expect(parsePoints("1.234.567")).toBe(1234567);
	});

	it("removes the spaces", () => {
		expect(parsePoints("  1900  ")).toBe(1900);
		expect(parsePoints("1 900")).toBe(1900);
		// A telephone can write a space that does not break the line.
		expect(parsePoints("1 900")).toBe(1900);
	});

	// A group of the thousands holds three digits. Without this examination
	// "1.9" gives 19, and the balance of the user becomes incorrect. A wrong
	// balance is the most dangerous defect of this application.
	it("refuses a group that is not of three digits", () => {
		expect(parsePoints("1.9")).toBeNull();
		expect(parsePoints("1.90")).toBeNull();
		expect(parsePoints("1.2345")).toBeNull();
		expect(parsePoints("1.234.56")).toBeNull();
	});

	it("refuses a text that is not a number", () => {
		expect(parsePoints("")).toBeNull();
		expect(parsePoints("   ")).toBeNull();
		expect(parsePoints("molti")).toBeNull();
		expect(parsePoints("1900 punti")).toBeNull();
	});

	// Points are integers. Refer to rule 1 of the section Rules for the data in
	// CLAUDE.md.
	it("refuses a number that is not an integer", () => {
		expect(parsePoints("1,5")).toBeNull();
		expect(parsePoints("1.5,2")).toBeNull();
	});

	it("refuses a number below 0", () => {
		expect(parsePoints("-5")).toBeNull();
	});

	// Above 2^53 the arithmetic of JavaScript is not exact. No balance arrives
	// at that value, but a text that a person puts in the field can.
	it("refuses a number that is too large", () => {
		expect(parsePoints("9007199254740993")).toBeNull();
	});

	it("reads a number with a zero at the start", () => {
		expect(parsePoints("007")).toBe(7);
	});
});

describe("readOptionalPoints", () => {
	it("reads a quantity of points", () => {
		expect(readOptionalPoints("1.900")).toEqual({ ok: true, points: 1900 });
	});

	// The field is not necessary. Then the form makes the account and it adds no
	// snapshot. The user writes the balance later.
	it("gives no points for an empty field", () => {
		expect(readOptionalPoints("")).toEqual({ ok: true, points: null });
		expect(readOptionalPoints("   ")).toEqual({ ok: true, points: null });
	});

	// A balance of 0 is a balance. The user has an account with no point.
	it("reads a balance of 0", () => {
		expect(readOptionalPoints("0")).toEqual({ ok: true, points: 0 });
	});

	// A text that is not a quantity of points is an error, not an empty field.
	// The form shows the message and it makes no account.
	it("refuses a text that is not a quantity of points", () => {
		expect(readOptionalPoints("1.9")).toEqual({ ok: false });
		expect(readOptionalPoints("molti")).toEqual({ ok: false });
		expect(readOptionalPoints("-5")).toEqual({ ok: false });
	});
});

describe("todayIso", () => {
	it("writes the date with the format of ISO 8601", () => {
		expect(todayIso(new Date(2026, 7, 13, 15, 0))).toBe("2026-08-13");
	});

	it("writes a zero before a small month and a small day", () => {
		expect(todayIso(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
	});

	// The date comes from the clock of the user, not from UTC. Italy is in front
	// of UTC. At 00:30 in Rome the date in UTC is the day before, and the field
	// then holds a date that the user did not select.
	it("gives the date of the user in the first hour of a day", () => {
		expect(todayIso(new Date(2026, 7, 13, 0, 30))).toBe("2026-08-13");
	});
});
