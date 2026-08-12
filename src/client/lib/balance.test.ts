import { describe, expect, it } from "vitest";
import { parsePoints, toAddSnapshotBody, todayIso } from "./balance.ts";

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

describe("toAddSnapshotBody", () => {
	it("keeps the points, the date and the note", () => {
		expect(
			toAddSnapshotBody({
				points: 1900,
				observedAt: "2026-08-13",
				note: "Dopo il bonus",
			}),
		).toEqual({
			points: 1900,
			observedAt: "2026-08-13",
			note: "Dopo il bonus",
		});
	});

	// The note is not necessary. The schema of the API asks for a text or for
	// null, thus an empty field gives the status 400.
	it("makes an empty note null", () => {
		expect(
			toAddSnapshotBody({ points: 0, observedAt: "2026-08-13", note: "  " }),
		).toEqual({ points: 0, observedAt: "2026-08-13", note: null });
	});
});
