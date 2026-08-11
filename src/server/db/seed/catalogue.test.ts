import { describe, expect, it } from "vitest";
import { currencies, programs, transferRules } from "./catalogue.ts";

/**
 * These tests examine the catalogue, not the logic. A defect in this data gives
 * an incorrect value of potential miles to the user, and the user cannot find
 * the cause.
 */

describe("the catalogue", () => {
	it("gives a different id to each currency", () => {
		const ids = currencies.map((currency) => currency.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("gives a different id to each programme", () => {
		const ids = programs.map((program) => program.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("gives an existing currency to each programme", () => {
		const currencyIds = new Set(currencies.map((currency) => currency.id));
		for (const program of programs) {
			expect(currencyIds).toContain(program.currencyId);
		}
	});
});

describe("the transfer rules", () => {
	const programIds = new Set(programs.map((program) => program.id));

	it("refers to two existing programmes", () => {
		for (const rule of transferRules) {
			expect(programIds).toContain(rule.fromProgramId);
			expect(programIds).toContain(rule.toProgramId);
		}
	});

	it("gives an official page to each rule", () => {
		for (const rule of transferRules) {
			expect(rule.sourceUrl).toMatch(/^https:\/\//);
		}
	});

	it("holds each ratio as two integers above 0", () => {
		for (const rule of transferRules) {
			expect(Number.isInteger(rule.ratioNum)).toBe(true);
			expect(Number.isInteger(rule.ratioDen)).toBe(true);
			expect(rule.ratioNum).toBeGreaterThan(0);
			expect(rule.ratioDen).toBeGreaterThan(0);
		}
	});

	it("holds a step of 1 or more and a minimum of 0 or more", () => {
		for (const rule of transferRules) {
			expect(Number.isInteger(rule.increment)).toBe(true);
			expect(rule.increment).toBeGreaterThanOrEqual(1);
			expect(Number.isInteger(rule.minTransfer)).toBe(true);
			expect(rule.minTransfer).toBeGreaterThanOrEqual(0);
		}
	});

	it("does not hold two active rules for one pair of programmes", () => {
		const active = transferRules
			.filter((rule) => rule.validTo === null)
			.map((rule) => `${rule.fromProgramId}->${rule.toProgramId}`);
		expect(new Set(active).size).toBe(active.length);
	});

	it("sends points only to a programme that accepts a transfer", () => {
		const byId = new Map(programs.map((program) => [program.id, program]));
		for (const rule of transferRules) {
			expect(byId.get(rule.toProgramId)?.transferable).toBe(true);
		}
	});
});
