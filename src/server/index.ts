/**
 * The entry point of the server.
 *
 * The container runs the migrations and the seed script before this file.
 * Refer to paragraph 7 of `docs/architecture.md`.
 */

import { existsSync, readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { isClientPath } from "../shared/routes.ts";
import { createApp } from "./app.ts";
import { createAuth } from "./auth.ts";
import { openDatabase } from "./db/index.ts";
import { countUsers } from "./db/queries.ts";
import { newCode } from "./invitation.ts";

const url = process.env.DATABASE_URL ?? "./data/yume.db";
const port = Number(process.env.PORT ?? 3000);

/** The page of the client. The build of Vite writes this file. */
const INDEX_PATH = "./dist/index.html";

/**
 * Better Auth signs the cookies and the tokens with this key. A new key at each
 * start removes each session. Therefore the server stops without the variable:
 * a default value in the code gives no security.
 */
const secret = process.env.BETTER_AUTH_SECRET;
if (secret === undefined || secret === "") {
	console.error(
		"BETTER_AUTH_SECRET holds no value. Write a long value that is random.",
	);
	process.exit(1);
}

/**
 * The origin of the application. Better Auth refuses a request from an other
 * origin. In development the client of Vite is on the port 5173, thus
 * `TRUSTED_ORIGINS` gives that origin to the server.
 */
const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`;
const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "")
	.split(",")
	.map((origin) => origin.trim())
	.filter((origin) => origin !== "");

const db = openDatabase(url);

/**
 * The code of the first user.
 *
 * The server makes this code only while the database holds no user. Thus the
 * image holds no fixed value, and no person on the network knows the code. The
 * administrator reads the log and opens the link. A new start with no user
 * gives a new code.
 */
const setupCode = countUsers(db) === 0 ? newCode() : undefined;
if (setupCode !== undefined) {
	console.log(
		`The database holds no user. Open ${baseURL}/signup?code=${setupCode} to make the first user.`,
	);
}

const auth = createAuth(db, { secret, baseURL, trustedOrigins, setupCode });
const app = createApp(db, auth);

/**
 * The files of the client, from the same origin as the API. The API routes are
 * above this line, thus a path that starts with `/api` never arrives here.
 */
app.use("/*", serveStatic({ root: "./dist" }));

/**
 * The page of the client, one time at the start.
 *
 * The build writes this file, and each request gives the same bytes. The value
 * is undefined with no build: `npm run dev:server` runs alone, and Vite then
 * supplies the client on the port 5173.
 */
const indexHtml = existsSync(INDEX_PATH)
	? readFileSync(INDEX_PATH, "utf8")
	: undefined;

/**
 * A path that no file matches.
 *
 * The client controls the routes of the pages, thus a path of the client gives
 * the page with the status 200. Each other path gives the same page with the
 * status 404: a person reads the application, and a crawler reads that the page
 * does not exist.
 *
 * The status 200 for each path gives a page with no content to a search engine,
 * and that engine holds an unlimited quantity of such pages. Paragraph 5.5.3 of
 * `docs/architecture.md` gives the rule. The server holds no Italian text,
 * therefore the page of the status 404 is the page of the application.
 */
app.get("*", (c) => {
	if (indexHtml === undefined) {
		return c.text("The build of the client is not in dist/.", 404);
	}

	return c.html(indexHtml, isClientPath(c.req.path) ? 200 : 404);
});

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`Yume listens on port ${info.port}. The database is ${url}.`);
});
