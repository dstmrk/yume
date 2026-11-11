/**
 * The account of the reviewers of the directory of Anthropic.
 *
 * A reviewer cannot sign in with Google: Google can ask for a verification on
 * a new device, and the reviewer cannot answer it. Thus this account signs in
 * with an email address and a password. No person can make such an account:
 * Better Auth gives no sign-up, no reset and sends no email. Only the
 * administrator makes it, with `reviewer-run.ts`. Paragraph 4.1.1 of
 * `docs/architecture.md` gives the decision.
 */

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./index.ts";
import { account, session, user } from "./schema.ts";

/** The provider of Better Auth for a password. */
const CREDENTIAL = "credential";

/** The limits of the length of a password of Better Auth by default. */
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

/**
 * Writes the account of the reviewer, or gives it a new password.
 *
 * The user has an address that is not verified. Then `isAdmin` of
 * `src/server/admin.ts` never gives the administrator, and Better Auth links no
 * Google account with the same address to this user. The account is free: the
 * administrator gives the unlimited account on `/admin`.
 *
 * A new password removes the sessions of the user. A user of Google with the
 * same address gives an error: a password on the account of a person gives an
 * other path to the data of that person.
 */
export async function writeReviewer(
	db: Db,
	email: string,
	password: string,
): Promise<"created" | "updated"> {
	const address = email.trim().toLowerCase();
	if (!z.email().safeParse(address).success) {
		throw new Error(`${email} is not an email address.`);
	}
	if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
		throw new Error(
			`The password needs ${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`,
		);
	}
	const hash = await hashPassword(password);
	const now = new Date();

	return db.transaction((tx) => {
		const existing = tx
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, address))
			.get();

		if (existing === undefined) {
			const id = randomUUID();
			tx.insert(user)
				.values({
					id,
					name: "",
					email: address,
					emailVerified: false,
					createdAt: now,
					updatedAt: now,
				})
				.run();
			tx.insert(account)
				.values({
					id: randomUUID(),
					accountId: id,
					providerId: CREDENTIAL,
					userId: id,
					password: hash,
					createdAt: now,
					updatedAt: now,
				})
				.run();
			return "created";
		}

		const updated = tx
			.update(account)
			.set({ password: hash, updatedAt: now })
			.where(
				and(
					eq(account.userId, existing.id),
					eq(account.providerId, CREDENTIAL),
				),
			)
			.run();
		if (updated.changes === 0) {
			throw new Error(
				`${address} is a user with no password. Give an other address.`,
			);
		}
		tx.delete(session).where(eq(session.userId, existing.id)).run();
		return "updated";
	});
}
