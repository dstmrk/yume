import { describe, expect, it } from "vitest";
import {
	addSnapshotSchema,
	createAccountSchema,
	isoDateSchema,
	MAX_EXPIRY_LOTS,
} from "./api.ts";

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

describe("createAccountSchema", () => {
	it("accepts an account with no first balance", () => {
		expect(
			createAccountSchema.safeParse({ programId: "ba-club" }).success,
		).toBe(true);
	});

	it("accepts an account with a first balance", () => {
		const body = {
			programId: "ba-club",
			snapshot: { points: 10000, observedAt: "2026-08-11" },
		};
		expect(createAccountSchema.parse(body)).toEqual(body);
	});

	it("refuses a first balance that is not correct", () => {
		for (const snapshot of [
			{ points: -1, observedAt: "2026-08-11" },
			{ points: 10.5, observedAt: "2026-08-11" },
			{ points: 10, observedAt: "2026-02-30" },
			{ points: 10 },
			null,
		]) {
			expect(
				createAccountSchema.safeParse({ programId: "ba-club", snapshot })
					.success,
			).toBe(false);
		}
	});
});

describe("addSnapshotSchema", () => {
	const snapshot = { points: 10000, observedAt: "2026-11-10" };

	it("accepts a snapshot with no lots", () => {
		expect(addSnapshotSchema.parse(snapshot)).toEqual(snapshot);
	});

	it("accepts lots below the balance", () => {
		const body = {
			...snapshot,
			lots: [
				{ points: 4000, expiresOn: "2027-03-31" },
				{ points: 1000, expiresOn: "2027-12-31" },
			],
		};
		expect(addSnapshotSchema.parse(body)).toEqual(body);
	});

	// Each point of the balance can have an expiry date.
	it("accepts lots equal to the balance", () => {
		const body = {
			...snapshot,
			lots: [
				{ points: 9000, expiresOn: "2027-03-31" },
				{ points: 1000, expiresOn: "2027-12-31" },
			],
		};
		expect(addSnapshotSchema.safeParse(body).success).toBe(true);
	});

	it("refuses lots above the balance", () => {
		const body = {
			...snapshot,
			lots: [
				{ points: 9000, expiresOn: "2027-03-31" },
				{ points: 1001, expiresOn: "2027-12-31" },
			],
		};
		expect(addSnapshotSchema.safeParse(body).success).toBe(false);
	});

	it("refuses a lot on a balance of 0", () => {
		const body = {
			points: 0,
			observedAt: "2026-11-10",
			lots: [{ points: 1, expiresOn: "2027-03-31" }],
		};
		expect(addSnapshotSchema.safeParse(body).success).toBe(false);
	});

	it("refuses a lot that is not a positive integer", () => {
		for (const points of [0, -1, 10.5]) {
			const body = {
				...snapshot,
				lots: [{ points, expiresOn: "2027-03-31" }],
			};
			expect(addSnapshotSchema.safeParse(body).success).toBe(false);
		}
	});

	it("refuses a date of a lot that does not exist", () => {
		const body = {
			...snapshot,
			lots: [{ points: 10, expiresOn: "2027-02-30" }],
		};
		expect(addSnapshotSchema.safeParse(body).success).toBe(false);
	});

	// A lot that expires before the date of the balance is not in that balance.
	it("refuses a lot that expires before the date of the balance", () => {
		const body = {
			...snapshot,
			lots: [{ points: 10, expiresOn: "2026-11-09" }],
		};
		expect(addSnapshotSchema.safeParse(body).success).toBe(false);
	});

	it("accepts a lot that expires on the date of the balance", () => {
		const body = {
			...snapshot,
			lots: [{ points: 10, expiresOn: "2026-11-10" }],
		};
		expect(addSnapshotSchema.safeParse(body).success).toBe(true);
	});

	// One date holds one lot. Two lots of one date are one quantity.
	it("refuses two lots with the same date", () => {
		const body = {
			...snapshot,
			lots: [
				{ points: 10, expiresOn: "2027-03-31" },
				{ points: 20, expiresOn: "2027-03-31" },
			],
		};
		expect(addSnapshotSchema.safeParse(body).success).toBe(false);
	});

	it("refuses more lots than the maximum", () => {
		const lots = Array.from({ length: MAX_EXPIRY_LOTS + 1 }, (_, index) => ({
			points: 1,
			expiresOn: `2027-01-${String((index % 28) + 1).padStart(2, "0")}`,
		}));
		const unique = lots.map((lot, index) => ({
			...lot,
			expiresOn: `${2027 + Math.floor(index / 28)}${lot.expiresOn.slice(4)}`,
		}));
		expect(
			addSnapshotSchema.safeParse({ ...snapshot, lots: unique }).success,
		).toBe(false);
		expect(
			addSnapshotSchema.safeParse({
				...snapshot,
				lots: unique.slice(0, MAX_EXPIRY_LOTS),
			}).success,
		).toBe(true);
	});
});
