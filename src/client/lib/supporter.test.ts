import { describe, expect, it } from "vitest";
import type { BillingState, MeResponse } from "../../shared/api.ts";
import { ApiError } from "./errors.ts";
import {
	ACTIVATION_POLL_MS,
	ACTIVATION_WAIT_MS,
	activationPoll,
	checkoutReturned,
	supporterErrorOf,
	supporterView,
} from "./supporter.ts";

const UNTIL = "2027-11-10T12:00:00.000Z";

function me(
	billing: Partial<BillingState> | null,
	tier: MeResponse["tier"] = "free",
): MeResponse {
	return {
		admin: false,
		limits: true,
		tier,
		billing:
			billing === null
				? null
				: {
						status: null,
						cancels: false,
						supporterUntil: null,
						portal: false,
						...billing,
					},
	};
}

describe("supporterView", () => {
	// A self-hosted installation holds no payment.
	it("shows nothing on an instance with no payment", () => {
		expect(supporterView(me(null), false)).toEqual({ kind: "hidden" });
	});

	// With no answer of the server, the section shows no price.
	it("shows nothing before the answer of the server", () => {
		expect(supporterView(undefined, false)).toEqual({ kind: "hidden" });
	});

	it("shows the offer to a free account", () => {
		expect(supporterView(me({}), false)).toEqual({ kind: "offer" });
	});

	it("shows the date of the renewal of an active subscription", () => {
		expect(
			supporterView(
				me(
					{ status: "active", supporterUntil: UNTIL, portal: true },
					"supporter",
				),
				false,
			),
		).toEqual({ kind: "renews", day: "2027-11-10" });
	});

	it("shows the end of a subscription that stops", () => {
		expect(
			supporterView(
				me(
					{
						status: "active",
						cancels: true,
						supporterUntil: UNTIL,
						portal: true,
					},
					"supporter",
				),
				false,
			),
		).toEqual({ kind: "ends", day: "2027-11-10" });
	});

	// The supporter account stopped, and the subscription still exists. The
	// user must change the card in the portal, not buy a second subscription.
	for (const status of ["past_due", "unpaid"]) {
		it(`asks for a new card with the status ${status}`, () => {
			expect(supporterView(me({ status, portal: true }), false)).toEqual({
				kind: "payment_failed",
			});
		});
	}

	// An unlimited account pays nothing. A subscription from before the flag
	// stays visible: otherwise the user cannot stop it.
	it("shows nothing to an unlimited account with no subscription", () => {
		expect(supporterView(me({}, "unlimited"), false)).toEqual({
			kind: "hidden",
		});
	});

	it("shows the subscription of an unlimited account", () => {
		expect(
			supporterView(
				me(
					{ status: "active", supporterUntil: UNTIL, portal: true },
					"unlimited",
				),
				false,
			),
		).toEqual({ kind: "renews", day: "2027-11-10" });
	});

	// Stripe opens the dashboard before the webhook arrives.
	it("shows the activation after the return from Stripe", () => {
		expect(supporterView(me({ portal: true }), true)).toEqual({
			kind: "activating",
		});
	});

	it("shows the active subscription after the return when the webhook arrived", () => {
		expect(
			supporterView(
				me(
					{ status: "active", supporterUntil: UNTIL, portal: true },
					"supporter",
				),
				true,
			),
		).toEqual({ kind: "renews", day: "2027-11-10" });
	});

	for (const status of ["canceled", "incomplete", "incomplete_expired"]) {
		it(`shows the offer again with the status ${status}`, () => {
			expect(supporterView(me({ status, portal: true }), false)).toEqual({
				kind: "offer",
			});
		});
	}

	// A defect of the data must stop no page.
	it("shows the offer for an active subscription with no date", () => {
		expect(
			supporterView(me({ status: "active", portal: true }, "free"), false),
		).toEqual({ kind: "offer" });
	});
});

describe("checkoutReturned", () => {
	it("reads the parameter of the return from Stripe", () => {
		expect(checkoutReturned({ checkout: "done" })).toBe(true);
	});

	it("gives false with no parameter or an other value", () => {
		expect(checkoutReturned({})).toBe(false);
		expect(checkoutReturned({ checkout: "other" })).toBe(false);
		expect(checkoutReturned({ checkout: 1 })).toBe(false);
	});
});

describe("activationPoll", () => {
	it("reads the server again during the activation", () => {
		expect(activationPoll({ kind: "activating" }, 0)).toBe(ACTIVATION_POLL_MS);
		expect(activationPoll({ kind: "activating" }, ACTIVATION_WAIT_MS - 1)).toBe(
			ACTIVATION_POLL_MS,
		);
	});

	// A webhook that does not arrive must not make a request each two seconds
	// for ever. The message of the activation stays.
	it("stops at the end of the wait", () => {
		expect(activationPoll({ kind: "activating" }, ACTIVATION_WAIT_MS)).toBe(
			false,
		);
	});

	it("does not read the server again in an other state", () => {
		expect(activationPoll({ kind: "renews", day: "2027-11-10" }, 0)).toBe(
			false,
		);
		expect(activationPoll({ kind: "offer" }, 0)).toBe(false);
	});
});

describe("supporterErrorOf", () => {
	it("gives the message of a subscription that exists", () => {
		expect(
			supporterErrorOf(
				new ApiError("/api/billing/checkout", 409, "already_subscribed"),
			),
		).toBe("already");
	});

	it("gives the general message for each other error", () => {
		expect(
			supporterErrorOf(
				new ApiError("/api/billing/checkout", 503, "payment_unavailable"),
			),
		).toBe("unavailable");
		expect(supporterErrorOf(new Error("network"))).toBe("unavailable");
	});
});
