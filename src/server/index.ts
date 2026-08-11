/**
 * The entry point of the server.
 *
 * The container runs the migrations and the seed script before this file.
 * Refer to paragraph 7 of `docs/architecture.md`.
 */

import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { openDatabase } from "./db/index.ts";

const url = process.env.DATABASE_URL ?? "./data/yume.db";
const port = Number(process.env.PORT ?? 3000);

const db = openDatabase(url);
const app = createApp(db);

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`Yume listens on port ${info.port}. The database is ${url}.`);
});
