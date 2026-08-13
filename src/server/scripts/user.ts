/**
 * Makes a user. The administrator runs this script for the first user.
 *
 * The user interface does not make the first user: a sign-up from the network
 * needs an invitation, and the first invitation needs a user. Paragraph 4 of
 * `docs/architecture.md` gives the rule.
 *
 * The script calls `auth.api`, thus Better Auth writes the password with its
 * own operation. A call of `auth.api` holds no request, therefore the hook of
 * the invitation gives no error. Refer to `src/server/auth.ts`.
 *
 *   npm run auth:user -- <email> <name> <password>
 *
 * The shell keeps this command in its history. Remove that line, or write a
 * space before the command when the shell has `HISTCONTROL=ignorespace`.
 */

import { createAuth } from "../auth.ts";
import { openDatabase } from "../db/index.ts";

const [email, name, password] = process.argv.slice(2);
if (email === undefined || name === undefined || password === undefined) {
	console.error("Use: npm run auth:user -- <email> <name> <password>");
	process.exit(1);
}

const secret = process.env.BETTER_AUTH_SECRET;
if (secret === undefined || secret === "") {
	console.error("BETTER_AUTH_SECRET holds no value.");
	process.exit(1);
}

const url = process.env.DATABASE_URL ?? "./data/yume.db";
const db = openDatabase(url);
const auth = createAuth(db, {
	secret,
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
});

try {
	const created = await auth.api.signUpEmail({
		body: { name, email, password },
	});
	console.log(`The user ${created.user.email} has the id ${created.user.id}.`);
} catch (error) {
	console.error(`The user is not in ${url}.`, error);
	process.exit(1);
} finally {
	db.$client.close();
}
