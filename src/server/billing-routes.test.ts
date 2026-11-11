/**
 * The routes of the payment: the checkout, the portal and the webhook of
 * Stripe. `billing.test.ts` examines the rules of each event. This file
 * examines the HTTP: the session, the body, the signature and the statuses.
 */

import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, MAX_BODY_BYTES, MAX_WEBHOOK_BYTES } from "./app.ts";
import { createAuth } from "./auth.ts";
import { insertUser, sessionCookie } from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";
import { stripeCustomer, user } from "./db/schema.ts";
import type { Billing } from "./stripe.ts";
import {
	fakeStripe,
	PERIOD_END,
	STRIPE_ERROR,
	type StripeCall,
	type StripeReply,
	signedEvent,
	stripeEvent,
	subscription,
} from "./stripe-fixtures.ts";

const BASE_URL = "http://localhost:3000";
const VITE_URL = "http://localhost:5173";

let db: Db;
let auth: ReturnType<typeof createAuth>;
let userId: string;
let cookie: string;

beforeEach(async () => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	auth = createAuth(db, {
		secret: "a-secret-for-the-test",
		baseURL: BASE_URL,
		google: { clientId: "client-id-test", clientSecret: "client-secret-test" },
	});
	userId = insertUser(db, "primo");
	cookie = await sessionCookie(auth, userId);
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** The application with the payment, and the requests to Stripe. */
function appWith(
	reply: (call: StripeCall) => StripeReply = () => ({ body: {} }),
) {
	const { billing, calls } = fakeStripe(reply);
	return {
		app: createApp(db, auth, [BASE_URL, VITE_URL], { billing }),
		billing,
		calls,
	};
}

function insertCustomer(status: string | null = null): void {
	db.insert(stripeCustomer)
		.values({
			userId,
			customerId: "cus_1",
			subscriptionId: status === null ? null : "sub_1",
			status,
			createdAt: new Date().toISOString(),
		})
		.run();
}

function postJson(
	app: ReturnType<typeof createApp>,
	path: string,
	body: unknown,
	headers: Record<string, string> = {},
) {
	return app.request(path, {
		method: "POST",
		headers: { "content-type": "application/json", cookie, ...headers },
		body: JSON.stringify(body),
	});
}

/** A delivery of Stripe: no cookie, no `Origin`, the type of Stripe. */
function deliver(
	app: ReturnType<typeof createApp>,
	payload: string,
	signature?: string,
) {
	return app.request("/api/stripe/webhook", {
		method: "POST",
		headers: {
			"content-type": "application/json; charset=utf-8",
			...(signature === undefined ? {} : { "stripe-signature": signature }),
		},
		body: payload,
	});
}

function supporterUntil(): Date | null {
	return (
		db
			.select({ value: user.supporterUntil })
			.from(user)
			.where(eq(user.id, userId))
			.get()?.value ?? null
	);
}

const SESSION_REPLY: StripeReply = {
	body: {
		id: "cs_1",
		object: "checkout.session",
		url: "https://checkout.stripe.com/c/pay/cs_1",
	},
};

describe("an instance with no payment", () => {
	const app = () => createApp(db, auth, [BASE_URL]);

	it("holds no route of the checkout and of the portal", async () => {
		for (const path of ["/api/billing/checkout", "/api/billing/portal"]) {
			const response = await postJson(app(), path, { locale: "it" });
			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({ error: "not_found" });
		}
	});

	it("holds no webhook", async () => {
		const response = await deliver(app(), "{}", "t=1,v1=abc");
		expect(response.status).toBe(404);
	});

	it("gives no state of the payment", async () => {
		const response = await app().request("/api/me", { headers: { cookie } });
		expect(await response.json()).toMatchObject({ billing: null });
	});
});

describe("GET /api/me with the payment", () => {
	it("gives the state of the payment of the user", async () => {
		const { app } = appWith();
		insertCustomer("active");
		db.update(user)
			.set({ supporterUntil: new Date(PERIOD_END * 1000) })
			.where(eq(user.id, userId))
			.run();

		const response = await app.request("/api/me", { headers: { cookie } });

		expect(await response.json()).toMatchObject({
			tier: "supporter",
			billing: {
				status: "active",
				cancels: false,
				supporterUntil: new Date(PERIOD_END * 1000).toISOString(),
				portal: true,
			},
		});
	});
});

describe("POST /api/billing/checkout", () => {
	it("gives the address of Stripe Checkout", async () => {
		const { app, calls } = appWith((call) =>
			call.path === "/v1/customers"
				? { body: { id: "cus_new", object: "customer" } }
				: SESSION_REPLY,
		);

		const response = await postJson(app, "/api/billing/checkout", {
			locale: "it",
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			url: "https://checkout.stripe.com/c/pay/cs_1",
		});
		const session = calls.find((call) => call.path === "/v1/checkout/sessions");
		expect(session?.params.get("success_url")).toBe(
			`${BASE_URL}/dashboard?checkout=done`,
		);
		expect(session?.params.get("cancel_url")).toBe(`${BASE_URL}/dashboard`);
	});

	// In development the page is on the client of Vite, an origin of
	// `TRUSTED_ORIGINS`.
	it("returns to the origin of the page when the application knows it", async () => {
		insertCustomer();
		const { app, calls } = appWith(() => SESSION_REPLY);

		await postJson(
			app,
			"/api/billing/checkout",
			{ locale: "it" },
			{ origin: VITE_URL },
		);

		expect(calls[0]?.params.get("success_url")).toBe(
			`${VITE_URL}/dashboard?checkout=done`,
		);
	});

	it("returns to the origin of the application for an other origin", async () => {
		insertCustomer();
		const { app, calls } = appWith(() => SESSION_REPLY);

		await postJson(
			app,
			"/api/billing/checkout",
			{ locale: "it" },
			{ origin: "https://other.example" },
		);

		expect(calls[0]?.params.get("success_url")).toBe(
			`${BASE_URL}/dashboard?checkout=done`,
		);
	});

	it("needs a session", async () => {
		const { app, calls } = appWith();

		const response = await app.request("/api/billing/checkout", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ locale: "it" }),
		});

		expect(response.status).toBe(401);
		expect(calls).toEqual([]);
	});

	it("refuses a body that is not correct", async () => {
		const { app, calls } = appWith();

		const response = await postJson(app, "/api/billing/checkout", {
			locale: "it",
			successUrl: "https://other.example",
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: "invalid_body" });
		expect(calls).toEqual([]);
	});

	it("refuses a second subscription with the status 409", async () => {
		insertCustomer("active");
		const { app } = appWith();

		const response = await postJson(app, "/api/billing/checkout", {
			locale: "it",
		});

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: "already_subscribed" });
	});

	it("gives the status 503 when Stripe does not answer", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { app } = appWith(() => STRIPE_ERROR);

		const response = await postJson(app, "/api/billing/checkout", {
			locale: "it",
		});

		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ error: "payment_unavailable" });
	});
});

describe("POST /api/billing/portal", () => {
	it("gives the address of the portal, with the return to the dashboard", async () => {
		insertCustomer("active");
		const { app, calls } = appWith(() => ({
			body: {
				id: "bps_1",
				object: "billing_portal.session",
				url: "https://billing.stripe.com/p/session/1",
			},
		}));

		const response = await postJson(app, "/api/billing/portal", {
			locale: "it",
		});

		expect(await response.json()).toEqual({
			url: "https://billing.stripe.com/p/session/1",
		});
		expect(calls[0]?.params.get("return_url")).toBe(`${BASE_URL}/dashboard`);
	});

	it("gives the status 404 to a user with no customer", async () => {
		const { app } = appWith();

		const response = await postJson(app, "/api/billing/portal", {
			locale: "it",
		});

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "no_customer" });
	});

	it("gives the status 503 when Stripe does not answer", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		insertCustomer("active");
		const { app } = appWith(() => STRIPE_ERROR);

		const response = await postJson(app, "/api/billing/portal", {
			locale: "it",
		});

		expect(response.status).toBe(503);
	});
});

describe("POST /api/stripe/webhook", () => {
	function updated(billing: Billing, object: unknown = subscription()) {
		return signedEvent(
			billing,
			stripeEvent("customer.subscription.updated", object),
		);
	}

	// Stripe sends no cookie and no `Origin`.
	it("accepts an event of Stripe with no session", async () => {
		insertCustomer();
		const { app, billing } = appWith();
		const { payload, signature } = updated(billing);

		const response = await deliver(app, payload, signature);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ received: true });
		expect(supporterUntil()).toEqual(new Date(PERIOD_END * 1000));
	});

	it("refuses a body with no signature", async () => {
		insertCustomer();
		const { app, billing } = appWith();

		const response = await deliver(app, updated(billing).payload);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "invalid_signature" });
		expect(supporterUntil()).toBeNull();
	});

	it("refuses a signature with an other secret", async () => {
		insertCustomer();
		const { app, billing } = appWith();
		const { payload, signature } = signedEvent(
			billing,
			stripeEvent("customer.subscription.updated", subscription()),
			"whsec_other",
		);

		expect((await deliver(app, payload, signature)).status).toBe(400);
		expect(supporterUntil()).toBeNull();
	});

	it("refuses a body that changed after the signature", async () => {
		insertCustomer();
		const { app, billing } = appWith();
		const { payload, signature } = updated(billing);

		const changed = payload.replace(String(PERIOD_END), String(PERIOD_END + 1));
		expect(changed).not.toBe(payload);
		expect((await deliver(app, changed, signature)).status).toBe(400);
		expect(supporterUntil()).toBeNull();
	});

	// The other routes keep the limit of 16 KB.
	it("accepts an event above the limit of the other routes", async () => {
		insertCustomer();
		const { app, billing } = appWith();
		const large = {
			...subscription(),
			description: "x".repeat(MAX_BODY_BYTES * 2),
		};
		const { payload, signature } = updated(billing, large);
		expect(payload.length).toBeGreaterThan(MAX_BODY_BYTES);

		expect((await deliver(app, payload, signature)).status).toBe(200);
		expect(supporterUntil()).toEqual(new Date(PERIOD_END * 1000));
	});

	it("refuses a body above its own limit", async () => {
		const { app, billing } = appWith();
		const { payload, signature } = updated(billing, {
			...subscription(),
			description: "x".repeat(MAX_WEBHOOK_BYTES),
		});

		const response = await deliver(app, payload, signature);

		expect(response.status).toBe(413);
	});

	// Stripe sends the event again after the status 500.
	it("gives the status 500 at an error, then applies the second delivery", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		insertCustomer();
		let stripeAnswers = false;
		const { app, billing } = appWith(() =>
			stripeAnswers ? { body: subscription() } : STRIPE_ERROR,
		);
		const { payload, signature } = signedEvent(
			billing,
			stripeEvent("checkout.session.completed", {
				id: "cs_1",
				object: "checkout.session",
				mode: "subscription",
				customer: "cus_1",
				subscription: "sub_1",
			}),
		);

		const failed = await deliver(app, payload, signature);
		expect(failed.status).toBe(500);
		expect(supporterUntil()).toBeNull();

		stripeAnswers = true;
		const retried = await deliver(app, payload, signature);
		expect(retried.status).toBe(200);
		expect(supporterUntil()).toEqual(new Date(PERIOD_END * 1000));
	});

	it("acknowledges an event that it does not apply, with a line in the log", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const { app, billing } = appWith();
		const { payload, signature } = updated(
			billing,
			subscription({ customer: "cus_other" }),
		);

		const response = await deliver(app, payload, signature);

		expect(response.status).toBe(200);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining("unknown_customer"),
		);
	});
});
