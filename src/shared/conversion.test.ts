import { describe, expect, it } from "vitest";
import type { TransferRule } from "./catalogue.js";
import { convert, findRule } from "./conversion.js";

/**
 * The rule of Amex Membership Rewards to The British Airways Club.
 * 5 points give 4 Avios. The minimum is 800 points, in blocks of 400.
 */
const amexToBritishAirways: TransferRule = {
	fromProgramId: "amex-mr",
	toProgramId: "ba-club",
	ratioNum: 4,
	ratioDen: 5,
	minTransfer: 800,
	increment: 400,
	validFrom: "2026-01-01",
	validTo: null,
	sourceUrl:
		"https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/British-Airways/award-cancelled-/BA-0001",
};

function ruleWith(changes: Partial<TransferRule>): TransferRule {
	return { ...amexToBritishAirways, ...changes };
}

describe("convert", () => {
	it("gives 0 for a balance of 0", () => {
		expect(convert(0, amexToBritishAirways)).toBe(0);
	});

	it("gives 0 for a balance below the minimum", () => {
		expect(convert(799, amexToBritishAirways)).toBe(0);
	});

	it("converts a balance that is equal to the minimum", () => {
		expect(convert(800, amexToBritishAirways)).toBe(640);
	});

	it("uses the lower multiple of the increment", () => {
		expect(convert(1100, amexToBritishAirways)).toBe(640);
	});

	// No rule of the catalogue has this shape now. Each minimum is a multiple of
	// its step. A future rule can break that condition, thus the test stays.
	it("gives 0 when the balance falls below the minimum after the step", () => {
		const rule = ruleWith({ minTransfer: 2500, increment: 1000 });
		expect(convert(2900, rule)).toBe(0);
	});

	it("gives the lower integer when the ratio does not divide exactly", () => {
		const rule = ruleWith({ minTransfer: 0, increment: 1 });
		expect(convert(1001, rule)).toBe(800);
	});

	it("gives 0 for a negative balance", () => {
		expect(convert(-1000, amexToBritishAirways)).toBe(0);
	});
});

describe("findRule", () => {
	const oldRule = ruleWith({
		ratioNum: 1,
		ratioDen: 1,
		validFrom: "2025-01-01",
		validTo: "2026-01-01",
	});
	const rules = [oldRule, amexToBritishAirways];

	it("finds the rule that is active at the date", () => {
		expect(findRule(rules, "amex-mr", "ba-club", "2026-08-11")).toBe(
			amexToBritishAirways,
		);
	});

	it("finds the old rule at an old date", () => {
		expect(findRule(rules, "amex-mr", "ba-club", "2025-06-01")).toBe(oldRule);
	});

	it("includes the first day of the rule", () => {
		expect(findRule(rules, "amex-mr", "ba-club", "2026-01-01")).toBe(
			amexToBritishAirways,
		);
	});

	it("does not find a rule before the first day", () => {
		expect(findRule(rules, "amex-mr", "ba-club", "2024-12-31")).toBeUndefined();
	});

	it("does not find a rule for a pair of programmes that has no rule", () => {
		expect(
			findRule(rules, "revolut-revpoints", "ba-club", "2026-08-11"),
		).toBeUndefined();
	});
});
