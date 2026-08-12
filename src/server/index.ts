/**
 * The entry point of the server.
 *
 * The container runs the migrations and the seed script before this file.
 * Refer to paragraph 7 of `docs/architecture.md`.
 */

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { openDatabase } from "./db/index.ts";

const url = process.env.DATABASE_URL ?? "./data/yume.db";
const port = Number(process.env.PORT ?? 3000);

const db = openDatabase(url);
const app = createApp(db);

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
