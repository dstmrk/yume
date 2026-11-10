import { describe, expect, it } from "vitest";
import type { TransferRule } from "../../../shared/catalogue.ts";
import { continuityErrors } from "./continuity.ts";

function rule(
	validFrom: string,
	validTo: string | null,
	overrides: Partial<TransferRule> = {},
): TransferRule {
	return {
		fromProgramId: "amex-mr",
		toProgramId: "iberia",
		country: "IT",
		ratioNum: 4,
		ratioDen: 5,
		minTransfer: 500,
		increment: 500,
		validFrom,
		validTo,
		...overrides,
	};
}

describe("continuityErrors", () => {
	it("accepts one active version", () => {
		expect(continuityErrors([rule("2026-01-01", null)])).toEqual([]);
	});

	it("accepts two contiguous versions", () => {
		expect(
			continuityErrors([
				rule("2026-01-01", "2026-06-01"),
				rule("2026-06-01", null),
			]),
		).toEqual([]);
	});

	it("accepts the versions in any order", () => {
		expect(
			continuityErrors([
				rule("2026-06-01", null),
				rule("2026-01-01", "2026-06-01"),
			]),
		).toEqual([]);
	});

	// A partner can leave the programme: then the last version is closed and no
	// version follows it.
	it("accepts a pair with a closed last version", () => {
		expect(continuityErrors([rule("2026-01-01", "2026-06-01")])).toEqual([]);
	});

	// The error of the comment of `validTo` before the correction: the author
	// writes the last valid day in `validTo`, and on that day no rule is valid.
	it("refuses a gap of one day", () => {
		expect(
			continuityErrors([
				rule("2026-01-01", "2026-05-31"),
				rule("2026-06-01", null),
			]),
		).toEqual(["amex-mr->iberia@IT: gap from 2026-05-31 to 2026-06-01"]);
	});

	it("refuses an overlap", () => {
		expect(
			continuityErrors([
				rule("2026-01-01", "2026-06-02"),
				rule("2026-06-01", null),
			]),
		).toEqual(["amex-mr->iberia@IT: overlap from 2026-06-01 to 2026-06-02"]);
	});

	it("refuses two active versions", () => {
		expect(
			continuityErrors([rule("2026-01-01", null), rule("2026-06-01", null)]),
		).toEqual(["amex-mr->iberia@IT: overlap from 2026-06-01"]);
	});

	it("refuses two versions with the same start", () => {
		expect(
			continuityErrors([
				rule("2026-01-01", "2026-06-01"),
				rule("2026-01-01", null),
			]),
		).toEqual(["amex-mr->iberia@IT: overlap from 2026-01-01 to 2026-06-01"]);
	});

	// `isValidAt` reads `validFrom <= at < validTo`: such a version is valid on
	// no day.
	it("refuses a version that ends on or before its start", () => {
		expect(continuityErrors([rule("2026-06-01", "2026-06-01")])).toEqual([
			"amex-mr->iberia@IT: empty version from 2026-06-01 to 2026-06-01",
		]);
	});

	it("examines each pair and each country alone", () => {
		expect(
			continuityErrors([
				rule("2026-01-01", null),
				rule("2026-06-01", null, { toProgramId: "british-airways" }),
				rule("2026-06-01", null, { country: "FR" }),
			]),
		).toEqual([]);
	});
});
