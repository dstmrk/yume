import { describe, expect, it } from "vitest";
import type { MeResponse } from "../../shared/api.ts";
import type { HouseholdPotential } from "../../shared/household.ts";
import type { PotentialMiles } from "../../shared/potential.ts";
import { ApiError } from "./errors.ts";
import {
	canCreateHousehold,
	cardValue,
	householdCards,
	householdErrorKey,
} from "./household.ts";

const miles = (total: number): PotentialMiles => ({
	currencyId: "x",
	current: total,
	fromTransfers: 0,
	total,
	routes: [],
});

function row(
	currencyId: string,
	totals: number[],
	pooled: boolean,
): HouseholdPotential {
	return {
		currencyId,
		pooled,
		members: totals.map((total, index) => ({
			memberId: `m${index}`,
			potential: miles(total),
		})),
		total: pooled ? totals.reduce((a, b) => a + b, 0) : null,
	};
}

describe("cardValue", () => {
	it("gives the total of a currency with a pool", () => {
		expect(cardValue(row("avios", [100, 200], true))).toBe(300);
	});

	it("gives the largest member of a currency with no pool", () => {
		expect(cardValue(row("avios", [100, 200], false))).toBe(200);
	});
});

describe("householdCards", () => {
	it("removes a currency with a potential of 0 for each member", () => {
		expect(
			householdCards([row("a", [0, 0], true), row("b", [0, 5], false)]).map(
				(card) => card.currencyId,
			),
		).toEqual(["b"]);
	});

	it("goes from the largest value to the smallest one", () => {
		expect(
			householdCards([
				row("small", [10], true),
				row("split", [50, 60], false),
				row("pooled", [50, 60], true),
			]).map((card) => card.currencyId),
		).toEqual(["pooled", "split", "small"]);
	});
});

describe("householdErrorKey", () => {
	const error = (code: string | null, status = 409) =>
		new ApiError("/api/household", status, code);

	it("gives the message of each code of the household", () => {
		expect(householdErrorKey(error("country_mismatch"))).toBe(
			"countryMismatch",
		);
		expect(householdErrorKey(error("household_full"))).toBe("full");
		expect(householdErrorKey(error("already_member"))).toBe("alreadyMember");
		expect(householdErrorKey(error("already_in_household"))).toBe(
			"alreadyInHousehold",
		);
		expect(householdErrorKey(error("supporter_required", 403))).toBe(
			"supporterRequired",
		);
		expect(householdErrorKey(error("invalid_body", 400))).toBe("invalid");
	});

	it("gives the general message to an other error", () => {
		expect(householdErrorKey(error(null, 500))).toBe("general");
		expect(householdErrorKey(new Error("network"))).toBe("general");
	});
});

describe("canCreateHousehold", () => {
	const me = (tier: MeResponse["tier"], limits: boolean): MeResponse => ({
		admin: false,
		limits,
		tier,
		billing: null,
		country: "IT",
	});

	it("follows the level of the user and the limits", () => {
		expect(canCreateHousehold(me("free", true))).toBe(false);
		expect(canCreateHousehold(me("supporter", true))).toBe(true);
		expect(canCreateHousehold(me("free", false))).toBe(true);
	});

	it("blocks nothing with no answer of the server", () => {
		expect(canCreateHousehold(undefined)).toBe(true);
	});
});
