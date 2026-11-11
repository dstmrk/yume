/**
 * The payment of the supporter account with Stripe: the checkout, the portal
 * and the events of the webhook.
 *
 * The webhook is the only writer of `user.supporter_until`. That column holds
 * the end of the period that the user paid, and `accountTier` reads it. The
 * level thus stops by itself at the end of the period, also when an event of
 * Stripe goes away. Paragraph 4.6.1 of `docs/architecture.md` gives the
 * decision, and the skill `stripe-billing` gives the method.
 *
 * better-sqlite3 is synchronous. Thus the webhook sends its request to Stripe
 * first, then it writes the id of the event and the state in one transaction.
 * No other request runs in that transaction, and a failure writes nothing:
 * Stripe then sends the event again.
 */

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import {
	ALREADY_SUBSCRIBED,
	type BillingState,
	NO_CUSTOMER,
	PAYMENT_UNAVAILABLE,
} from "../shared/api.ts";
import type { Db } from "./db/index.ts";
import { tierSourceOf } from "./db/queries.ts";
import { stripeCustomer, stripeEvent, user } from "./db/schema.ts";
import type { Billing } from "./stripe.ts";

/**
 * The status of a subscription that Stripe can still charge. A second
 * checkout with one of them makes a second subscription, and Stripe charges
 * the two. `incomplete` is not in the list: the first payment stopped, and
 * Stripe charges nothing.
 */
const CHARGEABLE: ReadonlySet<string> = new Set([
	"active",
	"past_due",
	"unpaid",
]);

/**
 * The limits of the request of the webhook to Stripe. Stripe waits 30 seconds
 * for the answer of the webhook. The request is a read, thus a second try is
 * safe.
 */
const WEBHOOK_REQUEST: Stripe.RequestOptions = {
	timeout: 10_000,
	maxNetworkRetries: 2,
};

/** The state of a subscription that the database keeps. */
export type SubscriptionState = {
	status: Stripe.Subscription.Status;
	/** The end of the period that the user paid. */
	supporterUntil: Date;
	/** True when an active subscription stops at the end of the period. */
	cancels: boolean;
};

/**
 * Gives the state of a subscription of Stripe.
 *
 * - An active subscription gives the end of its period.
 * - A subscription that stopped gives the instant of the end, and not more
 *   than the end of its period. A refund stops it at once.
 * - Each other status gives the start of the period. At the renewal Stripe
 *   moves the period first, then it charges the card. Thus with a failed
 *   payment the start of the new period is the end of the period that the
 *   user paid. The supporter account then stops: paragraph 4.6 says that its
 *   end removes nothing.
 *
 * The version of the API `2026-10-28.endive` keeps the period on the item.
 */
export function subscriptionState(sub: Stripe.Subscription): SubscriptionState {
	const item = sub.items.data[0];
	if (item === undefined) {
		throw new Error(`The subscription ${sub.id} holds no item.`);
	}
	const start = item.current_period_start;
	const end = item.current_period_end;
	return {
		status: sub.status,
		supporterUntil: new Date(paidUntil(sub, start, end) * 1000),
		cancels:
			sub.status === "active" &&
			(sub.cancel_at_period_end ||
				(sub.cancel_at !== null && sub.cancel_at <= end)),
	};
}

/** The end of the period that the user paid, in seconds. */
function paidUntil(sub: Stripe.Subscription, start: number, end: number) {
	if (sub.status === "active") return end;
	if (sub.status === "canceled") return Math.min(sub.ended_at ?? end, end);
	return start;
}

/**
 * The result of an event. Each result gives the status 200 to Stripe. Only an
 * error gives the status 500, and then Stripe sends the event again.
 *
 * - `applied`: the event wrote the state of the subscription.
 * - `recorded`: the event wrote its id only, for example a dispute.
 * - `duplicate`: the webhook processed the event before.
 * - `stale`: the event is older than the last event of the customer, or the
 *   subscription stopped.
 * - `unknown_customer`: the customer is not a customer of Yume.
 * - `other_subscription`: the event is of a subscription that is not the last
 *   one of the customer.
 * - `ignored`: the webhook does not read that event.
 * - `livemode_mismatch`: the event is of the other mode of the key.
 */
export type WebhookOutcome =
	| "applied"
	| "recorded"
	| "duplicate"
	| "stale"
	| "unknown_customer"
	| "other_subscription"
	| "ignored"
	| "livemode_mismatch";

/**
 * Processes an event of Stripe that the route verified. The webhook reads four
 * events:
 *
 * - `checkout.session.completed` reads the subscription from Stripe and
 *   writes it. It is the only event that replaces the subscription of the
 *   customer.
 * - `customer.subscription.updated` gives the renewal, a failed payment, the
 *   return to `active` and the end that the user selects in the portal.
 * - `customer.subscription.deleted` gives the end of the subscription.
 * - `charge.dispute.created` writes a log. A person must answer it in Stripe.
 */
export async function handleStripeEvent(
	db: Db,
	billing: Billing,
	event: Stripe.Event,
	now: Date,
): Promise<WebhookOutcome> {
	if (event.livemode !== billing.livemode) return "livemode_mismatch";

	switch (event.type) {
		case "checkout.session.completed": {
			const session = event.data.object;
			const subscriptionId =
				typeof session.subscription === "string"
					? session.subscription
					: session.subscription?.id;
			if (session.mode !== "subscription" || subscriptionId === undefined) {
				return "ignored";
			}
			// The request to Stripe is not necessary for a second delivery.
			if (isRecorded(db, event.id)) return "duplicate";
			const sub = await billing.stripe.subscriptions.retrieve(
				subscriptionId,
				undefined,
				WEBHOOK_REQUEST,
			);
			return applySubscription(db, event, sub, "checkout", now);
		}
		case "customer.subscription.updated":
			return applySubscription(db, event, event.data.object, "update", now);
		case "customer.subscription.deleted":
			return applySubscription(db, event, event.data.object, "end", now);
		case "charge.dispute.created": {
			if (!recordEvent(db, event, now)) return "duplicate";
			const dispute = event.data.object;
			console.error(
				`Stripe opened the dispute ${dispute.id} of ${dispute.amount} cents (${dispute.reason}). Answer it in Stripe.`,
			);
			return "recorded";
		}
		default:
			return "ignored";
	}
}

/** True when the webhook processed the event before. */
function isRecorded(db: Db, eventId: string): boolean {
	return (
		db
			.select({ id: stripeEvent.id })
			.from(stripeEvent)
			.where(eq(stripeEvent.id, eventId))
			.get() !== undefined
	);
}

/** Writes the id of the event. It gives false when the id is already there. */
function recordEvent(
	db: Pick<Db, "insert">,
	event: Stripe.Event,
	now: Date,
): boolean {
	return (
		db
			.insert(stripeEvent)
			.values({ id: event.id, type: event.type, receivedAt: now.toISOString() })
			.onConflictDoNothing()
			.run().changes > 0
	);
}

/**
 * Writes the state of a subscription, in one transaction with the id of the
 * event.
 *
 * - The field `created` of the event must not be older than the last event of
 *   the customer. Two events of the same second are both correct.
 * - A subscription that stopped stays stopped: Stripe cannot make it active
 *   again.
 * - An update writes the last subscription of the customer only. The checkout
 *   gives that subscription. Before the checkout, the customer has no
 *   subscription, and the first update writes it.
 * - The end writes the last subscription only. Before the checkout, the
 *   checkout reads the state after the end from Stripe.
 */
function applySubscription(
	db: Db,
	event: Stripe.Event,
	sub: Stripe.Subscription,
	kind: "checkout" | "update" | "end",
	now: Date,
): WebhookOutcome {
	const state = subscriptionState(sub);
	const customerId =
		typeof sub.customer === "string" ? sub.customer : sub.customer.id;
	const eventAt = new Date(event.created * 1000).toISOString();

	return db.transaction((tx) => {
		if (!recordEvent(tx, event, now)) return "duplicate";
		const row = tx
			.select()
			.from(stripeCustomer)
			.where(eq(stripeCustomer.customerId, customerId))
			.get();
		if (row === undefined) return "unknown_customer";
		if (row.lastEventAt !== null && row.lastEventAt > eventAt) return "stale";

		const same = row.subscriptionId === sub.id;
		if (same && row.status === "canceled") return "stale";
		if (kind === "update" && row.subscriptionId !== null && !same) {
			return "other_subscription";
		}
		if (kind === "end" && !same) return "other_subscription";
		if (kind === "checkout" && !same && CHARGEABLE.has(row.status ?? "")) {
			console.error(
				`The customer ${customerId} holds the subscription ${row.subscriptionId} and the new subscription ${sub.id}. Stripe charges the two: refund one in Stripe.`,
			);
		}

		tx.update(stripeCustomer)
			.set({
				subscriptionId: sub.id,
				status: state.status,
				cancels: state.cancels,
				lastEventAt: eventAt,
			})
			.where(eq(stripeCustomer.userId, row.userId))
			.run();
		tx.update(user)
			.set({ supporterUntil: state.supporterUntil, updatedAt: now })
			.where(eq(user.id, row.userId))
			.run();
		return "applied";
	});
}

/** The row of the customer of the user, or undefined. */
function findCustomer(db: Db, userId: string) {
	return db
		.select()
		.from(stripeCustomer)
		.where(eq(stripeCustomer.userId, userId))
		.get();
}

/** The state of the payment of the user, for `GET /api/me`. */
export function billingStateOf(db: Db, userId: string): BillingState {
	const row = findCustomer(db, userId);
	return {
		status: row?.status ?? null,
		cancels: row?.cancels ?? false,
		supporterUntil:
			tierSourceOf(db, userId).supporterUntil?.toISOString() ?? null,
		portal: row !== undefined,
	};
}

/** The result of `startCheckout`. Each error has the code of the API. */
export type CheckoutResult =
	| { ok: true; url: string }
	| {
			ok: false;
			error: typeof ALREADY_SUBSCRIBED | typeof PAYMENT_UNAVAILABLE;
	  };

/**
 * Makes a session of Stripe Checkout for the supporter account and gives its
 * address.
 *
 * The customer comes first, thus the portal and a second subscription find
 * the same customer. The key of the customer is the user: two requests at the
 * same time receive one customer from Stripe. The key of the session holds
 * the hour and the two addresses: a double tap gives one session, and Stripe
 * refuses one key with other parameters.
 *
 * The session asks for the acceptance of the terms of the service. Stripe
 * shows the link of the dashboard of Stripe, thus the server holds no text.
 */
export async function startCheckout(
	db: Db,
	billing: Billing,
	input: { userId: string; successUrl: string; cancelUrl: string; now: Date },
): Promise<CheckoutResult> {
	const row = findCustomer(db, input.userId);
	if (CHARGEABLE.has(row?.status ?? "")) {
		return { ok: false, error: ALREADY_SUBSCRIBED };
	}

	try {
		const customerId =
			row?.customerId ?? (await createCustomer(db, billing, input));
		const session = await billing.stripe.checkout.sessions.create(
			{
				mode: "subscription",
				customer: customerId,
				client_reference_id: input.userId,
				line_items: [{ price: billing.priceId, quantity: 1 }],
				subscription_data: { metadata: { userId: input.userId } },
				consent_collection: { terms_of_service: "required" },
				success_url: input.successUrl,
				cancel_url: input.cancelUrl,
			},
			{ idempotencyKey: checkoutKey(input) },
		);
		if (session.url === null) {
			throw new Error(`The session ${session.id} holds no URL.`);
		}
		return { ok: true, url: session.url };
	} catch (error) {
		console.error("The checkout of Stripe failed.", error);
		return { ok: false, error: PAYMENT_UNAVAILABLE };
	}
}

/**
 * Makes the customer of the user in Stripe and writes it. An other request of
 * the user can write its customer first: that row stays, and the key of
 * Stripe gave the same customer to the two requests.
 */
async function createCustomer(
	db: Db,
	billing: Billing,
	input: { userId: string; now: Date },
): Promise<string> {
	const email = db
		.select({ email: user.email })
		.from(user)
		.where(eq(user.id, input.userId))
		.get()?.email;
	const customer = await billing.stripe.customers.create(
		{ email, metadata: { userId: input.userId } },
		{ idempotencyKey: `customer:${input.userId}` },
	);
	db.insert(stripeCustomer)
		.values({
			userId: input.userId,
			customerId: customer.id,
			createdAt: input.now.toISOString(),
		})
		.onConflictDoNothing()
		.run();
	return findCustomer(db, input.userId)?.customerId ?? customer.id;
}

/** The key of the session: the user, the hour and the two addresses. */
function checkoutKey(input: {
	userId: string;
	successUrl: string;
	cancelUrl: string;
	now: Date;
}): string {
	const hour = Math.floor(input.now.getTime() / (60 * 60 * 1000));
	return createHash("sha256")
		.update(
			`checkout:${input.userId}:${hour}:${input.successUrl}:${input.cancelUrl}`,
		)
		.digest("hex");
}

/** The result of `startPortal`. Each error has the code of the API. */
export type PortalResult =
	| { ok: true; url: string }
	| { ok: false; error: typeof NO_CUSTOMER | typeof PAYMENT_UNAVAILABLE };

/**
 * Makes a session of the customer portal of Stripe. The user changes the card,
 * reads the invoices and stops the renewal there.
 */
export async function startPortal(
	db: Db,
	billing: Billing,
	input: { userId: string; returnUrl: string },
): Promise<PortalResult> {
	const row = findCustomer(db, input.userId);
	if (row === undefined) return { ok: false, error: NO_CUSTOMER };
	try {
		const session = await billing.stripe.billingPortal.sessions.create({
			customer: row.customerId,
			return_url: input.returnUrl,
		});
		return { ok: true, url: session.url };
	} catch (error) {
		console.error("The portal of Stripe failed.", error);
		return { ok: false, error: PAYMENT_UNAVAILABLE };
	}
}
