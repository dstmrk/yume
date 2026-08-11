import { describe, expect, it } from "vitest";
import type { AccountBalance, Program, TransferRule } from "./catalogue.js";
import { potentialMiles } from "./potential.js";

const AMEX_SOURCE = "https://www.americanexpress.com/it-it/rewards/";
const REVOLUT_SOURCE = "https://help.revolut.com/it-IT/help/revpoints/";

const programs: Program[] = [
	{
		id: "amex-mr",
		currencyId: "amex-mr",
		code: "AMEXMR",
		name: "Membership Rewards",
		transferable: false,
	},
	{
		id: "revolut",
		currencyId: "revpoints",
		code: "REVP",
		name: "RevPoints",
		transferable: false,
	},
	{
		id: "ba-club",
		currencyId: "avios",
		code: "BAEC",
		name: "The British Airways Club",
		transferable: true,
	},
	{
		id: "iberia-club",
		currencyId: "avios",
		code: "IBPLUS",
		name: "Iberia Club",
		transferable: true,
	},
	{
		id: "flying-blue",
		currencyId: "flying-blue",
		code: "FB",
		name: "Flying Blue",
		transferable: true,
	},
];

/** 5 points give 4 Avios. The minimum is 800 points, in blocks of 400. */
const amexToBritishAirways: TransferRule = {
	fromProgramId: "amex-mr",
	toProgramId: "ba-club",
	ratioNum: 4,
	ratioDen: 5,
	minTransfer: 800,
	increment: 400,
	validFrom: "2026-01-01",
	validTo: null,
	sourceUrl: AMEX_SOURCE,
};

/** 5 points give 4 Avios. The minimum is 500 points, in blocks of 500. */
const amexToIberia: TransferRule = {
	fromProgramId: "amex-mr",
	toProgramId: "iberia-club",
	ratioNum: 4,
	ratioDen: 5,
	minTransfer: 500,
	increment: 500,
	validFrom: "2026-01-01",
	validTo: null,
	sourceUrl: AMEX_SOURCE,
};

/** 1 RevPoint gives 1 Avios. */
const revolutToBritishAirways: TransferRule = {
	fromProgramId: "revolut",
	toProgramId: "ba-club",
	ratioNum: 1,
	ratioDen: 1,
	minTransfer: 1,
	increment: 1,
	validFrom: "2026-01-01",
	validTo: null,
	sourceUrl: REVOLUT_SOURCE,
};

const rules = [amexToBritishAirways, amexToIberia, revolutToBritishAirways];
const TODAY = "2026-08-11";

function avios(balances: AccountBalance[], at = TODAY) {
	return potentialMiles({ currencyId: "avios", balances, programs, rules, at });
}

describe("potentialMiles", () => {
	it("gives 0 when the user has no balance", () => {
		expect(avios([])).toEqual({
			currencyId: "avios",
			current: 0,
			fromTransfers: 0,
			total: 0,
		});
	});

	it("counts a balance of the currency one time, from each programme", () => {
		const result = avios([
			{ programId: "ba-club", points: 1000 },
			{ programId: "iberia-club", points: 500 },
		]);
		expect(result.current).toBe(1500);
		expect(result.fromTransfers).toBe(0);
		expect(result.total).toBe(1500);
	});

	it("adds the two balances of a currency and the transfers to it", () => {
		// The user has Avios in Iberia Club and in The British Airways Club. A
		// member moves Avios between the two programmes at no cost, thus the two
		// balances are one balance. The 700 Membership Rewards points then give
		// 400 Avios more, through the route of Iberia Club.
		const result = avios([
			{ programId: "ba-club", points: 1000 },
			{ programId: "iberia-club", points: 500 },
			{ programId: "amex-mr", points: 700 },
		]);
		expect(result.current).toBe(1500);
		expect(result.fromTransfers).toBe(400);
		expect(result.total).toBe(1900);
	});

	it("selects the route that gives the largest result", () => {
		// 700 points: Iberia Club gives 400 Avios, The British Airways Club gives 0.
		expect(avios([{ programId: "amex-mr", points: 700 }]).fromTransfers).toBe(
			400,
		);
		// 900 points: The British Airways Club gives 640 Avios, Iberia Club gives 400.
		expect(avios([{ programId: "amex-mr", points: 900 }]).fromTransfers).toBe(
			640,
		);
	});

	it("converts each account of the same programme alone", () => {
		const result = avios([
			{ programId: "amex-mr", points: 400 },
			{ programId: "amex-mr", points: 400 },
		]);
		expect(result.fromTransfers).toBe(0);
	});

	it("adds the balance of the currency and each source", () => {
		const result = avios([
			{ programId: "ba-club", points: 1000 },
			{ programId: "amex-mr", points: 900 },
			{ programId: "revolut", points: 250 },
		]);
		expect(result.current).toBe(1000);
		expect(result.fromTransfers).toBe(890);
		expect(result.total).toBe(1890);
	});

	it("does not use a rule that is not valid at the date", () => {
		expect(
			avios([{ programId: "amex-mr", points: 900 }], "2025-12-31").total,
		).toBe(0);
	});

	it("ignores a source that has no rule to the currency", () => {
		expect(avios([{ programId: "flying-blue", points: 5000 }]).total).toBe(0);
	});

	it("ignores a balance of a programme that the catalogue does not have", () => {
		expect(
			avios([{ programId: "not-in-the-catalogue", points: 5000 }]),
		).toEqual({
			currencyId: "avios",
			current: 0,
			fromTransfers: 0,
			total: 0,
		});
	});

	it("gives 0 for a currency that no programme uses", () => {
		const result = potentialMiles({
			currencyId: "krisflyer",
			balances: [{ programId: "amex-mr", points: 90000 }],
			programs,
			rules,
			at: TODAY,
		});
		expect(result.total).toBe(0);
	});
});
