/**
 * Writes the account of the reviewers of the directory of Anthropic, and
 * shows its password one time. A second call gives a new password to the same
 * account. Paragraph 4.1.1 of `docs/architecture.md` gives the procedure.
 *
 * The script makes the password: a password in the command stays in the
 * history of the shell.
 */

import { randomBytes } from "node:crypto";
import { openDatabase } from "./index.ts";
import { writeReviewer } from "./reviewer.ts";

const email = process.argv[2];
if (email === undefined) {
	console.error("Give the email address of the account.");
	process.exit(1);
}

const url = process.env.DATABASE_URL ?? "./data/yume.db";
const db = openDatabase(url);
const password = randomBytes(18).toString("base64url");
try {
	const result = await writeReviewer(db, email, password);
	console.log(
		result === "created"
			? `The account ${email} is in ${url}.`
			: `The account ${email} has a new password. Its sessions are closed.`,
	);
	console.log(`Password: ${password}`);
} catch (error) {
	console.error((error as Error).message);
	process.exitCode = 1;
} finally {
	db.$client.close();
}
