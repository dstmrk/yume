/**
 * The removal of a user by the user, from the dashboard.
 *
 * The foreign keys remove each row of the user: the accounts, the snapshots,
 * the sessions, the tokens of the assistants and the customer of Stripe.
 * Paragraph 4.9 of `docs/architecture.md` gives the decisions.
 */

import { eq } from "drizzle-orm";
import { type PAYMENT_UNAVAILABLE, REVIEWER_ACCOUNT } from "../shared/api.ts";
import { deleteCustomer } from "./billing.ts";
import type { Db } from "./db/index.ts";
import { hasPassword } from "./db/queries.ts";
import { user } from "./db/schema.ts";
import type { Billing } from "./stripe.ts";

/** The result of `removeUser`. Each error has the code of the API. */
export type RemovalResult =
	| { ok: true }
	| {
			ok: false;
			error: typeof REVIEWER_ACCOUNT | typeof PAYMENT_UNAVAILABLE;
	  };

/**
 * Removes the user and each row of the user.
 *
 * - The account of the reviewers has a password, and it is refused: a reviewer
 *   who tries the button removes the account of the test. Paragraph 4.1.1.
 * - The customer of Stripe goes first. Stripe then cancels the subscription,
 *   and it charges no card of a user that does not exist. An error of Stripe
 *   removes nothing.
 */
export async function removeUser(
	db: Db,
	billing: Billing | undefined,
	userId: string,
): Promise<RemovalResult> {
	if (hasPassword(db, userId)) {
		return { ok: false, error: REVIEWER_ACCOUNT };
	}
	const customer = await deleteCustomer(db, billing, userId);
	if (!customer.ok) {
		return customer;
	}
	db.delete(user).where(eq(user.id, userId)).run();
	return { ok: true };
}
