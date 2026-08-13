import { describe, expect, it } from "vitest";
import { invitationState } from "./invitation.ts";

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
