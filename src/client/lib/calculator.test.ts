import { describe, expect, it } from "vitest";
import {
	currencies,
	programs,
	transferRules,
} from "../../server/db/seed/catalogue.ts";
import { calculatorRows, readCalculatorPoints } from "./calculator.ts";
import type { Catalogue } from "./catalogue.ts";

const IT = "it-IT";
const AT = "2026-11-11";
const seed: Catalogue = { currencies, programs, rules: transferRules };

describe("readCalculatorPoints", () => {
	it("reads a number with the separator of the locale", () => {
		expect(readCalculatorPoints("12.500", IT)).toBe(12500);
		expect(readCalculatorPoints("800", IT)).toBe(800);
	});

	// An empty field is a source that the person does not hold.
	it("gives 0 to an empty field", () => {
		expect(readCalculatorPoints("", IT)).toBe(0);
		expect(readCalculatorPoints("   ", IT)).toBe(0);
	});

	it("gives null to a text that is not a quantity", () => {
		expect(readCalculatorPoints("abc", IT)).toBeNull();
		expect(readCalculatorPoints("1.9", IT)).toBeNull();
		expect(readCalculatorPoints("-500", IT)).toBeNull();
		expect(readCalculatorPoints("12,5", IT)).toBeNull();
	});
});

describe("calculatorRows", () => {
	it("gives no row with no points", () => {
		expect(
			calculatorRows({ points: {}, catalogue: seed, country: "IT", at: AT }),
		).toStrictEqual([]);
		expect(
			calculatorRows({
				points: { "amex-mr": 0 },
				catalogue: seed,
				country: "IT",
				at: AT,
			}),
		).toStrictEqual([]);
	});

	it("gives one row for each currency that the points reach", () => {
		const rows = calculatorRows({
			points: { revolut: 1000 },
			catalogue: seed,
			country: "IT",
			at: AT,
		});
		const reached = new Set(
			transferRules
				.filter((rule) => rule.fromProgramId === "revolut")
				.map(
					(rule) =>
						programs.find((program) => program.id === rule.toProgramId)
							?.currencyId,
				),
		);

		expect(rows).toHaveLength(reached.size);
	});

	// One currency holds six programmes. The row gives the best route, not the
	// sum of six routes.
	it("gives the best route of a currency with more than one programme", () => {
		const rows = calculatorRows({
			points: { "amex-mr": 1000 },
			catalogue: seed,
			country: "IT",
			at: AT,
		});
		const avios = rows.find((row) => row.currency.id === "avios");

		// Iberia takes blocks of 500 at 5 : 4: 1 000 points give 800 Avios.
		// British Airways takes blocks of 400: 800 points give 640 Avios.
		expect(avios?.total).toBe(800);
	});

	it("adds the routes of two sources into one currency", () => {
		const rows = calculatorRows({
			points: { "amex-mr": 1000, revolut: 1000 },
			catalogue: seed,
			country: "IT",
			at: AT,
		});
		const avios = rows.find((row) => row.currency.id === "avios");

		expect(avios?.total).toBe(1800);
		expect(avios?.routes.map((route) => route.fromProgramId)).toStrictEqual([
			"amex-mr",
			"revolut",
		]);
	});

	it("gives the rows from the largest value", () => {
		const rows = calculatorRows({
			points: { "amex-mr": 30_000, revolut: 5000, klarna: 2000 },
			catalogue: seed,
			country: "IT",
			at: AT,
		});
		const totals = rows.map((row) => row.total);

		expect(totals).toStrictEqual(totals.toSorted((a, b) => b - a));
	});

	it("keeps the sequence of the catalogue for two equal values", () => {
		const rows = calculatorRows({
			points: { revolut: 1000 },
			catalogue: seed,
			country: "IT",
			at: AT,
		});
		const equal = rows.filter((row) => row.total === 1000);
		const order = currencies.map((currency) => currency.id);

		expect(equal.map((row) => order.indexOf(row.currency.id))).toStrictEqual(
			equal
				.map((row) => order.indexOf(row.currency.id))
				.toSorted((a, b) => a - b),
		);
	});

	it("gives no row below the minimum of each route", () => {
		const rows = calculatorRows({
			points: { klarna: 50 },
			catalogue: seed,
			country: "IT",
			at: AT,
		});

		expect(rows).toStrictEqual([]);
	});

	it("ignores a programme that is not a source", () => {
		const rows = calculatorRows({
			points: { "ba-club": 5000 },
			catalogue: seed,
			country: "IT",
			at: AT,
		});

		expect(rows).toStrictEqual([]);
	});
});
