/**
 * A Stripe of the tests.
 *
 * The client is the real client of the package `stripe`, with its own
 * transport: no test reaches the network. Thus a test reads the parameters
 * that the client really sends, and the client reads the answer as it reads
 * the answer of Stripe.
 *
 * This file holds no logic of the application, thus it has no test file.
 */

import type Stripe from "stripe";
import StripeClient from "stripe";
import { type Billing, createBilling } from "./stripe.ts";

/** The secret of the webhook of the tests. */
export const TEST_WEBHOOK_SECRET = "whsec_test_secret";

/** The price of the tests. */
export const TEST_PRICE_ID = "price_supporter";

/** One request of the client to Stripe. */
export type StripeCall = {
	method: string;
	/** The path with no query, for example `/v1/customers`. */
	path: string;
	/** The form of a `POST`, or the query of a `GET`. */
	params: URLSearchParams;
	idempotencyKey: string | null;
};

/** The answer of the Stripe of the test to one request. */
export type StripeReply = { status?: number; body: unknown };

/**
 * Makes a client of Stripe that sends each request to `reply`. Each request
 * goes also in `calls`, in the sequence of the requests.
 *
 * An error with the status 400 gives no retry of the client. Thus a test of
 * an error takes no time.
 */
export function fakeStripe(
	reply: (call: StripeCall) => StripeReply,
	livemode = false,
): { billing: Billing; calls: StripeCall[] } {
	const calls: StripeCall[] = [];
	const httpClient = StripeClient.createFetchHttpClient(async (input, init) => {
		const url = new URL(String(input));
		const headers = new Headers(init?.headers);
		const body = typeof init?.body === "string" ? init.body : "";
		const call: StripeCall = {
			method: init?.method ?? "GET",
			path: url.pathname,
			params: new URLSearchParams(init?.method === "GET" ? url.search : body),
			idempotencyKey: headers.get("idempotency-key"),
		};
		calls.push(call);
		const answer = reply(call);
		return Response.json(answer.body, {
			status: answer.status ?? 200,
			headers: { "request-id": "req_test" },
		});
	});
	const billing = createBilling(
		{
			secretKey: livemode ? "sk_live_test" : "sk_test_test",
			webhookSecret: TEST_WEBHOOK_SECRET,
			priceId: TEST_PRICE_ID,
			livemode,
		},
		httpClient,
	);
	return { billing, calls };
}

/** An error of Stripe, for `reply`. */
export const STRIPE_ERROR: StripeReply = {
	status: 400,
	body: { error: { type: "invalid_request_error", message: "Test error." } },
};

/** The fields of a subscription that a test changes. */
export type SubscriptionFields = {
	id?: string;
	customer?: string;
	status?: Stripe.Subscription.Status;
	/** The start of the period, in seconds. */
	start?: number;
	/** The end of the period, in seconds. */
	end?: number;
	cancelAtPeriodEnd?: boolean;
	cancelAt?: number | null;
	endedAt?: number | null;
};

/** The start of the period of the tests: 2026-11-10T12:00:00Z. */
export const PERIOD_START = 1_794_312_000;
/** The end of the period of the tests: one year after the start. */
export const PERIOD_END = PERIOD_START + 365 * 24 * 60 * 60;

/**
 * Makes a subscription with the fields that the webhook reads. The other
 * fields of Stripe are absent, thus the type is a cast.
 */
export function subscription(
	fields: SubscriptionFields = {},
): Stripe.Subscription {
	const start = fields.start ?? PERIOD_START;
	const end = fields.end ?? PERIOD_END;
	return {
		id: fields.id ?? "sub_1",
		object: "subscription",
		customer: fields.customer ?? "cus_1",
		status: fields.status ?? "active",
		cancel_at_period_end: fields.cancelAtPeriodEnd ?? false,
		cancel_at: fields.cancelAt ?? null,
		ended_at: fields.endedAt ?? null,
		items: {
			object: "list",
			data: [
				{
					id: "si_1",
					object: "subscription_item",
					current_period_start: start,
					current_period_end: end,
					price: { id: TEST_PRICE_ID, object: "price" },
				},
			],
		},
	} as unknown as Stripe.Subscription;
}

/** The fields of an event that a test changes. */
export type EventFields = {
	id?: string;
	/** The instant of the event, in seconds. */
	created?: number;
	livemode?: boolean;
};

/** Makes an event of Stripe with an object. */
export function stripeEvent(
	type: string,
	object: unknown,
	fields: EventFields = {},
): Stripe.Event {
	return {
		id: fields.id ?? `evt_${type}`,
		object: "event",
		type,
		created: fields.created ?? PERIOD_START,
		livemode: fields.livemode ?? false,
		api_version: "2026-10-28.endive",
		data: { object },
	} as unknown as Stripe.Event;
}

/**
 * Gives the body and the header `stripe-signature` of an event, signed with
 * the secret of the tests.
 */
export function signedEvent(
	billing: Billing,
	event: Stripe.Event,
	secret = TEST_WEBHOOK_SECRET,
): { payload: string; signature: string } {
	const payload = JSON.stringify(event);
	return {
		payload,
		signature: billing.stripe.webhooks.generateTestHeaderString({
			payload,
			secret,
		}),
	};
}
