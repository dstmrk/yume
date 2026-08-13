/**
 * The rows that a test needs before it writes user data.
 *
 * The column `user_account.user_id` refers to `user.id`. Therefore a test that
 * makes an account must make the user first. The application does not use this
 * file: Better Auth writes the table `user` at the sign-up.
 *
 * This file holds no logic, thus it has no test file.
 */

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
