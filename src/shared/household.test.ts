import { describe, expect, it } from "vitest";
import type { HouseholdPool, Program, TransferRule } from "./catalogue.ts";
import { hasHouseholdPool, householdPotential } from "./household.ts";

const programs: Program[] = [
	{
		id: "amex-mr",
		currencyId: "amex-mr",
		code: "MR",
		name: "Amex",
		transferable: false,
	},
	{
		id: "ba-club",
		currencyId: "avios",
		code: "BA",
		name: "British Airways",
		transferable: true,
	},
	{
		id: "iberia-club",
		currencyId: "avios",
		code: "IB",
		name: "Iberia",
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

const rules: TransferRule[] = [
	{
		fromProgramId: "amex-mr",
		toProgramId: "iberia-club",
		country: "IT",
		ratioNum: 4,
		ratioDen: 5,
		minTransfer: 500,
		increment: 500,
		validFrom: "2026-01-01",
		validTo: null,
	},
];

const pool = (
	programId: string,
	extra: Partial<HouseholdPool> = {},
): HouseholdPool => ({
	programId,
	country: "IT",
	validFrom: "2026-01-01",
	validTo: null,
	...extra,
});

const at = "2026-11-24";

function compute(
	currencyId: string,
	pools: HouseholdPool[],
	members = [
		{ memberId: "a", balances: [{ programId: "ba-club", points: 1000 }] },
		{ memberId: "b", balances: [{ programId: "amex-mr", points: 1000 }] },
	],
) {
	return householdPotential({
		currencyId,
		members,
		programs,
		rules,
		pools,
		country: "IT",
		at,
	});
}

describe("householdPotential", () => {
	it("adds the totals of the members when the currency has a pool", () => {
		const result = compute("avios", [pool("ba-club")]);
		expect(result.pooled).toBe(true);
		expect(result.members.map((m) => [m.memberId, m.potential.total])).toEqual([
			["a", 1000],
			["b", 800],
		]);
		expect(result.total).toBe(1800);
	});

	it("gives no total when no programme of the currency has a pool", () => {
		const result = compute("avios", []);
		expect(result.pooled).toBe(false);
		expect(result.total).toBeNull();
		expect(result.members.map((m) => m.potential.total)).toEqual([1000, 800]);
	});

	it("accepts a pool on one programme of the currency only", () => {
		expect(compute("avios", [pool("iberia-club")]).total).toBe(1800);
	});

	it("ignores a pool of a programme of an other currency", () => {
		expect(compute("avios", [pool("flying-blue")]).total).toBeNull();
	});

	it("ignores a pool of an other country", () => {
		expect(
			compute("avios", [pool("ba-club", { country: "ES" })]).total,
		).toBeNull();
	});

	it("ignores a pool before its first date", () => {
		expect(
			compute("avios", [pool("ba-club", { validFrom: "2026-11-25" })]).total,
		).toBeNull();
	});

	it("ignores a pool on its last date, because validTo is not valid", () => {
		expect(
			compute("avios", [pool("ba-club", { validTo: "2026-11-24" })]).total,
		).toBeNull();
		expect(
			compute("avios", [pool("ba-club", { validTo: "2026-11-25" })]).total,
		).toBe(1800);
	});

	it("applies the minimum of a transfer to each member alone", () => {
		// 400 + 400 points of two people are not 800 points of one account.
		const result = compute(
			"avios",
			[pool("ba-club")],
			[
				{ memberId: "a", balances: [{ programId: "amex-mr", points: 400 }] },
				{ memberId: "b", balances: [{ programId: "amex-mr", points: 400 }] },
			],
		);
		expect(result.total).toBe(0);
	});

	it("keeps a member with no balance, with a potential of 0", () => {
		const result = compute(
			"avios",
			[pool("ba-club")],
			[{ memberId: "a", balances: [] }],
		);
		expect(result.members).toHaveLength(1);
		expect(result.members[0]?.potential.total).toBe(0);
		expect(result.total).toBe(0);
	});

	it("keeps the order of the members", () => {
		const result = compute(
			"avios",
			[],
			[
				{ memberId: "z", balances: [] },
				{ memberId: "a", balances: [] },
			],
		);
		expect(result.members.map((m) => m.memberId)).toEqual(["z", "a"]);
	});
});

describe("hasHouseholdPool", () => {
	it("reads the programmes of the currency in the country at the date", () => {
		const input = { programs, country: "IT", at };
		expect(
			hasHouseholdPool({
				...input,
				currencyId: "avios",
				pools: [pool("iberia-club")],
			}),
		).toBe(true);
		expect(
			hasHouseholdPool({
				...input,
				currencyId: "flying-blue",
				pools: [pool("iberia-club")],
			}),
		).toBe(false);
	});
});
