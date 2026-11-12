/**
 * The configuration of Stripe, the payment service of the supporter account.
 *
 * The official instance holds the three variables. A self-hosted installation
 * holds none, and then it has no payment. Paragraph 4.6.1 of
 * `docs/architecture.md` gives the decision.
 */

import Stripe from "stripe";

/**
 * The version of the API of each request of the server.
 *
 * The package `stripe` types this value as the one version that it knows.
 * Thus a new version of the package gives an error of the typecheck. The skill
 * `stripe-billing` gives the procedure. The webhook receives the version of
 * its endpoint in Stripe, not this value.
 */
export const STRIPE_API_VERSION = "2026-10-28.endive" as const;

/** The variables of the environment that this file reads. */
export type StripeEnv = {
	STRIPE_SECRET_KEY?: string;
	STRIPE_WEBHOOK_SECRET?: string;
	STRIPE_PRICE_SUPPORTER?: string;
};

/** The configuration of the payment, from the three variables. */
export type BillingConfig = {
	secretKey: string;
	/** The secret of the endpoint of the webhook, `whsec_...`. */
	webhookSecret: string;
	/** The price of the supporter account in Stripe, `price_...`. */
	priceId: string;
	/** True for a key of the live mode. The webhook refuses an event of the other mode. */
	livemode: boolean;
};

/** What the routes of the payment receive. The secret key stays in the client. */
export type Billing = Omit<BillingConfig, "secretKey"> & { stripe: Stripe };

const NAMES = [
	"STRIPE_SECRET_KEY",
	"STRIPE_WEBHOOK_SECRET",
	"STRIPE_PRICE_SUPPORTER",
] as const;

/** The two prefixes of a secret key of each mode. `rk_` is a restricted key. */
const LIVE_KEY = /^(sk|rk)_live_/;
const TEST_KEY = /^(sk|rk)_test_/;

/**
 * Reads the three variables of Stripe. No value gives undefined: the instance
 * has no payment.
 *
 * A part of the three values gives an error, and the server stops. The page
 * otherwise shows a button of the payment that always fails, or the webhook
 * refuses each event of Stripe. The function also examines the prefix of each
 * value, thus two values in the wrong variables stop the server.
 */
export function parseBillingConfig(env: StripeEnv): BillingConfig | undefined {
	const values = NAMES.map((name) => env[name]?.trim() ?? "");
	const missing = NAMES.filter((_, index) => values[index] === "");
	if (missing.length === NAMES.length) return undefined;
	if (missing.length > 0) {
		throw new Error(
			`These variables of Stripe hold no value: ${missing.join(", ")}. Write the three variables, or none.`,
		);
	}

	const [secretKey = "", webhookSecret = "", priceId = ""] = values;
	if (!LIVE_KEY.test(secretKey) && !TEST_KEY.test(secretKey)) {
		throw new Error(
			"STRIPE_SECRET_KEY holds no secret key. Write a key sk_live_, sk_test_, rk_live_ or rk_test_.",
		);
	}
	if (!webhookSecret.startsWith("whsec_")) {
		throw new Error(
			"STRIPE_WEBHOOK_SECRET holds no secret of a webhook. Write the value whsec_ of the endpoint.",
		);
	}
	if (!priceId.startsWith("price_")) {
		throw new Error(
			"STRIPE_PRICE_SUPPORTER holds no price. Write the value price_ of the supporter account.",
		);
	}
	return {
		secretKey,
		webhookSecret,
		priceId,
		livemode: LIVE_KEY.test(secretKey),
	};
}

/**
 * Makes the client of Stripe. A test gives its own `httpClient`, because no
 * test reaches the network.
 */
export function createBilling(
	config: BillingConfig,
	httpClient?: Stripe.HttpClient,
): Billing {
	const { secretKey, ...rest } = config;
	return {
		...rest,
		stripe: new Stripe(secretKey, {
			apiVersion: STRIPE_API_VERSION,
			...(httpClient === undefined ? {} : { httpClient }),
		}),
	};
}
