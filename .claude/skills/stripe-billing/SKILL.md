---
name: stripe-billing
description: Use this skill for the payment of the supporter account with Stripe. Use it for src/server/billing.ts, src/server/stripe.ts, src/server/stripe-fixtures.ts, src/client/components/SupporterPanel.tsx and src/client/lib/supporter.ts. Use it for the tables stripe_customer and stripe_event, and for the column supporter_until of the table user. Use it for the routes /api/billing/checkout, /api/billing/portal and /api/stripe/webhook, and for the field billing of GET /api/me. Use it for the variables STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and STRIPE_PRICE_SUPPORTER, for STRIPE_API_VERSION, and for a new version of the package stripe. Use it when you add or change an event of the webhook, when you change the price, when you write a test of a payment, or when you configure Stripe for the official instance.
---

# stripe-billing — the payment of the supporter account

This skill gives the method. Paragraph 4.6.1 of `docs/architecture.md` gives the
decisions.

## The rule in one line

Stripe is the source of the truth. The webhook copies it into one date,
`user.supporter_until`, and no other code writes that date.

---

## 1. One writer, one date

`accountTier` of `src/shared/tier.ts` reads `supporter_until` and the clock. Thus the
level stops by itself at the end of the period that the user paid.

Obey these rules:

- **Only `applySubscription` of `src/server/billing.ts` writes `supporter_until`.**
  The administrator writes the flag `unlimited` only.
- **Do not adjust a date of Stripe when you read it.** For example, do not add days of
  grace in `accountTier`. ScontrinoZero added a bonus month at the read: the page showed
  one date, and Stripe charged at an other date. A change of a date goes to Stripe, and
  the webhook copies it back.
- **`subscriptionState` gives the date from the status.** `active` gives the end of the
  period. `canceled` gives `ended_at`, not more than the end of the period. Each other
  status gives the start of the period: after a failed renewal that start is the end of
  the period that the user paid.

## 2. The events

The webhook reads four events. Paragraph 4.6.1 gives the effect of each one.

| Event | Why |
|---|---|
| `checkout.session.completed` | The first state. It reads the subscription from Stripe. |
| `customer.subscription.updated` | The most important event. The renewal, a failed payment and the end in the portal arrive here only. |
| `customer.subscription.deleted` | The end. |
| `charge.dispute.created` | A log only. |

To add an event, obey this procedure:

1. Write the test first in `src/server/billing.test.ts`. Use `stripeEvent` and
   `subscription` of `src/server/stripe-fixtures.ts`.
2. Decide which rule of section 3 applies to the event.
3. Do not write the period from an event `invoice.*`. `invoice.period_end` is the end
   of the period that closed, not of the new period. ScontrinoZero wrote it, and the
   wrong value won one time in two.
4. Add the event to the endpoint in Stripe, on the live mode and on the test mode.

## 3. The order and the duplicates

Stripe gives no order of delivery, and it can send one event two times. The id of the
event in `stripe_event` stops a duplicate. These rules stop an old state:

- **The watermark.** An event with `created` before `stripe_customer.last_event_at`
  writes nothing. Use `>` and not `>=`: two events of the same second are both correct.
- **The end is final.** A row with the status `canceled` for the same subscription
  accepts no event. Without this rule, an update of the same second as the end makes
  the subscription active again.
- **The last subscription.** An update or an end of an other subscription writes
  nothing. Only `checkout.session.completed` replaces the subscription.
- **An unknown customer gets the status 200.** A failure makes Stripe send the event
  again for 3 days, and a shared account sends the events of other applications.

## 4. The transaction

better-sqlite3 is synchronous. Thus:

- Send the request to Stripe before the transaction. Do not write `await` in the
  callback of `db.transaction`.
- Write the id of the event and the state in the same transaction. An error then writes
  nothing, the route gives the status 500, and Stripe sends the event again.
- Read the row and compare in JavaScript. No other request runs in a synchronous
  transaction, thus the read and the write see the same row. On Postgres this is not
  true: ScontrinoZero puts the watermark in the `WHERE` of the `UPDATE`.

## 5. The tests

No test reaches the network. `fakeStripe` of `src/server/stripe-fixtures.ts` gives the
real client of the package `stripe` with its own transport. Thus a test reads the exact
parameters that the client sends.

- Give the status 400 to an error of the fake Stripe, with `STRIPE_ERROR`. After a
  status 500 the client sends the request again, and the test waits for the retries.
- Sign an event with `signedEvent`. It uses `generateTestHeaderString` of the package.
- Do a mutation test after a change of a rule of section 3: change the rule, run
  `billing.test.ts`, and find one test that fails.

## 6. A new version of the package `stripe`

The package types `apiVersion` as the one version that it knows. Thus a new minor
version can give an error of the typecheck in `src/server/stripe.ts`. Do not add a
cast. Do these steps:

1. Read `node_modules/stripe/CHANGELOG.md`. Find each line `Remove support for` and each
   change of a field of `Subscription`, `Checkout.Session` or `BillingPortal.Session`.
2. Change `STRIPE_API_VERSION` in `src/server/stripe.ts`.
3. Find each other place: `grep -rn "<old version>" src/ docs/ .claude/`. The test of
   `stripe.test.ts` and the events of `stripe-fixtures.ts` hold the value.

The endpoint of the webhook keeps the version of the API of its creation. The events
thus keep their shape after a change of the package. To change the version of the
endpoint, make a new endpoint with the new version. Then write its secret in
`STRIPE_WEBHOOK_SECRET` and remove the old endpoint. Between the two operations half of
the events get the status 400, thus do the change in some minutes.

## 7. The configuration of Stripe

Do these operations in the account of Yume, first in the test mode, then in the live
mode:

1. Make the product and one recurring price of 9,99 euros each year. Write the id
   `price_` in `STRIPE_PRICE_SUPPORTER`.
2. Make the endpoint `https://<domain>/api/stripe/webhook` with the four events of
   section 2 and the version `2026-10-28.endive`. Write the secret `whsec_` in
   `STRIPE_WEBHOOK_SECRET`. Each mode and each instance has its own secret.
3. In the settings of Checkout, write the URL of the terms, `https://<domain>/tos`.
   `consent_collection` of the session needs it. Also limit each customer to one
   subscription.
4. Configure the customer portal: the change of the card, the invoices, and the
   cancellation at the end of the period. Give no change of the plan.
5. Activate the email of the receipt and the email before the renewal of an annual
   subscription.
6. Configure the proxy of the TLS, for example Cloudflare: `/api/stripe/webhook` must
   pass with no challenge and no redirect. On ScontrinoZero a redirect 307 stopped each
   event: Stripe does not follow a redirect.

The price of the page is `SUPPORTER_PRICE_CENTS` of `src/shared/tier.ts`. A new price
in Stripe needs the same change there. A subscription keeps its own price in Stripe.

## 8. The text of the offer

The section of the supporter account and section 7-bis of the terms name what the user
buys. A promise of a function that does not exist is a defect of the contract with a
consumer. Obey these rules:

- Name only a function that `src/shared/tier.ts` gates: `canAddAccount`,
  `canWriteExpiryLots` and `canUseMcp`.
- Name only a source of points of `src/server/db/seed/catalogue.ts`. Read the catalogue,
  not an example of `docs/architecture.md`. The type `currency.kind` allows `hotel` and
  `rail`, but the catalogue holds no such currency.
- Write "date di scadenza dei punti", not "scadenze". The function records the dates.
  Yume sends no notification.
- Change the offer, section 7-bis of `/tos` and section 7 of
  `docs/openai-submission.md` together with a change of a limit.

## 9. The development

`npm run dev:server` holds no variable of Stripe, thus the dashboard shows no section.
To try the payment, export the three variables of the test mode. Then send the events
to the machine with the CLI of Stripe:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI gives its own secret `whsec_`: write it in `STRIPE_WEBHOOK_SECRET`. The page of
Vite is on an origin of `TRUSTED_ORIGINS`, thus Stripe returns to the port 5173.
