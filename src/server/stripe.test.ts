import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
	createBilling,
	parseBillingConfig,
	STRIPE_API_VERSION,
	type StripeEnv,
} from "./stripe.ts";

const TEST_ENV: StripeEnv = {
	STRIPE_SECRET_KEY: "sk_test_abc",
	STRIPE_WEBHOOK_SECRET: "whsec_abc",
	STRIPE_PRICE_SUPPORTER: "price_abc",
};

describe("parseBillingConfig", () => {
	// A self-hosted installation holds no payment.
	it("gives no payment with no variable", () => {
		expect(parseBillingConfig({})).toBeUndefined();
	});

	it("gives no payment with three empty variables", () => {
		expect(
			parseBillingConfig({
				STRIPE_SECRET_KEY: "",
				STRIPE_WEBHOOK_SECRET: "",
				STRIPE_PRICE_SUPPORTER: "",
			}),
		).toBeUndefined();
	});

	it("reads the three variables of the test mode", () => {
		expect(parseBillingConfig(TEST_ENV)).toEqual({
			secretKey: "sk_test_abc",
			webhookSecret: "whsec_abc",
			priceId: "price_abc",
			livemode: false,
		});
	});

	it("reads the live mode from the key", () => {
		expect(
			parseBillingConfig({ ...TEST_ENV, STRIPE_SECRET_KEY: "sk_live_abc" })
				?.livemode,
		).toBe(true);
	});

	it("accepts a restricted key of each mode", () => {
		expect(
			parseBillingConfig({ ...TEST_ENV, STRIPE_SECRET_KEY: "rk_live_abc" })
				?.livemode,
		).toBe(true);
		expect(
			parseBillingConfig({ ...TEST_ENV, STRIPE_SECRET_KEY: "rk_test_abc" })
				?.livemode,
		).toBe(false);
	});

	it("removes the spaces at the two ends of each value", () => {
		expect(
			parseBillingConfig({
				STRIPE_SECRET_KEY: " sk_test_abc ",
				STRIPE_WEBHOOK_SECRET: "whsec_abc\n",
				STRIPE_PRICE_SUPPORTER: "\tprice_abc",
			}),
		).toMatchObject({
			secretKey: "sk_test_abc",
			webhookSecret: "whsec_abc",
			priceId: "price_abc",
		});
	});

	// A partial configuration otherwise shows a button that always fails.
	it("stops at a missing variable and names it", () => {
		expect(() =>
			parseBillingConfig({ ...TEST_ENV, STRIPE_WEBHOOK_SECRET: "" }),
		).toThrow(/STRIPE_WEBHOOK_SECRET/);
	});

	it("names each missing variable", () => {
		expect(() =>
			parseBillingConfig({ STRIPE_SECRET_KEY: "sk_test_abc" }),
		).toThrow(/STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_SUPPORTER/);
	});

	// A publishable key cannot make a session, and a key of an other form
	// gives no mode.
	it("refuses a key that is not a secret key", () => {
		expect(() =>
			parseBillingConfig({ ...TEST_ENV, STRIPE_SECRET_KEY: "pk_live_abc" }),
		).toThrow(/STRIPE_SECRET_KEY/);
	});

	it("refuses two values in the wrong variables", () => {
		expect(() =>
			parseBillingConfig({
				...TEST_ENV,
				STRIPE_WEBHOOK_SECRET: "price_abc",
				STRIPE_PRICE_SUPPORTER: "whsec_abc",
			}),
		).toThrow(/STRIPE_WEBHOOK_SECRET/);
	});

	it("refuses an id that is not a price", () => {
		expect(() =>
			parseBillingConfig({ ...TEST_ENV, STRIPE_PRICE_SUPPORTER: "prod_abc" }),
		).toThrow(/STRIPE_PRICE_SUPPORTER/);
	});
});

describe("createBilling", () => {
	it("sends each request with the version of the API of the code", async () => {
		const versions: (string | null)[] = [];
		const billing = createBilling(
			{
				secretKey: "sk_test_abc",
				webhookSecret: "whsec_abc",
				priceId: "price_abc",
				livemode: false,
			},
			Stripe.createFetchHttpClient(async (_input, init) => {
				versions.push(new Headers(init?.headers).get("stripe-version"));
				return Response.json({ id: "cus_1", object: "customer" });
			}),
		);

		await billing.stripe.customers.create({});

		expect(versions).toEqual([STRIPE_API_VERSION]);
		expect(STRIPE_API_VERSION).toBe("2026-10-28.endive");
	});

	it("keeps no secret key in the result", () => {
		const billing = createBilling({
			secretKey: "sk_test_abc",
			webhookSecret: "whsec_abc",
			priceId: "price_abc",
			livemode: true,
		});

		expect(billing).toMatchObject({
			webhookSecret: "whsec_abc",
			priceId: "price_abc",
			livemode: true,
		});
		expect(Object.keys(billing)).not.toContain("secretKey");
	});
});
