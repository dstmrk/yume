import { describe, expect, it } from "vitest";
import { convert, findRule, type TransferRule } from "./conversion.js";

/** The rule of Amex Membership Rewards to Avios: 5 points give 4 Avios. */
const amexToAvios: TransferRule = {
	fromCurrencyId: "amex-mr",
	toCurrencyId: "avios",
	ratioNum: 4,
	ratioDen: 5,
	minTransfer: 800,
	increment: 1,
	validFrom: "2026-01-01",
	validTo: null,
};

function ruleWith(changes: Partial<TransferRule>): TransferRule {
	return { ...amexToAvios, ...changes };
}

describe("convert", () => {
	it("gives 0 for a balance of 0", () => {
		expect(convert(0, amexToAvios)).toBe(0);
	});

	it("gives 0 for a balance below the minimum", () => {
		expect(convert(799, amexToAvios)).toBe(0);
	});

	it("converts a balance that is equal to the minimum", () => {
		expect(convert(800, amexToAvios)).toBe(640);
	});

	it("uses the lower multiple of the increment", () => {
		const rule = ruleWith({ increment: 1000, minTransfer: 1000 });
		expect(convert(2500, rule)).toBe(1600);
	});

	it("gives 0 when the balance falls below the minimum after the step", () => {
		const rule = ruleWith({ increment: 1000, minTransfer: 2500 });
		expect(convert(2900, rule)).toBe(0);
	});

	it("gives the lower integer when the ratio does not divide exactly", () => {
		const rule = ruleWith({ minTransfer: 0 });
		expect(convert(1001, rule)).toBe(800);
	});

	it("gives 0 for a negative balance", () => {
		expect(convert(-1000, amexToAvios)).toBe(0);
	});
});

describe("findRule", () => {
	const oldRule = ruleWith({
		ratioNum: 1,
		ratioDen: 1,
		validFrom: "2025-01-01",
		validTo: "2026-01-01",
	});
	const rules = [oldRule, amexToAvios];

	it("finds the rule that is active at the date", () => {
		expect(findRule(rules, "amex-mr", "avios", "2026-08-11")).toBe(amexToAvios);
	});

	it("finds the old rule at an old date", () => {
		expect(findRule(rules, "amex-mr", "avios", "2025-06-01")).toBe(oldRule);
	});

	it("includes the first day of the rule", () => {
		expect(findRule(rules, "amex-mr", "avios", "2026-01-01")).toBe(amexToAvios);
	});

	it("does not find a rule before the first day", () => {
		expect(findRule(rules, "amex-mr", "avios", "2024-12-31")).toBeUndefined();
	});

	it("does not find a rule for a pair of currencies that has no rule", () => {
		expect(findRule(rules, "revpoints", "avios", "2026-08-11")).toBeUndefined();
	});
});
