import { describe, expect, it } from "vitest";
import {
	currencies as realCurrencies,
	programs as realPrograms,
} from "../server/db/seed/catalogue.ts";
import type { Currency, Program } from "./catalogue.ts";
import {
	accountTier,
	canAddAccount,
	canWriteExpiryLots,
	type Entitlement,
	FREE_SOURCES,
	keepsCurrentLots,
	parseFreeAccountLimits,
} from "./tier.ts";

const NOW = new Date("2026-11-10T12:00:00Z");

describe("accountTier", () => {
	it("gives free to a user with no date and no flag", () => {
		expect(accountTier({ supporterUntil: null, unlimited: false }, NOW)).toBe(
			"free",
		);
	});

	it("gives supporter before the end of the supporter account", () => {
		const supporterUntil = new Date("2027-11-10T12:00:00Z");
		expect(accountTier({ supporterUntil, unlimited: false }, NOW)).toBe(
			"supporter",
		);
	});

	it("gives free after the end of the supporter account", () => {
		const supporterUntil = new Date("2026-11-09T12:00:00Z");
		expect(accountTier({ supporterUntil, unlimited: false }, NOW)).toBe("free");
	});

	it("gives free at the exact end of the supporter account", () => {
		expect(
			accountTier({ supporterUntil: new Date(NOW), unlimited: false }, NOW),
		).toBe("free");
	});

	it("gives supporter one millisecond before the end", () => {
		const supporterUntil = new Date(NOW.getTime() + 1);
		expect(accountTier({ supporterUntil, unlimited: false }, NOW)).toBe(
			"supporter",
		);
	});

	it("gives unlimited to a user with the flag and no date", () => {
		expect(accountTier({ supporterUntil: null, unlimited: true }, NOW)).toBe(
			"unlimited",
		);
	});

	it("gives unlimited when the supporter account also is active", () => {
		const supporterUntil = new Date("2027-11-10T12:00:00Z");
		expect(accountTier({ supporterUntil, unlimited: true }, NOW)).toBe(
			"unlimited",
		);
	});

	it("gives unlimited when the supporter account is at its end", () => {
		const supporterUntil = new Date("2025-01-01T00:00:00Z");
		expect(accountTier({ supporterUntil, unlimited: true }, NOW)).toBe(
			"unlimited",
		);
	});
});

const CURRENCIES: readonly Currency[] = [
	{ id: "mr", code: "MR", name: "Membership Rewards", kind: "flexible" },
	{ id: "revpoints", code: "RP", name: "RevPoints", kind: "flexible" },
	{ id: "klarna", code: "KC", name: "Klarna", kind: "flexible" },
	{ id: "avios", code: "AV", name: "Avios", kind: "airline" },
	{ id: "fb", code: "FB", name: "Flying Blue", kind: "airline" },
	{ id: "sas", code: "EB", name: "EuroBonus", kind: "airline" },
	{ id: "hotel", code: "HP", name: "Hotel", kind: "hotel" },
];

function program(id: string, currencyId: string): Program {
	return { id, currencyId, code: id, name: id, transferable: true };
}

const PROGRAMS: readonly Program[] = [
	program("amex-mr", "mr"),
	program("revolut", "revpoints"),
	program("klarna", "klarna"),
	program("ba-club", "avios"),
	program("iberia-club", "avios"),
	program("flying-blue", "fb"),
	program("sas", "sas"),
	program("a-hotel", "hotel"),
];

const CATALOGUE = { programs: PROGRAMS, currencies: CURRENCIES };

function canAdd(
	entitlement: Entitlement,
	programId: string,
	accountProgramIds: readonly string[] = [],
): boolean {
	return canAddAccount({
		entitlement,
		programId,
		accountProgramIds,
		catalogue: CATALOGUE,
	});
}

const FREE: Entitlement = { limits: true, tier: "free" };
const SUPPORTER: Entitlement = { limits: true, tier: "supporter" };
const UNLIMITED: Entitlement = { limits: true, tier: "unlimited" };

describe("FREE_SOURCES", () => {
	it("holds Amex and Revolut, the two sources of the affiliate links", () => {
		expect([...FREE_SOURCES].sort()).toEqual(["amex-mr", "revolut"]);
	});

	// A rename in the catalogue otherwise closes Amex to the free account, and
	// no test fails.
	it("names programmes of the catalogue", () => {
		for (const id of FREE_SOURCES) {
			const found = realPrograms.find((item) => item.id === id);
			expect(found, id).toBeDefined();
			const kind = realCurrencies.find(
				(currency) => currency.id === found?.currencyId,
			)?.kind;
			expect(kind, id).toBe("flexible");
		}
	});
});

describe("canAddAccount with the limits active", () => {
	it("gives Amex and Revolut to a free account", () => {
		expect(canAdd(FREE, "amex-mr")).toBe(true);
		expect(canAdd(FREE, "revolut")).toBe(true);
	});

	it("gives Amex to a free account that holds Amex", () => {
		expect(canAdd(FREE, "amex-mr", ["amex-mr", "ba-club", "sas"])).toBe(true);
	});

	it("refuses Klarna and a hotel programme to a free account", () => {
		expect(canAdd(FREE, "klarna")).toBe(false);
		expect(canAdd(FREE, "a-hotel")).toBe(false);
	});

	it("gives the second airline programme to a free account", () => {
		expect(canAdd(FREE, "flying-blue", ["ba-club"])).toBe(true);
	});

	it("refuses the third airline programme to a free account", () => {
		expect(canAdd(FREE, "sas", ["ba-club", "flying-blue"])).toBe(false);
	});

	// The limit counts the programmes, not the currencies. Paragraph 4.6.
	it("counts two programmes of one currency as two places", () => {
		expect(canAdd(FREE, "sas", ["ba-club", "iberia-club"])).toBe(false);
	});

	it("gives a second account in a programme that the user holds", () => {
		expect(canAdd(FREE, "ba-club", ["ba-club", "flying-blue"])).toBe(true);
	});

	it("counts each programme one time", () => {
		expect(canAdd(FREE, "flying-blue", ["ba-club", "ba-club"])).toBe(true);
	});

	it("does not count the sources in the airline places", () => {
		expect(
			canAdd(FREE, "flying-blue", ["amex-mr", "revolut", "klarna", "ba-club"]),
		).toBe(true);
	});

	// The end of a supporter account removes nothing. Paragraph 4.6.
	it("refuses an airline programme above the limit after a downgrade", () => {
		expect(canAdd(FREE, "ba-club", ["flying-blue", "sas", "iberia-club"])).toBe(
			false,
		);
	});

	it("refuses a programme that is not in the catalogue", () => {
		expect(canAdd(FREE, "nothing")).toBe(false);
		expect(canAdd(SUPPORTER, "nothing")).toBe(false);
	});

	for (const entitlement of [SUPPORTER, UNLIMITED]) {
		it(`gives each programme to a ${entitlement.tier} account`, () => {
			const held = ["ba-club", "flying-blue", "sas"];
			expect(canAdd(entitlement, "klarna", held)).toBe(true);
			expect(canAdd(entitlement, "a-hotel", held)).toBe(true);
			expect(canAdd(entitlement, "iberia-club", held)).toBe(true);
		});
	}
});

describe("canAddAccount with no limits", () => {
	it("gives each programme to a free account", () => {
		const none: Entitlement = { limits: false, tier: "free" };
		expect(canAdd(none, "klarna")).toBe(true);
		expect(canAdd(none, "sas", ["ba-club", "flying-blue"])).toBe(true);
	});

	it("refuses a programme that is not in the catalogue", () => {
		expect(canAdd({ limits: false, tier: "free" }, "nothing")).toBe(false);
	});
});

describe("canWriteExpiryLots", () => {
	it("refuses the lots to a free account with the limits active", () => {
		expect(canWriteExpiryLots(FREE)).toBe(false);
	});

	it("gives the lots to a supporter account and to an unlimited account", () => {
		expect(canWriteExpiryLots(SUPPORTER)).toBe(true);
		expect(canWriteExpiryLots(UNLIMITED)).toBe(true);
	});

	it("gives the lots to a free account with no limits", () => {
		expect(canWriteExpiryLots({ limits: false, tier: "free" })).toBe(true);
	});
});

describe("parseFreeAccountLimits", () => {
	it("gives false with no value", () => {
		expect(parseFreeAccountLimits(undefined)).toBe(false);
		expect(parseFreeAccountLimits("")).toBe(false);
	});

	it("reads true and false", () => {
		expect(parseFreeAccountLimits("true")).toBe(true);
		expect(parseFreeAccountLimits("false")).toBe(false);
	});

	// A defect in the variable of the official instance must not open each
	// function to each user.
	for (const value of ["ture", "1", "yes", "TRUE", " true", "on"]) {
		it(`refuses the value ${JSON.stringify(value)}`, () => {
			expect(() => parseFreeAccountLimits(value)).toThrow(
				"FREE_ACCOUNT_LIMITS",
			);
		});
	}
});

describe("keepsCurrentLots", () => {
	const MARCH = { points: 500, expiresOn: "2027-03-31" };
	const JUNE = { points: 300, expiresOn: "2027-06-30" };

	it("accepts the same lots in an other order", () => {
		expect(keepsCurrentLots([JUNE, MARCH], [MARCH, JUNE])).toBe(true);
	});

	it("accepts a part of the current lots", () => {
		expect(keepsCurrentLots([MARCH], [MARCH, JUNE])).toBe(true);
	});

	it("accepts no lot", () => {
		expect(keepsCurrentLots([], [MARCH])).toBe(true);
		expect(keepsCurrentLots([], [])).toBe(true);
	});

	it("refuses a lot with a new date", () => {
		expect(
			keepsCurrentLots([{ points: 500, expiresOn: "2027-04-30" }], [MARCH]),
		).toBe(false);
	});

	it("refuses a lot with other points at the same date", () => {
		expect(
			keepsCurrentLots([{ points: 501, expiresOn: "2027-03-31" }], [MARCH]),
		).toBe(false);
	});

	it("refuses a lot when the current balance holds no lot", () => {
		expect(keepsCurrentLots([MARCH], [])).toBe(false);
	});

	it("refuses one lot two times", () => {
		expect(keepsCurrentLots([MARCH, MARCH], [MARCH])).toBe(false);
	});
});
