/**
 * Writes an invitation and prints the code.
 *
 * Registration is possible only with an invitation. Paragraph 4 of
 * `docs/architecture.md` gives the rule. The interface of the user writes an
 * invitation, thus this script is the operation of the administrator on the
 * machine of the server.
 *
 *   npm run auth:invite -- <email of the user who invites> [email]
 *
 * The code is valid for 24 hours. The second argument is the address of the
 * person who receives the code. It is only a note in the row.
 *
 * Each user has two invitations. The script gives an error when the user holds
 * no free slot.
 */

import { openDatabase } from "../db/index.ts";
import { createInvitationForUser, findUserByEmail } from "../db/queries.ts";

const [author, email] = process.argv.slice(2);
if (author === undefined) {
	console.error(
		"Use: npm run auth:invite -- <email of the user who invites> [email]",
	);
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

const written = createInvitationForUser(db, {
	userId: found.id,
	email,
	at: new Date().toISOString(),
});
db.$client.close();

if (written === null) {
	console.error(`The user ${author} has no free invitation.`);
	process.exit(1);
}

console.log(
	`The code is ${written.code}. It is valid until ${written.expiresAt}.`,
);
