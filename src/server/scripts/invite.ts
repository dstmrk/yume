/**
 * Writes an invitation and prints the code.
 *
 * Registration is possible only with an invitation. Paragraph 4 of
 * `docs/architecture.md` gives the rule. The administrator sends the code to
 * the new user, and that person writes it in the form of the sign-up.
 *
 *   npm run auth:invite -- <email of the user who invites> [days] [email]
 *
 * The default time is 7 days. The third argument is the address of the person
 * who receives the code. It is only a note in the row.
 */

import { openDatabase } from "../db/index.ts";
import { createInvitation, findUserByEmail } from "../db/queries.ts";
import { makeCode } from "../invitation.ts";

const DAY = 24 * 60 * 60 * 1000;
const CODE_LENGTH = 10;

const [author, time = "7", email] = process.argv.slice(2);
if (author === undefined) {
	console.error(
		"Use: npm run auth:invite -- <email of the user who invites> [days] [email]",
	);
	process.exit(1);
}

const days = Number(time);
if (!Number.isInteger(days) || days < 1) {
	console.error(`The quantity of days is not correct: ${time}`);
	process.exit(1);
}

const url = process.env.DATABASE_URL ?? "./data/yume.db";
const db = openDatabase(url);

const found = findUserByEmail(db, author);
if (found === undefined) {
	console.error(`The database holds no user with the address ${author}.`);
	db.$client.close();
	process.exit(1);
}

const code = makeCode(crypto.getRandomValues(new Uint8Array(CODE_LENGTH)));
const expiresAt = new Date(Date.now() + days * DAY).toISOString();
createInvitation(db, {
	code,
	createdByUserId: found.id,
	email,
	expiresAt,
});
db.$client.close();

console.log(`The code is ${code}. It is valid until ${expiresAt}.`);
