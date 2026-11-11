import { describe, expect, it } from "vitest";
import type { MeResponse } from "../../shared/api.ts";
import type { Currency, Program } from "../../shared/catalogue.ts";
import { blockedPrograms, lotsLocked } from "./limits.ts";

const CURRENCIES: readonly Currency[] = [
	{ id: "mr", code: "MR", name: "Membership Rewards", kind: "flexible" },
	{ id: "klarna", code: "KC", name: "Klarna", kind: "flexible" },
	{ id: "avios", code: "AV", name: "Avios", kind: "airline" },
	{ id: "fb", code: "FB", name: "Flying Blue", kind: "airline" },
	{ id: "sas", code: "EB", name: "EuroBonus", kind: "airline" },
];

function program(id: string, currencyId: string): Program {
	return { id, currencyId, code: id, name: id, transferable: true };
}

const PROGRAMS: readonly Program[] = [
	program("amex-mr", "mr"),
	program("klarna", "klarna"),
	program("ba-club", "avios"),
	program("flying-blue", "fb"),
	program("sas", "sas"),
];

const FREE: MeResponse = { admin: false, limits: true, tier: "free" };

function blocked(me: MeResponse | undefined, held: string[] = []) {
	return [...blockedPrograms(me, PROGRAMS, CURRENCIES, held)].sort();
}

describe("blockedPrograms", () => {
	it("blocks Klarna for a free account", () => {
		expect(blocked(FREE)).toEqual(["klarna"]);
	});

	it("blocks the new airline programmes at the limit", () => {
		expect(blocked(FREE, ["ba-club", "flying-blue"])).toEqual([
			"klarna",
			"sas",
		]);
	});

	it("blocks nothing for an unlimited account", () => {
		expect(blocked({ ...FREE, tier: "unlimited" })).toEqual([]);
	});

	it("blocks nothing with no limits", () => {
		expect(blocked({ ...FREE, limits: false }, ["ba-club", "sas"])).toEqual([]);
	});

	// The server examines each request. A late answer or an error of
	// `GET /api/me` must not stop the form.
	it("blocks nothing before the answer of GET /api/me", () => {
		expect(blocked(undefined)).toEqual([]);
	});
});

describe("lotsLocked", () => {
	it("locks the lots of a free account with the limits", () => {
		expect(lotsLocked(FREE)).toBe(true);
	});

	it("does not lock the lots of a supporter account", () => {
		expect(lotsLocked({ ...FREE, tier: "supporter" })).toBe(false);
	});

	it("does not lock the lots with no limits", () => {
		expect(lotsLocked({ ...FREE, limits: false })).toBe(false);
	});

	it("does not lock the lots before the answer of GET /api/me", () => {
		expect(lotsLocked(undefined)).toBe(false);
	});
});
