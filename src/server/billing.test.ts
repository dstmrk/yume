import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	billingStateOf,
	handleStripeEvent,
	startCheckout,
	startPortal,
	subscriptionState,
} from "./billing.ts";
import { insertUser } from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";
import {
	stripeEvent as eventTable,
	stripeCustomer,
	user,
} from "./db/schema.ts";
import {
	fakeStripe,
	PERIOD_END,
	PERIOD_START,
	STRIPE_ERROR,
	type StripeCall,
	type StripeReply,
	stripeEvent,
	subscription,
} from "./stripe-fixtures.ts";

const NOW = new Date("2026-11-11T09:00:00Z");
const USER = "user-1";
const DAY = 24 * 60 * 60;

let db: Db;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	insertUser(db, USER);
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** Writes the customer of the user, as the checkout writes it. */
function insertCustomer(
	fields: Partial<typeof stripeCustomer.$inferInsert> = {},
): void {
	db.insert(stripeCustomer)
		.values({
			userId: USER,
			customerId: "cus_1",
			createdAt: NOW.toISOString(),
			...fields,
		})
		.run();
}

function customerRow() {
	return db
		.select()
		.from(stripeCustomer)
		.where(eq(stripeCustomer.userId, USER))
		.get();
}

function supporterUntil(): Date | null {
	return (
		db
			.select({ value: user.supporterUntil })
			.from(user)
			.where(eq(user.id, USER))
			.get()?.value ?? null
	);
}

function recordedEvents(): string[] {
	return db
		.select({ id: eventTable.id })
		.from(eventTable)
		.all()
		.map((row) => row.id);
}

/** A Stripe that refuses each request: the test expects no request. */
function noNetwork() {
	return fakeStripe(() => {
		throw new Error("The test expects no request to Stripe.");
	});
}

const seconds = (value: number) => new Date(value * 1000);

describe("subscriptionState", () => {
	it("gives the end of the period to an active subscription", () => {
		expect(subscriptionState(subscription())).toEqual({
			status: "active",
			supporterUntil: seconds(PERIOD_END),
			cancels: false,
		});
	});

	it("marks an active subscription that stops at the end of the period", () => {
		expect(
			subscriptionState(subscription({ cancelAtPeriodEnd: true })).cancels,
		).toBe(true);
	});

	// The portal can write `cancel_at` in the place of
	// `cancel_at_period_end`.
	it("marks an active subscription with a cancellation before the end", () => {
		expect(
			subscriptionState(subscription({ cancelAt: PERIOD_END })).cancels,
		).toBe(true);
		expect(
			subscriptionState(subscription({ cancelAt: PERIOD_START + DAY })).cancels,
		).toBe(true);
	});

	it("does not mark a cancellation after the end of the period", () => {
		expect(
			subscriptionState(subscription({ cancelAt: PERIOD_END + 1 })).cancels,
		).toBe(false);
	});

	// At the renewal Stripe moves the period first, then it charges the card.
	// The start of the new period is the end of the period that the user paid.
	it("gives the start of the period to a subscription with a failed payment", () => {
		expect(subscriptionState(subscription({ status: "past_due" }))).toEqual({
			status: "past_due",
			supporterUntil: seconds(PERIOD_START),
			cancels: false,
		});
	});

	for (const status of [
		"unpaid",
		"incomplete",
		"incomplete_expired",
		"paused",
		"trialing",
	] as const) {
		it(`gives the start of the period to the status ${status}`, () => {
			expect(
				subscriptionState(subscription({ status })).supporterUntil,
			).toEqual(seconds(PERIOD_START));
		});
	}

	it("gives no mark of the end to a subscription that is not active", () => {
		expect(
			subscriptionState(
				subscription({ status: "past_due", cancelAtPeriodEnd: true }),
			).cancels,
		).toBe(false);
	});

	// A refund cancels the subscription at once.
	it("gives the instant of the end to a subscription that stopped", () => {
		const endedAt = PERIOD_START + 3 * DAY;
		expect(
			subscriptionState(subscription({ status: "canceled", endedAt })),
		).toEqual({
			status: "canceled",
			supporterUntil: seconds(endedAt),
			cancels: false,
		});
	});

	it("gives no instant after the end of the period", () => {
		expect(
			subscriptionState(
				subscription({ status: "canceled", endedAt: PERIOD_END + DAY }),
			).supporterUntil,
		).toEqual(seconds(PERIOD_END));
	});

	it("gives the end of the period to a stopped subscription with no instant", () => {
		expect(
			subscriptionState(subscription({ status: "canceled", endedAt: null }))
				.supporterUntil,
		).toEqual(seconds(PERIOD_END));
	});

	it("throws for a subscription with no item", () => {
		const empty = subscription();
		empty.items.data = [];
		expect(() => subscriptionState(empty)).toThrow(/sub_1/);
	});
});

describe("handleStripeEvent", () => {
	describe("customer.subscription.updated", () => {
		it("writes the end of the period and the state of the subscription", async () => {
			insertCustomer();
			const { billing } = noNetwork();

			const outcome = await handleStripeEvent(
				db,
				billing,
				stripeEvent("customer.subscription.updated", subscription()),
				NOW,
			);

			expect(outcome).toBe("applied");
			expect(supporterUntil()).toEqual(seconds(PERIOD_END));
			expect(customerRow()).toMatchObject({
				subscriptionId: "sub_1",
				status: "active",
				cancels: false,
				lastEventAt: seconds(PERIOD_START).toISOString(),
			});
			expect(recordedEvents()).toEqual(["evt_customer.subscription.updated"]);
		});

		it("writes the mark of a subscription that stops at the end", async () => {
			insertCustomer({ subscriptionId: "sub_1", status: "active" });
			const { billing } = noNetwork();

			await handleStripeEvent(
				db,
				billing,
				stripeEvent(
					"customer.subscription.updated",
					subscription({ cancelAtPeriodEnd: true }),
				),
				NOW,
			);

			expect(customerRow()?.cancels).toBe(true);
			expect(supporterUntil()).toEqual(seconds(PERIOD_END));
		});

		it("gives the end of the paid period at a failed renewal, then the new end", async () => {
			insertCustomer({ subscriptionId: "sub_1", status: "active" });
			const { billing } = noNetwork();
			const renewal = PERIOD_END;
			const next = PERIOD_END + 365 * DAY;

			await handleStripeEvent(
				db,
				billing,
				stripeEvent(
					"customer.subscription.updated",
					subscription({ status: "past_due", start: renewal, end: next }),
					{ id: "evt_failed", created: renewal },
				),
				NOW,
			);
			expect(supporterUntil()).toEqual(seconds(renewal));
			expect(customerRow()?.status).toBe("past_due");

			await handleStripeEvent(
				db,
				billing,
				stripeEvent(
					"customer.subscription.updated",
					subscription({ start: renewal, end: next }),
					{ id: "evt_paid", created: renewal + DAY },
				),
				NOW,
			);
			expect(supporterUntil()).toEqual(seconds(next));
			expect(customerRow()?.status).toBe("active");
		});

		it("writes nothing for an event that it already processed", async () => {
			insertCustomer();
			const { billing } = noNetwork();
			const event = stripeEvent(
				"customer.subscription.updated",
				subscription(),
			);
			await handleStripeEvent(db, billing, event, NOW);
			db.update(user).set({ supporterUntil: null }).run();

			expect(await handleStripeEvent(db, billing, event, NOW)).toBe(
				"duplicate",
			);
			expect(supporterUntil()).toBeNull();
		});

		// Stripe gives no order of delivery. An older event must not bring
		// back a state that a newer event replaced.
		it("writes nothing for an event older than the last one", async () => {
			insertCustomer({
				subscriptionId: "sub_1",
				status: "active",
				cancels: true,
				lastEventAt: seconds(PERIOD_START + 10).toISOString(),
			});
			const { billing } = noNetwork();

			const outcome = await handleStripeEvent(
				db,
				billing,
				stripeEvent("customer.subscription.updated", subscription(), {
					created: PERIOD_START + 9,
				}),
				NOW,
			);

			expect(outcome).toBe("stale");
			expect(customerRow()?.cancels).toBe(true);
			expect(supporterUntil()).toBeNull();
			// The event is processed: Stripe must not send it again.
			expect(recordedEvents()).toHaveLength(1);
		});

		// Two events of Stripe can hold the same second.
		it("writes an event of the same second as the last one", async () => {
			insertCustomer({
				subscriptionId: "sub_1",
				status: "active",
				lastEventAt: seconds(PERIOD_START).toISOString(),
			});
			const { billing } = noNetwork();

			expect(
				await handleStripeEvent(
					db,
					billing,
					stripeEvent(
						"customer.subscription.updated",
						subscription({ cancelAtPeriodEnd: true }),
					),
					NOW,
				),
			).toBe("applied");
			expect(customerRow()?.cancels).toBe(true);
		});

		it("writes nothing for an other subscription of the customer", async () => {
			insertCustomer({ subscriptionId: "sub_2", status: "active" });
			const { billing } = noNetwork();

			const outcome = await handleStripeEvent(
				db,
				billing,
				stripeEvent(
					"customer.subscription.updated",
					subscription({ id: "sub_1", status: "incomplete_expired" }),
				),
				NOW,
			);

			expect(outcome).toBe("other_subscription");
			expect(customerRow()).toMatchObject({
				subscriptionId: "sub_2",
				status: "active",
			});
		});

		// After the end the subscription cannot be active again. An update of
		// the same second as the end must not give back the supporter account.
		it("writes nothing for a subscription that stopped", async () => {
			const endedAt = PERIOD_START + DAY;
			insertCustomer({
				subscriptionId: "sub_1",
				status: "canceled",
				lastEventAt: seconds(endedAt).toISOString(),
			});
			db.update(user)
				.set({ supporterUntil: seconds(endedAt) })
				.run();
			const { billing } = noNetwork();

			const outcome = await handleStripeEvent(
				db,
				billing,
				stripeEvent("customer.subscription.updated", subscription(), {
					created: endedAt,
				}),
				NOW,
			);

			expect(outcome).toBe("stale");
			expect(customerRow()?.status).toBe("canceled");
			expect(supporterUntil()).toEqual(seconds(endedAt));
		});

		// A shared account of Stripe, for example the test mode, sends the
		// events of the customers of an other application. A failure makes
		// Stripe try each one again for 3 days.
		it("ignores a customer that the application does not know", async () => {
			const { billing } = noNetwork();

			const outcome = await handleStripeEvent(
				db,
				billing,
				stripeEvent(
					"customer.subscription.updated",
					subscription({ customer: "cus_other" }),
				),
				NOW,
			);

			expect(outcome).toBe("unknown_customer");
			expect(supporterUntil()).toBeNull();
			expect(recordedEvents()).toHaveLength(1);
		});
	});

	describe("customer.subscription.deleted", () => {
		it("stops the supporter account at the end of the subscription", async () => {
			insertCustomer({ subscriptionId: "sub_1", status: "active" });
			db.update(user)
				.set({ supporterUntil: seconds(PERIOD_END) })
				.run();
			const { billing } = noNetwork();
			const endedAt = PERIOD_START + 3 * DAY;

			const outcome = await handleStripeEvent(
				db,
				billing,
				stripeEvent(
					"customer.subscription.deleted",
					subscription({ status: "canceled", endedAt }),
					{ created: endedAt },
				),
				NOW,
			);

			expect(outcome).toBe("applied");
			expect(supporterUntil()).toEqual(seconds(endedAt));
			expect(customerRow()).toMatchObject({
				subscriptionId: "sub_1",
				status: "canceled",
				cancels: false,
			});
		});

		it("writes nothing for an other subscription", async () => {
			insertCustomer({ subscriptionId: "sub_2", status: "active" });
			db.update(user)
				.set({ supporterUntil: seconds(PERIOD_END) })
				.run();
			const { billing } = noNetwork();

			const outcome = await handleStripeEvent(
				db,
				billing,
				stripeEvent(
					"customer.subscription.deleted",
					subscription({ id: "sub_1", status: "canceled" }),
				),
				NOW,
			);

			expect(outcome).toBe("other_subscription");
			expect(supporterUntil()).toEqual(seconds(PERIOD_END));
			expect(customerRow()?.status).toBe("active");
		});

		// The end arrives before the checkout. The checkout then reads the
		// subscription from Stripe, and Stripe gives the state after the end.
		it("writes nothing before the checkout of the subscription", async () => {
			insertCustomer();
			const { billing } = noNetwork();

			expect(
				await handleStripeEvent(
					db,
					billing,
					stripeEvent(
						"customer.subscription.deleted",
						subscription({ status: "canceled" }),
					),
					NOW,
				),
			).toBe("other_subscription");
			expect(customerRow()?.subscriptionId).toBeNull();
		});
	});

	describe("checkout.session.completed", () => {
		function session(fields: Record<string, unknown> = {}) {
			return {
				id: "cs_1",
				object: "checkout.session",
				mode: "subscription",
				customer: "cus_1",
				subscription: "sub_1",
				...fields,
			};
		}

		function stripeWith(reply: (call: StripeCall) => StripeReply) {
			return fakeStripe(reply);
		}

		it("reads the subscription from Stripe and writes it", async () => {
			insertCustomer();
			const { billing, calls } = stripeWith(() => ({
				body: subscription(),
			}));

			const outcome = await handleStripeEvent(
				db,
				billing,
				stripeEvent("checkout.session.completed", session()),
				NOW,
			);

			expect(outcome).toBe("applied");
			expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
				"GET /v1/subscriptions/sub_1",
			]);
			expect(supporterUntil()).toEqual(seconds(PERIOD_END));
			expect(customerRow()).toMatchObject({
				subscriptionId: "sub_1",
				status: "active",
			});
		});

		// The user bought again after the end of the first subscription.
		it("replaces a subscription that stopped", async () => {
			insertCustomer({
				subscriptionId: "sub_old",
				status: "canceled",
				lastEventAt: seconds(PERIOD_START - DAY).toISOString(),
			});
			const { billing } = stripeWith(() => ({ body: subscription() }));

			expect(
				await handleStripeEvent(
					db,
					billing,
					stripeEvent("checkout.session.completed", session()),
					NOW,
				),
			).toBe("applied");
			expect(customerRow()).toMatchObject({
				subscriptionId: "sub_1",
				status: "active",
			});
		});

		// Two checkouts at the same time can give two subscriptions. Stripe
		// charges the two, thus the log asks for a refund.
		it("writes the new subscription and logs a second active one", async () => {
			insertCustomer({ subscriptionId: "sub_old", status: "active" });
			const error = vi.spyOn(console, "error").mockImplementation(() => {});
			const { billing } = stripeWith(() => ({ body: subscription() }));

			await handleStripeEvent(
				db,
				billing,
				stripeEvent("checkout.session.completed", session()),
				NOW,
			);

			expect(customerRow()?.subscriptionId).toBe("sub_1");
			expect(error).toHaveBeenCalledWith(expect.stringContaining("sub_old"));
		});

		it("throws when Stripe does not answer, and records no event", async () => {
			insertCustomer();
			const { billing } = stripeWith(() => STRIPE_ERROR);

			await expect(
				handleStripeEvent(
					db,
					billing,
					stripeEvent("checkout.session.completed", session()),
					NOW,
				),
			).rejects.toThrow();
			expect(recordedEvents()).toEqual([]);
			expect(supporterUntil()).toBeNull();
		});

		it("sends no request for an event that it already processed", async () => {
			insertCustomer();
			const { billing, calls } = stripeWith(() => ({ body: subscription() }));
			const event = stripeEvent("checkout.session.completed", session());
			await handleStripeEvent(db, billing, event, NOW);

			expect(await handleStripeEvent(db, billing, event, NOW)).toBe(
				"duplicate",
			);
			expect(calls).toHaveLength(1);
		});

		it("ignores a checkout with no subscription", async () => {
			insertCustomer();
			const { billing } = noNetwork();

			expect(
				await handleStripeEvent(
					db,
					billing,
					stripeEvent(
						"checkout.session.completed",
						session({ mode: "payment", subscription: null }),
					),
					NOW,
				),
			).toBe("ignored");
			expect(recordedEvents()).toEqual([]);
		});
	});

	describe("the other events", () => {
		it("logs a dispute and records it", async () => {
			const error = vi.spyOn(console, "error").mockImplementation(() => {});
			const { billing } = noNetwork();

			const outcome = await handleStripeEvent(
				db,
				billing,
				stripeEvent("charge.dispute.created", {
					id: "dp_1",
					object: "dispute",
					charge: "ch_1",
					amount: 999,
					reason: "fraudulent",
				}),
				NOW,
			);

			expect(outcome).toBe("recorded");
			expect(error).toHaveBeenCalledWith(expect.stringContaining("dp_1"));
			expect(recordedEvents()).toEqual(["evt_charge.dispute.created"]);
		});

		it("ignores an event that the webhook does not read", async () => {
			const { billing } = noNetwork();

			expect(
				await handleStripeEvent(
					db,
					billing,
					stripeEvent("invoice.paid", { id: "in_1" }),
					NOW,
				),
			).toBe("ignored");
			expect(recordedEvents()).toEqual([]);
		});

		// A live key with an event of the test mode is a defect of the
		// configuration. The data of the test must not reach a real user.
		it("ignores an event of the other mode", async () => {
			insertCustomer();
			const { billing } = noNetwork();

			expect(
				await handleStripeEvent(
					db,
					billing,
					stripeEvent("customer.subscription.updated", subscription(), {
						livemode: true,
					}),
					NOW,
				),
			).toBe("livemode_mismatch");
			expect(supporterUntil()).toBeNull();
			expect(recordedEvents()).toEqual([]);
		});
	});
});

describe("billingStateOf", () => {
	it("gives no subscription and no portal to a user with no customer", () => {
		expect(billingStateOf(db, USER)).toEqual({
			status: null,
			cancels: false,
			supporterUntil: null,
			portal: false,
		});
	});

	it("gives the state of the subscription and the end of the period", () => {
		insertCustomer({
			subscriptionId: "sub_1",
			status: "active",
			cancels: true,
		});
		db.update(user)
			.set({ supporterUntil: seconds(PERIOD_END) })
			.run();

		expect(billingStateOf(db, USER)).toEqual({
			status: "active",
			cancels: true,
			supporterUntil: seconds(PERIOD_END).toISOString(),
			portal: true,
		});
	});
});

describe("startCheckout", () => {
	const URLS = {
		successUrl: "https://yume.example/dashboard?checkout=done",
		cancelUrl: "https://yume.example/dashboard",
	};

	function stripeForCheckout(customerReply?: () => void) {
		return fakeStripe((call) => {
			if (call.path === "/v1/customers") {
				customerReply?.();
				return { body: { id: "cus_new", object: "customer" } };
			}
			return {
				body: {
					id: "cs_1",
					object: "checkout.session",
					url: "https://checkout.stripe.com/c/pay/cs_1",
				},
			};
		});
	}

	it("makes the customer, then the session of the supporter account", async () => {
		const { billing, calls } = stripeForCheckout();

		const result = await startCheckout(db, billing, {
			userId: USER,
			now: NOW,
			...URLS,
		});

		expect(result).toEqual({
			ok: true,
			url: "https://checkout.stripe.com/c/pay/cs_1",
		});
		expect(calls.map((call) => call.path)).toEqual([
			"/v1/customers",
			"/v1/checkout/sessions",
		]);
		const [customer, session] = calls as [StripeCall, StripeCall];
		expect(Object.fromEntries(customer.params)).toEqual({
			email: `${USER}@example.com`,
			"metadata[userId]": USER,
		});
		expect(customer.idempotencyKey).toBe(`customer:${USER}`);
		expect(Object.fromEntries(session.params)).toEqual({
			mode: "subscription",
			customer: "cus_new",
			client_reference_id: USER,
			"line_items[0][price]": "price_supporter",
			"line_items[0][quantity]": "1",
			"subscription_data[metadata][userId]": USER,
			"consent_collection[terms_of_service]": "required",
			success_url: URLS.successUrl,
			cancel_url: URLS.cancelUrl,
		});
		expect(session.idempotencyKey).toMatch(/^[0-9a-f]{64}$/);
		expect(customerRow()).toMatchObject({
			customerId: "cus_new",
			subscriptionId: null,
			status: null,
		});
	});

	it("uses the customer of the user", async () => {
		insertCustomer({ subscriptionId: "sub_old", status: "canceled" });
		const { billing, calls } = stripeForCheckout();

		await startCheckout(db, billing, { userId: USER, now: NOW, ...URLS });

		expect(calls.map((call) => call.path)).toEqual(["/v1/checkout/sessions"]);
		expect(calls[0]?.params.get("customer")).toBe("cus_1");
	});

	for (const status of ["active", "past_due", "unpaid"]) {
		it(`refuses a second subscription with the status ${status}`, async () => {
			insertCustomer({ subscriptionId: "sub_1", status });
			const { billing, calls } = stripeForCheckout();

			expect(
				await startCheckout(db, billing, { userId: USER, now: NOW, ...URLS }),
			).toEqual({ ok: false, error: "already_subscribed" });
			expect(calls).toEqual([]);
		});
	}

	// The first payment asked for an authentication and stopped. Stripe then
	// charges nothing, thus a new checkout is correct.
	for (const status of ["incomplete", "incomplete_expired", "canceled"]) {
		it(`accepts a checkout with the status ${status}`, async () => {
			insertCustomer({ subscriptionId: "sub_1", status });
			const { billing } = stripeForCheckout();

			expect(
				(await startCheckout(db, billing, { userId: USER, now: NOW, ...URLS }))
					.ok,
			).toBe(true);
		});
	}

	// A double tap sends two requests. The key of Stripe gives one session.
	it("gives the same key to two requests of the same hour", async () => {
		insertCustomer();
		const { billing, calls } = stripeForCheckout();
		const later = new Date(NOW.getTime() + 30 * 60 * 1000);

		await startCheckout(db, billing, { userId: USER, now: NOW, ...URLS });
		await startCheckout(db, billing, { userId: USER, now: later, ...URLS });

		expect(calls[0]?.idempotencyKey).toBe(calls[1]?.idempotencyKey);
	});

	// Stripe refuses a key with other parameters, for example the return
	// address of an other language.
	it("gives an other key to an other return address", async () => {
		insertCustomer();
		const { billing, calls } = stripeForCheckout();

		await startCheckout(db, billing, { userId: USER, now: NOW, ...URLS });
		await startCheckout(db, billing, {
			userId: USER,
			now: NOW,
			...URLS,
			successUrl: "https://yume.example/en/dashboard?checkout=done",
		});

		expect(calls[0]?.idempotencyKey).not.toBe(calls[1]?.idempotencyKey);
	});

	// An other request of the user wrote its customer first. The key of the
	// customer gives the same customer to the two requests in Stripe.
	it("keeps the customer of a request that wrote it first", async () => {
		const { billing, calls } = stripeForCheckout(() => insertCustomer());

		await startCheckout(db, billing, { userId: USER, now: NOW, ...URLS });

		expect(customerRow()?.customerId).toBe("cus_1");
		expect(calls[1]?.params.get("customer")).toBe("cus_1");
	});

	it("gives an error and writes no customer when Stripe does not answer", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { billing } = fakeStripe(() => STRIPE_ERROR);

		expect(
			await startCheckout(db, billing, { userId: USER, now: NOW, ...URLS }),
		).toEqual({ ok: false, error: "payment_unavailable" });
		expect(customerRow()).toBeUndefined();
	});

	it("keeps the customer when the session fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { billing } = fakeStripe((call) =>
			call.path === "/v1/customers"
				? { body: { id: "cus_new", object: "customer" } }
				: STRIPE_ERROR,
		);

		expect(
			await startCheckout(db, billing, { userId: USER, now: NOW, ...URLS }),
		).toEqual({ ok: false, error: "payment_unavailable" });
		expect(customerRow()?.customerId).toBe("cus_new");
	});
});

describe("startPortal", () => {
	const RETURN_URL = "https://yume.example/dashboard";

	it("opens the portal of the customer", async () => {
		insertCustomer();
		const { billing, calls } = fakeStripe(() => ({
			body: {
				id: "bps_1",
				object: "billing_portal.session",
				url: "https://billing.stripe.com/p/session/1",
			},
		}));

		expect(
			await startPortal(db, billing, { userId: USER, returnUrl: RETURN_URL }),
		).toEqual({ ok: true, url: "https://billing.stripe.com/p/session/1" });
		expect(calls[0]?.path).toBe("/v1/billing_portal/sessions");
		expect(Object.fromEntries(calls[0]?.params ?? [])).toEqual({
			customer: "cus_1",
			return_url: RETURN_URL,
		});
	});

	it("gives an error to a user with no customer", async () => {
		const { billing, calls } = noNetwork();

		expect(
			await startPortal(db, billing, { userId: USER, returnUrl: RETURN_URL }),
		).toEqual({ ok: false, error: "no_customer" });
		expect(calls).toEqual([]);
	});

	it("gives an error when Stripe does not answer", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		insertCustomer();
		const { billing } = fakeStripe(() => STRIPE_ERROR);

		expect(
			await startPortal(db, billing, { userId: USER, returnUrl: RETURN_URL }),
		).toEqual({ ok: false, error: "payment_unavailable" });
	});
});
