import { describe, expect, it } from "vitest";
import {
	currencies,
	programs,
	transferRules,
} from "../../server/db/seed/catalogue.ts";
import type {
	Currency,
	Program,
	TransferRule,
} from "../../shared/catalogue.ts";
import {
	type Catalogue,
	currencyPages,
	EXAMPLE_POINTS,
	ratioOf,
	SOURCE_SLUGS,
	sourcePages,
	unreachableCurrencies,
} from "./catalogue.ts";

const AT = "2026-11-11";

function rule(
	from: string,
	to: string,
	extra: Partial<TransferRule> = {},
): TransferRule {
	return {
		fromProgramId: from,
		toProgramId: to,
		country: "IT",
		ratioNum: 4,
		ratioDen: 5,
		minTransfer: 500,
		increment: 500,
		validFrom: "2026-08-11",
		validTo: null,
		...extra,
	};
}

const testCurrencies: Currency[] = [
	{ id: "mr", code: "MR", name: "Membership Rewards", kind: "flexible" },
	{ id: "revp", code: "REVP", name: "RevPoints", kind: "flexible" },
	{ id: "avios", code: "AVIOS", name: "Avios", kind: "airline" },
	{ id: "fb", code: "FB", name: "Flying Blue", kind: "airline" },
	{ id: "mm", code: "MM", name: "Miles & More", kind: "airline" },
];

const testPrograms: Program[] = [
	{
		id: "amex",
		currencyId: "mr",
		code: "A",
		name: "Amex",
		transferable: false,
	},
	{
		id: "revolut",
		currencyId: "revp",
		code: "R",
		name: "Revolut",
		transferable: false,
	},
	{
		id: "ba",
		currencyId: "avios",
		code: "BA",
		name: "British Airways",
		transferable: false,
	},
	{
		id: "ib",
		currencyId: "avios",
		code: "IB",
		name: "Iberia",
		transferable: false,
	},
	{
		id: "flying-blue",
		currencyId: "fb",
		code: "FB",
		name: "Flying Blue",
		transferable: false,
	},
	{
		id: "lh",
		currencyId: "mm",
		code: "LH",
		name: "Miles & More",
		transferable: false,
	},
];

const test: Catalogue = {
	currencies: testCurrencies,
	programs: testPrograms,
	rules: [
		rule("amex", "ba", { validFrom: "2026-08-12" }),
		rule("amex", "ib"),
		rule("revolut", "ba", {
			ratioNum: 1,
			ratioDen: 1,
			validFrom: "2026-10-06",
		}),
		rule("amex", "flying-blue", { ratioNum: 2, ratioDen: 3 }),
		// A closed rule is historical data. No page shows it.
		rule("revolut", "flying-blue", { validTo: "2026-09-01" }),
		// A rule of an other country gives no value to Italy.
		rule("revolut", "lh", { country: "FR" }),
	],
};

describe("currencyPages", () => {
	it("gives one page for each airline currency that a source reaches", () => {
		const pages = currencyPages(test, "IT", AT);

		expect(pages.map((page) => page.currency.id)).toStrictEqual([
			"avios",
			"fb",
		]);
	});

	it("gives each programme of the currency", () => {
		const avios = currencyPages(test, "IT", AT)[0];

		expect(avios?.programs.map((program) => program.id)).toStrictEqual([
			"ba",
			"ib",
		]);
	});

	it("gives each route of today, in the sequence of the rules", () => {
		const avios = currencyPages(test, "IT", AT)[0];

		expect(
			avios?.routes.map((route) => [route.source.id, route.target.id]),
		).toStrictEqual([
			["amex", "ba"],
			["amex", "ib"],
			["revolut", "ba"],
		]);
	});

	it("names the currency of the source", () => {
		const fb = currencyPages(test, "IT", AT)[1];

		expect(fb?.routes[0]?.sourceCurrency.name).toBe("Membership Rewards");
	});

	it("ignores a closed rule", () => {
		const fb = currencyPages(test, "IT", AT)[1];

		expect(fb?.routes.map((route) => route.source.id)).toStrictEqual(["amex"]);
	});

	it("ignores a rule of an other country", () => {
		const ids = currencyPages(test, "IT", AT).map((page) => page.currency.id);

		expect(ids).not.toContain("mm");
	});

	it("ignores a rule that starts after the date", () => {
		const pages = currencyPages(test, "IT", "2026-08-11");
		const avios = pages[0];

		expect(avios?.routes.map((route) => route.target.id)).toStrictEqual(["ib"]);
	});

	// The date of the page is the latest examination of an official page. A
	// review that changes no rule moves no date.
	it("gives the latest date of the rules as the date of the page", () => {
		const [avios, fb] = currencyPages(test, "IT", AT);

		expect(avios?.updated).toBe("2026-10-06");
		expect(fb?.updated).toBe("2026-08-11");
	});

	it("gives the sources of the currency, one time each", () => {
		const avios = currencyPages(test, "IT", AT)[0];

		expect(avios?.sources.map((source) => source.id)).toStrictEqual([
			"amex",
			"revolut",
		]);
	});
});

describe("unreachableCurrencies", () => {
	it("gives each airline currency that no source reaches", () => {
		expect(
			unreachableCurrencies(test, "IT", AT).map((currency) => currency.id),
		).toStrictEqual(["mm"]);
	});
});

describe("sourcePages", () => {
	const slugs = { amex: "amex-test", revolut: "revolut-test" };

	it("gives one page for each source with a route today", () => {
		const pages = sourcePages(test, "IT", AT, slugs);

		expect(pages.map((page) => page.slug)).toStrictEqual([
			"amex-test",
			"revolut-test",
		]);
	});

	it("groups the routes by the currency of the target", () => {
		const amex = sourcePages(test, "IT", AT, slugs)[0];

		expect(
			amex?.groups.map((group) => [
				group.currency.id,
				group.routes.map((route) => route.target.id),
			]),
		).toStrictEqual([
			["avios", ["ba", "ib"]],
			["fb", ["flying-blue"]],
		]);
	});

	it("gives the airline currencies that the source does not reach", () => {
		const revolut = sourcePages(test, "IT", AT, slugs)[1];

		expect(revolut?.unreachable.map((currency) => currency.id)).toStrictEqual([
			"fb",
			"mm",
		]);
	});

	it("gives the latest date of the rules of the source", () => {
		const amex = sourcePages(test, "IT", AT, slugs)[0];

		expect(amex?.updated).toBe("2026-08-12");
	});

	it("stops at a source with no address", () => {
		expect(() => sourcePages(test, "IT", AT, { amex: "a" })).toThrow("revolut");
	});
});

describe("ratioOf", () => {
	it("reduces the two integers of the rule", () => {
		expect(ratioOf(rule("a", "b", { ratioNum: 4, ratioDen: 5 }))).toStrictEqual(
			{ from: 5, to: 4, toHundredths: null },
		);
		expect(
			ratioOf(rule("a", "b", { ratioNum: 40, ratioDen: 50 })),
		).toStrictEqual({ from: 5, to: 4, toHundredths: null });
	});

	it("gives 1 : 1 and 2 : 1", () => {
		expect(ratioOf(rule("a", "b", { ratioNum: 1, ratioDen: 1 }))).toStrictEqual(
			{ from: 1, to: 1, toHundredths: null },
		);
		expect(ratioOf(rule("a", "b", { ratioNum: 1, ratioDen: 2 }))).toStrictEqual(
			{ from: 2, to: 1, toHundredths: null },
		);
	});

	// Klarna gives each ratio for 100 points, with two decimals. The page gives
	// the same form: 5 000 points for 4 001 Avios says the same thing, but no
	// person reads it.
	it("gives a large ratio for 100 points, in hundredths", () => {
		expect(
			ratioOf(rule("a", "b", { ratioNum: 8002, ratioDen: 10000 })),
		).toStrictEqual({ from: 100, to: null, toHundredths: 8002 });
		expect(
			ratioOf(rule("a", "b", { ratioNum: 13224, ratioDen: 10000 })),
		).toStrictEqual({ from: 100, to: null, toHundredths: 13224 });
	});

	it("keeps the reduced integers when hundredths are not exact", () => {
		expect(
			ratioOf(rule("a", "b", { ratioNum: 1, ratioDen: 30001 })),
		).toStrictEqual({ from: 30001, to: 1, toHundredths: null });
	});
});

/** The real catalogue. A change of the seed that removes a page fails here. */
describe("the pages of the seed", () => {
	const seed: Catalogue = { currencies, programs, rules: transferRules };

	it("gives a page to each airline currency that a source reaches", () => {
		const reached = new Set(
			transferRules
				.filter((item) => item.validTo === null)
				.map(
					(item) =>
						programs.find((program) => program.id === item.toProgramId)
							?.currencyId,
				),
		);

		expect(
			currencyPages(seed, "IT", AT).map((page) => page.currency.id),
		).toHaveLength(reached.size);
	});

	it("gives an address to each source", () => {
		const pages = sourcePages(seed, "IT", AT, SOURCE_SLUGS);

		expect(pages.map((page) => page.slug)).toStrictEqual([
			"amex-membership-rewards",
			"revolut-revpoints",
			"klarna-cashback",
		]);
	});

	it("gives a hundredth that is exact for each rule", () => {
		for (const item of transferRules) {
			const ratio = ratioOf(item);
			expect(ratio.to !== null || ratio.toHundredths !== null).toBe(true);
		}
	});

	it("gives an example that passes the minimum of each rule", () => {
		for (const item of transferRules) {
			expect(EXAMPLE_POINTS).toBeGreaterThanOrEqual(item.minTransfer);
		}
	});
});
