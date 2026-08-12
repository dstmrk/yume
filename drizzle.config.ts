import { defineConfig } from "drizzle-kit";

/**
 * The path of the database file. In the container, `/data` is a mounted volume.
 * Refer to paragraph 7 of `docs/architecture.md`.
 */
const url = process.env.DATABASE_URL ?? "./data/yume.db";

export default defineConfig({
	dialect: "sqlite",
	schema: "./src/server/db/schema.ts",
	out: "./drizzle",
	dbCredentials: { url },
});
