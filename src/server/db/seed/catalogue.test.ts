import { describe, expect, it } from "vitest";
import { COUNTRIES } from "../../../shared/catalogue.ts";
import { convert, findRule } from "../../../shared/conversion.ts";
import { hasHouseholdPool } from "../../../shared/household.ts";
import {
	currencies,
	HOUSEHOLD_POOLS,
	programs,
	transferRules,
} from "./catalogue.ts";
import { continuityErrors } from "./continuity.ts";

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

	/**
	 * The documents give these quantities: paragraph 3.1 and appendix 8 of
	 * `docs/architecture.md`, the section What Yume does of `README.md`, and the
	 * comments of `src/client/lib/account.ts` and `src/client/lib/cards.ts`.
	 *
	 * Those numbers came from a person, and they became old. This test makes them
	 * mechanical: a new programme in the catalogue breaks it, and the person then
	 * writes the new number in the documents.
	 */
	it("holds the quantities that the documents give", () => {
		const airline = new Set(
			currencies
				.filter((currency) => currency.kind === "airline")
				.map((currency) => currency.id),
		);
		const targets = new Set(transferRules.map((rule) => rule.toProgramId));
		const reached = programs.filter((program) => targets.has(program.id));

		expect(programs.length).toBe(30);
		expect(airline.size).toBe(22);
		expect(
			programs.filter((program) => airline.has(program.currencyId)).length,
		).toBe(27);
		expect(reached.length).toBe(22);
		expect(new Set(reached.map((program) => program.currencyId)).size).toBe(17);
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

	// The key holds the country. Two countries can give a different ratio to one
	// pair of programmes, but one country gives one valid rule on each day: the
	// next version starts on the `validTo` of the version before it.
	it("holds contiguous versions for each pair in each country", () => {
		expect(continuityErrors(transferRules)).toEqual([]);
	});

	// A country in the ISO 3166-1 alpha-2 format holds two capital letters. A
	// value with an other shape finds no rule: the comparison of `findRule` is
	// exact.
	it("holds a country of two capital letters", () => {
		for (const rule of transferRules) {
			expect(rule.country).toMatch(/^[A-Z]{2}$/);
		}
	});

	// A user selects a country of `COUNTRIES`. A rule of an other country gives
	// a value to no user, and a country with no rule gives no potential.
	it("holds the rules of each country that a user can select, and no other", () => {
		const countries = new Set(transferRules.map((rule) => rule.country));
		expect([...countries].sort()).toEqual([...COUNTRIES].sort());
	});

	it("sends points only to a programme that accepts a transfer", () => {
		const byId = new Map(programs.map((program) => [program.id, program]));
		for (const rule of transferRules) {
			expect(byId.get(rule.toProgramId)?.transferable).toBe(true);
		}
	});

	// Appendix 8 of `docs/architecture.md` names these programmes. A rule to one
	// of them must change `transferable`, and then the appendix.
	it("names the airline programmes that do not accept a transfer", () => {
		const airline = new Set(
			currencies
				.filter((currency) => currency.kind === "airline")
				.map((currency) => currency.id),
		);
		expect(
			programs
				.filter((program) => airline.has(program.currencyId))
				.filter((program) => !program.transferable)
				.map((program) => program.id),
		).toEqual(["miles-and-more", "korean-air", "ana", "jal", "qantas"]);
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

/**
 * Klarna gives a ratio with two decimals for each 100 points of cashback, for
 * example 101,43 Avios through Finnair. The catalogue keeps that ratio as two
 * integers, and `convert` gives the lower integer.
 */
describe("the rules of Klarna", () => {
	const at = "2026-10-06";
	const rule = (to: string) => {
		const found = findRule(transferRules, "klarna", to, "IT", at);
		if (!found) throw new Error(`no rule from klarna to ${to}`);
		return found;
	};

	it("gives the exact value for a balance in blocks of 100", () => {
		expect(convert(100, rule("finnair"))).toBe(101);
		expect(convert(1_000, rule("finnair"))).toBe(1_014);
		expect(convert(10_000, rule("finnair"))).toBe(10_143);
		expect(convert(10_000, rule("ba-club"))).toBe(8_002);
	});

	it("uses the lower block of 100", () => {
		expect(convert(9_999, rule("finnair"))).toBe(10_041);
	});

	it("gives 0 below one block", () => {
		expect(convert(99, rule("finnair"))).toBe(0);
	});

	it("reaches United and Thai", () => {
		expect(convert(10_000, rule("united"))).toBe(8_002);
		expect(convert(10_000, rule("thai"))).toBe(10_143);
	});

	it("gives the larger value through Finnair for Avios", () => {
		const avios = programs.filter((program) => program.currencyId === "avios");
		const best = Math.max(
			...avios
				.map((program) =>
					findRule(transferRules, "klarna", program.id, "IT", at),
				)
				.filter((found) => found !== undefined)
				.map((found) => convert(10_000, found)),
		);
		expect(best).toBe(10_143);
	});

	// Klarna Italy lowered the ratios. The page of 16 November 2026 gives 78,17,
	// 99,09 and 130,71. The rules of 6 October 2026 stay as historical data.
	it("gives the ratios of 16 November 2026 from that date", () => {
		const now = "2026-11-16";
		const ruleOn = (to: string, on: string) => {
			const found = findRule(transferRules, "klarna", to, "IT", on);
			if (!found) throw new Error(`no rule from klarna to ${to}`);
			return found;
		};
		const ratios: Record<string, number> = {
			"ba-club": 7_817,
			"iberia-club": 7_817,
			vueling: 7_817,
			"aer-lingus": 7_817,
			"flying-blue": 7_817,
			turkish: 7_817,
			avianca: 7_817,
			united: 7_817,
			finnair: 9_909,
			thai: 9_909,
			sas: 13_071,
		};
		for (const [to, value] of Object.entries(ratios)) {
			expect(convert(10_000, ruleOn(to, now))).toBe(value);
		}
		expect(convert(10_000, ruleOn("ba-club", "2026-11-15"))).toBe(8_002);
	});
});

describe("the pools of the households", () => {
	it("refers to an airline programme", () => {
		const airline = new Set(
			currencies.filter((c) => c.kind === "airline").map((c) => c.id),
		);
		for (const pool of HOUSEHOLD_POOLS) {
			const found = programs.find((p) => p.id === pool.programId);
			expect(found, pool.programId).toBeDefined();
			expect(airline.has(found?.currencyId ?? "")).toBe(true);
		}
	});

	it("holds a country that a user can select", () => {
		for (const pool of HOUSEHOLD_POOLS) {
			expect(COUNTRIES as readonly string[]).toContain(pool.country);
		}
	});

	it("holds contiguous versions for each programme in each country", () => {
		const asRules = HOUSEHOLD_POOLS.map((pool) => ({
			fromProgramId: pool.programId,
			toProgramId: pool.programId,
			country: pool.country,
			ratioNum: 1,
			ratioDen: 1,
			minTransfer: 0,
			increment: 1,
			validFrom: pool.validFrom,
			validTo: pool.validTo,
		}));
		expect(continuityErrors(asRules)).toEqual([]);
	});
});

describe("the pools of the households of 2026-11-24", () => {
	const pooled = (currencyId: string, country: string, at: string) =>
		hasHouseholdPool({
			currencyId,
			programs,
			pools: HOUSEHOLD_POOLS,
			country,
			at,
		});

	it("gives a pool to Avios and Miles & More in Italy and Spain", () => {
		for (const country of ["IT", "ES"]) {
			expect(pooled("avios", country, "2026-11-24")).toBe(true);
			expect(pooled("miles-and-more", country, "2026-11-24")).toBe(true);
		}
	});

	it("closes the pool of Emirates from January 2027", () => {
		expect(pooled("skywards", "IT", "2026-12-31")).toBe(true);
		expect(pooled("skywards", "IT", "2027-01-01")).toBe(false);
	});

	it("gives no pool to a programme of transfers only", () => {
		expect(pooled("saga-points", "IT", "2026-11-24")).toBe(false);
		expect(pooled("royal-orchid-plus", "IT", "2026-11-24")).toBe(false);
	});
});
