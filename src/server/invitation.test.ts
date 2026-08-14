import { describe, expect, it } from "vitest";
import {
	endOfValidity,
	heldSlots,
	INVITATION_LIMIT,
	invitationState,
	makeCode,
	newCode,
} from "./invitation.ts";

const NOW = "2026-08-13T10:00:00.000Z";

describe("invitationState", () => {
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

describe("endOfValidity", () => {
	it("gives the moment 24 hours after the start", () => {
		expect(endOfValidity(NOW)).toBe("2026-08-14T10:00:00.000Z");
	});

	it("gives a moment that the state reads as valid", () => {
		const state = invitationState(
			{ expiresAt: endOfValidity(NOW), usedAt: null },
			NOW,
		);
		expect(state).toBe("valid");
	});

	it("gives a moment that expires after 24 hours", () => {
		const state = invitationState(
			{ expiresAt: endOfValidity(NOW), usedAt: null },
			"2026-08-14T10:00:00.001Z",
		);
		expect(state).toBe("expired");
	});
});

describe("heldSlots", () => {
	const VALID = { expiresAt: "2026-08-14T10:00:00.000Z", usedAt: null };
	const EXPIRED = { expiresAt: "2026-08-12T10:00:00.000Z", usedAt: null };
	const USED = {
		expiresAt: "2026-08-14T10:00:00.000Z",
		usedAt: "2026-08-13T09:00:00.000Z",
	};

	it("gives 0 for a user with no invitation", () => {
		expect(heldSlots([], NOW)).toBe(0);
	});

	it("counts an invitation that no person used", () => {
		expect(heldSlots([VALID], NOW)).toBe(1);
	});

	it("counts an invitation that a person used", () => {
		expect(heldSlots([USED], NOW)).toBe(1);
	});

	// An expired invitation gives the slot back. Therefore a user who writes a
	// code for a wrong address waits 24 hours and then writes an other code.
	it("does not count an invitation that expired", () => {
		expect(heldSlots([EXPIRED], NOW)).toBe(0);
	});

	// A used invitation holds its slot also after the date of the end. Thus the
	// quantity of users of one user is never more than the limit.
	it("counts an invitation that a person used before the date of the end", () => {
		const old = { expiresAt: "2026-08-12T10:00:00.000Z", usedAt: NOW };
		expect(heldSlots([old], NOW)).toBe(1);
	});

	it("counts each invitation that holds a slot", () => {
		expect(heldSlots([VALID, USED, EXPIRED], NOW)).toBe(2);
	});
});

describe("INVITATION_LIMIT", () => {
	it("gives two invitations to one user", () => {
		expect(INVITATION_LIMIT).toBe(2);
	});
});

describe("newCode", () => {
	it("gives a code of ten characters", () => {
		expect(newCode()).toHaveLength(10);
	});

	it("gives a code that is different at each call", () => {
		expect(newCode()).not.toBe(newCode());
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
