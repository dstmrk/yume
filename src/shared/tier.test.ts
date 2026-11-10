import { describe, expect, it } from "vitest";
import { accountTier } from "./tier.ts";

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
