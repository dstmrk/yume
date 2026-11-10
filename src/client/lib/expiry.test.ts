import { describe, expect, it } from "vitest";
import { draftsOf, isExpired, readLots } from "./expiry.ts";

const IT = "it-IT";
const DATE = "2026-11-10";

describe("readLots", () => {
	it("gives no lot when the form holds no row", () => {
		expect(readLots([], 1000, DATE, IT)).toEqual({ ok: true, lots: [] });
	});

	// The user adds a row and then writes nothing. The row is not an error.
	it("ignores a row with two empty fields", () => {
		expect(readLots([{ points: "  ", expiresOn: "" }], 1000, DATE, IT)).toEqual(
			{ ok: true, lots: [] },
		);
	});

	it("reads the points with the separator of the locale", () => {
		expect(
			readLots([{ points: "1.900", expiresOn: "2027-03-31" }], 10000, DATE, IT),
		).toEqual({ ok: true, lots: [{ points: 1900, expiresOn: "2027-03-31" }] });
	});

	it("gives the lots in the order of the date", () => {
		const result = readLots(
			[
				{ points: "10", expiresOn: "2027-12-31" },
				{ points: "20", expiresOn: "2027-03-31" },
			],
			100,
			DATE,
			IT,
		);
		expect(result).toEqual({
			ok: true,
			lots: [
				{ points: 20, expiresOn: "2027-03-31" },
				{ points: 10, expiresOn: "2027-12-31" },
			],
		});
	});

	it("refuses a row with one empty field", () => {
		expect(readLots([{ points: "10", expiresOn: "" }], 100, DATE, IT)).toEqual({
			ok: false,
			error: "incomplete",
		});
		expect(
			readLots([{ points: "", expiresOn: "2027-03-31" }], 100, DATE, IT),
		).toEqual({ ok: false, error: "incomplete" });
	});

	it("refuses points that are not a positive quantity", () => {
		for (const points of ["0", "1.9", "abc", "-5"]) {
			expect(
				readLots([{ points, expiresOn: "2027-03-31" }], 100, DATE, IT),
			).toEqual({ ok: false, error: "points" });
		}
	});

	it("refuses a date that does not exist", () => {
		expect(
			readLots([{ points: "10", expiresOn: "2027-02-30" }], 100, DATE, IT),
		).toEqual({ ok: false, error: "incomplete" });
	});

	it("refuses a lot that expires before the date of the balance", () => {
		expect(
			readLots([{ points: "10", expiresOn: "2026-11-09" }], 100, DATE, IT),
		).toEqual({ ok: false, error: "beforeDate" });
	});

	it("accepts a lot that expires on the date of the balance", () => {
		expect(
			readLots([{ points: "10", expiresOn: DATE }], 100, DATE, IT).ok,
		).toBe(true);
	});

	it("refuses two rows with the same date", () => {
		expect(
			readLots(
				[
					{ points: "10", expiresOn: "2027-03-31" },
					{ points: "20", expiresOn: "2027-03-31" },
				],
				100,
				DATE,
				IT,
			),
		).toEqual({ ok: false, error: "duplicate" });
	});

	it("accepts lots equal to the balance", () => {
		expect(
			readLots(
				[
					{ points: "60", expiresOn: "2027-03-31" },
					{ points: "40", expiresOn: "2027-12-31" },
				],
				100,
				DATE,
				IT,
			).ok,
		).toBe(true);
	});

	it("refuses lots above the balance", () => {
		expect(
			readLots(
				[
					{ points: "60", expiresOn: "2027-03-31" },
					{ points: "41", expiresOn: "2027-12-31" },
				],
				100,
				DATE,
				IT,
			),
		).toEqual({ ok: false, error: "aboveBalance" });
	});
});

describe("draftsOf", () => {
	it("writes the points of each lot with the locale", () => {
		expect(
			draftsOf([{ points: 12400, expiresOn: "2027-03-31" }], DATE, IT),
		).toEqual([{ points: "12.400", expiresOn: "2027-03-31" }]);
	});

	// A lot of the past is not in the new balance. The schema refuses it, thus
	// the form does not give it again.
	it("gives no lot that expires before today", () => {
		expect(
			draftsOf(
				[
					{ points: 10, expiresOn: "2026-11-09" },
					{ points: 20, expiresOn: DATE },
				],
				DATE,
				IT,
			),
		).toEqual([{ points: "20", expiresOn: DATE }]);
	});
});

describe("isExpired", () => {
	it("gives true for a date before today only", () => {
		expect(isExpired("2026-11-09", DATE)).toBe(true);
		expect(isExpired(DATE, DATE)).toBe(false);
		expect(isExpired("2026-11-11", DATE)).toBe(false);
	});
});
