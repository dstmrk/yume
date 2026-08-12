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

	// The column `code` is unique in the database. A duplicate stops the seed
	// script, and the container does not start.
	it("gives a different code to each currency", () => {
		const codes = currencies.map((currency) => currency.code);
		expect(new Set(codes).size).toBe(codes.length);
	});

	it("gives a different code to each programme", () => {
		const codes = programs.map((program) => program.code);
		expect(new Set(codes).size).toBe(codes.length);
	});

	it("gives at least one programme to each currency", () => {
		const used = new Set(programs.map((program) => program.currencyId));
		for (const currency of currencies) {
			expect(used).toContain(currency.id);
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

	it("does not send points from a programme to itself", () => {
		for (const rule of transferRules) {
			expect(rule.fromProgramId).not.toBe(rule.toProgramId);
		}
	});

	// A flexible currency is a source. A rule to a source gives a potential value
	// to a currency that the dashboard does not show.
	it("does not send points to a flexible currency", () => {
		const kindOf = new Map(
			currencies.map((currency) => [currency.id, currency.kind]),
		);
		const currencyOf = new Map(
			programs.map((program) => [program.id, program.currencyId]),
		);
		for (const rule of transferRules) {
			const currencyId = currencyOf.get(rule.toProgramId);
			expect(kindOf.get(currencyId ?? "")).not.toBe("flexible");
		}
	});

	// This test finds a programme that a session adds without its rule. That
	// programme gives a potential of 0, and the user finds no cause.
	it("gives an active rule to each programme that accepts a transfer", () => {
		const targets = new Set(
			transferRules
				.filter((rule) => rule.validTo === null)
				.map((rule) => rule.toProgramId),
		);
		for (const program of programs.filter((one) => one.transferable)) {
			expect(targets).toContain(program.id);
		}
	});
});
