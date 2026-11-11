/**
 * The entry point of the server.
 *
 * The container runs the migrations and the seed script before this file.
 * Refer to paragraph 7 of `docs/architecture.md`.
 */

import { existsSync, readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { LOCALES, routing } from "../shared/locale.ts";
import { pageOfPath } from "../shared/routes.ts";
import { parseFreeAccountLimits } from "../shared/tier.ts";
import { createApp } from "./app.ts";
import { createAuth } from "./auth.ts";
import { openDatabase } from "./db/index.ts";
import { deleteExpired } from "./db/queries.ts";
import { type Billing, createBilling, parseBillingConfig } from "./stripe.ts";

const url = process.env.DATABASE_URL ?? "./data/yume.db";
const port = Number(process.env.PORT ?? 3000);

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
 * The OAuth client of Google. Google is the only provider, thus a server
 * without the client gives no sign-in. Therefore the server stops. Paragraph
 * 4.2 of `docs/architecture.md` gives the procedure for the client.
 */
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
	console.error(
		"GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET holds no value. Make an OAuth client in the Google Cloud Console.",
	);
	process.exit(1);
}
const google = { clientId, clientSecret };

/**
 * The origin of the application. Better Auth and the middleware `csrf` of
 * `createApp` refuse a request from an other origin. In development the client of Vite is on the port 5173, thus
 * `TRUSTED_ORIGINS` gives that origin to the server.
 */
const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`;
const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "")
	.split(",")
	.map((origin) => origin.trim())
	.filter((origin) => origin !== "");

/**
 * The email address of the administrator of the instance. With no value, the
 * instance has no administrator: a self-hosted installation needs none.
 * Paragraph 4.8 of `docs/architecture.md` gives the decision.
 */
const adminEmail = process.env.ADMIN_EMAIL;

/**
 * The limits of the free account. With no value, the instance has no limit: a
 * self-hosted installation keeps each function. A value that is not `true` or
 * `false` stops the server, because a defect in the variable of the official
 * instance otherwise opens each function to each user. Paragraph 4.6 of
 * `docs/architecture.md` gives the decision.
 */
let limits: boolean;
try {
	limits = parseFreeAccountLimits(process.env.FREE_ACCOUNT_LIMITS);
} catch (error) {
	console.error((error as Error).message);
	process.exit(1);
}

/**
 * The payment of the supporter account. With no variable of Stripe, the
 * instance holds no payment: a self-hosted installation needs none. A part of
 * the three variables stops the server. Paragraph 4.6.1 of
 * `docs/architecture.md` gives the decision.
 */
let billing: Billing | undefined;
try {
	const config = parseBillingConfig(process.env);
	billing = config === undefined ? undefined : createBilling(config);
} catch (error) {
	console.error((error as Error).message);
	process.exit(1);
}

const db = openDatabase(url);

/**
 * Removes the expired sessions at the start and then one time each day.
 *
 * A container can run for weeks, thus the call at the start is not
 * sufficient. An error stops no request: the next call tries again.
 * `unref` lets the process stop with the timer active.
 */
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
function cleanExpired(): void {
	try {
		deleteExpired(db, new Date());
	} catch (error) {
		console.error("The cleanup of the expired sessions failed.", error);
	}
}
cleanExpired();
setInterval(cleanExpired, CLEANUP_INTERVAL_MS).unref();

const auth = createAuth(db, { secret, baseURL, trustedOrigins, google });
// The MCP server reads the keys of its tokens from this process, on the
// machine itself. Paragraph 4.7.2 of `docs/architecture.md`.
const app = createApp(db, auth, [baseURL, ...trustedOrigins], {
	adminEmail,
	limits,
	jwksUrl: `http://127.0.0.1:${port}/api/auth/jwks`,
	openaiChallenge: process.env.OPENAI_APPS_CHALLENGE_TOKEN,
	billing,
});

/**
 * The files of the client, from the same origin as the API. The API routes are
 * above this line, thus a path that starts with `/api` never arrives here.
 */
app.use("/*", serveStatic({ root: "./dist" }));

/**
 * The shell of the application in each language, one time at the start.
 *
 * The build writes one shell for each language: `dist/app.html` for the base
 * language, `dist/en/app.html` for English. The shell holds an empty root. The
 * public page stays in `dist/index.html`, and `serveStatic` gives it to `/`:
 * on `/dashboard` its example board reads as a balance of the person.
 * Paragraphs 5.5.3 and 5.8 of `docs/architecture.md` give the rules. Each
 * request gives the same bytes. A value is undefined with no build:
 * `npm run dev:server` runs alone, and Vite then supplies the client on the
 * port 5173.
 */
const pages = new Map(
	LOCALES.map((locale) => {
		const path = `./dist${routing.pathFor(locale, "/app.html")}`;
		return [locale, existsSync(path) ? readFileSync(path, "utf8") : undefined];
	}),
);

/**
 * A path that no file matches.
 *
 * The client controls the routes of the pages, thus a path of the client gives
 * the page with the status 200. Each other path gives the same page with the
 * status 404: a person reads the application, and a crawler reads that the page
 * does not exist. The prefix of the path gives the language of the page, also
 * for the status 404.
 *
 * The status 200 for each path gives a page with no content to a search engine,
 * and that engine holds an unlimited quantity of such pages. Paragraph 5.5.3 of
 * `docs/architecture.md` gives the rule. The server holds no Italian text,
 * therefore the page of the status 404 is the page of the application.
 */
app.get("*", (c) => {
	const page = pageOfPath(c.req.path);
	const html = pages.get(page.locale);
	if (html === undefined) {
		return c.text("The build of the client is not in dist/.", 404);
	}

	return c.html(html, page.found ? 200 : 404);
});

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`Yume listens on port ${info.port}. The database is ${url}.`);
});
