import { describe, expect, it } from "vitest";
import { invitationState, makeCode } from "./invitation.ts";

const NOW = "2026-08-13T10:00:00.000Z";

describe("invitationState", () => {
	it("gives unknown when the code has no invitation", () => {
		expect(invitationState(undefined, NOW)).toBe("unknown");
	});

	it("gives valid when the invitation expires later", () => {
		const state = invitationState(
			{ expiresAt: "2026-08-20T10:00:00.000Z", usedAt: null },
			NOW,
		);
		expect(state).toBe("valid");
	});

	it("gives expired when the date of the end passed", () => {
		const state = invitationState(
			{ expiresAt: "2026-08-13T09:59:59.000Z", usedAt: null },
			NOW,
		);
		expect(state).toBe("expired");
	});

	it("gives expired at the exact date of the end", () => {
		const state = invitationState({ expiresAt: NOW, usedAt: null }, NOW);
		expect(state).toBe("expired");
	});

	it("gives used when the invitation has a date of use", () => {
		const state = invitationState(
			{
				expiresAt: "2026-08-20T10:00:00.000Z",
				usedAt: "2026-08-12T08:00:00.000Z",
			},
			NOW,
		);
		expect(state).toBe("used");
	});

	// A used invitation that also expired stays used. The two states give the
	// same result, thus the order is only a rule for the message.
	it("gives used when the invitation is used and expired", () => {
		const state = invitationState(
			{
				expiresAt: "2026-08-01T10:00:00.000Z",
				usedAt: "2026-07-30T08:00:00.000Z",
			},
			NOW,
		);
		expect(state).toBe("used");
	});

	it("gives valid with a date of the end that holds no time", () => {
		expect(
			invitationState({ expiresAt: "2026-08-20", usedAt: null }, NOW),
		).toBe("valid");
	});

	// The function refuses a date that it cannot read. A date with a defect must
	// not give access to the application.
	it("gives expired with a date that is not correct", () => {
		expect(
			invitationState({ expiresAt: "not a date", usedAt: null }, NOW),
		).toBe("expired");
	});
});

describe("makeCode", () => {
	it("gives one character for each byte", () => {
		expect(makeCode(new Uint8Array(10))).toHaveLength(10);
	});

	it("gives the same code for the same bytes", () => {
		const bytes = new Uint8Array([0, 1, 2, 3]);
		expect(makeCode(bytes)).toBe(makeCode(bytes));
	});

	it("gives no character that is easy to read in a wrong way", () => {
		const all = makeCode(new Uint8Array(256).map((_, index) => index));
		expect(all).not.toMatch(/[IO01]/);
	});

	// The alphabet holds 32 characters and one byte holds 256 values. Therefore
	// each character arrives 8 times, and no character is more frequent.
	it("gives each character with the same frequency", () => {
		const all = makeCode(new Uint8Array(256).map((_, index) => index));
		const count = new Map<string, number>();
		for (const character of all) {
			count.set(character, (count.get(character) ?? 0) + 1);
		}

		expect(count.size).toBe(32);
		expect([...count.values()]).toEqual(new Array(32).fill(8));
	});
});
