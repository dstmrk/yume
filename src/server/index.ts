/**
 * The entry point of the server.
 *
 * The container runs the migrations and the seed script before this file.
 * Refer to paragraph 7 of `docs/architecture.md`.
 */

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { createAuth } from "./auth.ts";
import { openDatabase } from "./db/index.ts";

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
const auth = createAuth(db, { secret, baseURL, trustedOrigins });
const app = createApp(db, auth);

/**
 * The files of the client, from the same origin as the API. The API routes are
 * above these two lines, thus a path that starts with `/api` never arrives
 * here. A path that no file matches gives `index.html`, because the client
 * controls the routes of the pages.
 */
app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`Yume listens on port ${info.port}. The database is ${url}.`);
});
