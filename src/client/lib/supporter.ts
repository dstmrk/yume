/**
 * The logic of the section of the supporter account on the dashboard.
 * Paragraph 4.6.1 of `docs/architecture.md`.
 */

import { ALREADY_SUBSCRIBED, type MeResponse } from "../../shared/api.ts";
import { dayOf } from "./admin.ts";
import { ApiError } from "./errors.ts";

/**
 * The state of the section.
 *
 * - `hidden`: the instance holds no payment, the server did not answer, or
 *   the account is unlimited with no subscription.
 * - `offer`: the price and the button of the checkout.
 * - `activating`: Stripe opened the dashboard, and the webhook did not arrive.
 * - `renews` and `ends`: an active subscription, with the day of the renewal
 *   or of the end, in UTC.
 * - `payment_failed`: the renewal failed. The user changes the card in the
 *   portal.
 */
export type SupporterView =
	| { kind: "hidden" }
	| { kind: "offer" }
	| { kind: "activating" }
	| { kind: "renews"; day: string }
	| { kind: "ends"; day: string }
	| { kind: "payment_failed" };

/** The status of a subscription with a failed renewal. Stripe tries again. */
const FAILED: ReadonlySet<string> = new Set(["past_due", "unpaid"]);

/**
 * Gives the state of the section from `GET /api/me`.
 *
 * The subscription comes before the level: an unlimited account with a
 * subscription must find the portal, otherwise the user cannot stop it.
 * `returned` is true after the return from Stripe Checkout.
 */
export function supporterView(
	me: MeResponse | undefined,
	returned: boolean,
): SupporterView {
	const billing = me?.billing;
	if (billing === undefined || billing === null) return { kind: "hidden" };

	if (billing.status === "active" && billing.supporterUntil !== null) {
		const day = dayOf(billing.supporterUntil);
		return billing.cancels ? { kind: "ends", day } : { kind: "renews", day };
	}
	if (FAILED.has(billing.status ?? "")) return { kind: "payment_failed" };
	if (me?.tier === "unlimited") return { kind: "hidden" };
	if (returned) return { kind: "activating" };
	return { kind: "offer" };
}

/** True when the address holds the return from Stripe Checkout. */
export function checkoutReturned(search: Record<string, unknown>): boolean {
	return search.checkout === "done";
}

/** The interval of the reads of `GET /api/me` during the activation. */
export const ACTIVATION_POLL_MS = 2000;

/**
 * The time of the reads during the activation. Stripe sends the event in
 * some seconds. After this time the page stops the reads and keeps the
 * message: a reload shows the new state.
 */
export const ACTIVATION_WAIT_MS = 30_000;

/**
 * The value of `refetchInterval` of `GET /api/me`: the interval during the
 * activation, or false. `elapsed` is the time after the return from Stripe.
 */
export function activationPoll(
	view: SupporterView,
	elapsed: number,
): number | false {
	return view.kind === "activating" && elapsed < ACTIVATION_WAIT_MS
		? ACTIVATION_POLL_MS
		: false;
}

/**
 * The message of an error of the checkout or of the portal: a subscription
 * that exists, or the general message.
 */
export function supporterErrorOf(error: unknown): "already" | "unavailable" {
	return error instanceof ApiError && error.code === ALREADY_SUBSCRIBED
		? "already"
		: "unavailable";
}
