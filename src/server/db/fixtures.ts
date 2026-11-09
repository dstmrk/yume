/**
 * The rows that a test needs before it writes user data.
 *
 * The column `user_account.user_id` refers to `user.id`. Therefore a test that
 * makes an account must make the user first. The application does not use this
 * file: Better Auth writes the table `user` at the first sign-in.
 *
 * This file holds no logic, thus it has no test file.
 */

import { makeSignature } from "better-auth/crypto";
import type { Auth } from "../auth.ts";
import type { Db } from "./index.ts";
import { user } from "./schema.ts";

/** Writes a user with the given id. It gives the same id. */
export function insertUser(db: Db, id: string): string {
	const now = new Date();
	db.insert(user)
		.values({
			id,
			name: id,
			email: `${id}@example.com`,
			emailVerified: false,
			createdAt: now,
			updatedAt: now,
		})
		.run();
	return id;
}

/**
 * Makes a session for a user and gives the cookie of the request.
 *
 * The sign-in goes through Google, and a test of a route has no Google. Thus
 * this function writes the session with the adapter of Better Auth, and it
 * signs the token with the key of the instance, as the callback does.
 */
export async function sessionCookie(
	auth: Auth,
	userId: string,
): Promise<string> {
	const context = await auth.$context;
	const session = await context.internalAdapter.createSession(userId);
	const signature = await makeSignature(session.token, context.secret);
	return `${context.authCookies.sessionToken.name}=${session.token}.${signature}`;
}
