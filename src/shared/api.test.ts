import { describe, expect, it } from "vitest";
import { isoDateSchema } from "./api.ts";

describe("isoDateSchema", () => {
	it("accepts a date that exists", () => {
		expect(isoDateSchema.safeParse("2026-08-11").success).toBe(true);
		expect(isoDateSchema.safeParse("2026-12-31").success).toBe(true);
		expect(isoDateSchema.safeParse("2026-01-01").success).toBe(true);
	});

	it("accepts 29 February of a leap year", () => {
		expect(isoDateSchema.safeParse("2024-02-29").success).toBe(true);
		expect(isoDateSchema.safeParse("2000-02-29").success).toBe(true);
	});

	// V8 accepts a day up to 31 in each month: `Date.parse("2026-02-30")` gives
	// 2 March.
	it("refuses a day that the month does not hold", () => {
		expect(isoDateSchema.safeParse("2026-02-30").success).toBe(false);
		expect(isoDateSchema.safeParse("2026-02-31").success).toBe(false);
		expect(isoDateSchema.safeParse("2026-04-31").success).toBe(false);
	});

	it("refuses 29 February of a year that is not a leap year", () => {
		expect(isoDateSchema.safeParse("2025-02-29").success).toBe(false);
		expect(isoDateSchema.safeParse("1900-02-29").success).toBe(false);
	});

	it("refuses a month or a day that is out of the range", () => {
		expect(isoDateSchema.safeParse("2026-13-01").success).toBe(false);
		expect(isoDateSchema.safeParse("2026-00-10").success).toBe(false);
		expect(isoDateSchema.safeParse("2026-08-00").success).toBe(false);
		expect(isoDateSchema.safeParse("2026-08-32").success).toBe(false);
	});

	// `Date.UTC` gives the years 0 to 99 to the years 1900 to 1999. No balance
	// holds such a date, thus the refusal is correct.
	it("refuses a year below 100", () => {
		expect(isoDateSchema.safeParse("0050-01-01").success).toBe(false);
	});

	it("refuses a text that is not in the ISO 8601 format", () => {
		expect(isoDateSchema.safeParse("2026-8-11").success).toBe(false);
		expect(isoDateSchema.safeParse("11/08/2026").success).toBe(false);
		expect(isoDateSchema.safeParse("2026-08-11T00:00:00Z").success).toBe(false);
		expect(isoDateSchema.safeParse("").success).toBe(false);
	});
});
