/**
 * Applies the migrations of `drizzle/`. The container runs this script at the
 * start, before the seed script and before the server.
 *
 * The script uses the migrator of `drizzle-orm`, not `drizzle-kit`.
 * `drizzle-orm` is a dependency of production, thus the image of the container
 * needs no development tool. Refer to paragraph 7 of `docs/architecture.md`.
 *
 * The migrator keeps a table of the migrations that ran. Therefore a second
 * call applies no migration again.
 */

import { join } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { openDatabase } from "./index.ts";

const url = process.env.DATABASE_URL ?? "./data/yume.db";

// The path comes from this file, not from the current directory. Then the
// script gives the same result from each directory.
const folder = join(import.meta.dirname, "..", "..", "..", "drizzle");

const db = openDatabase(url);
migrate(db, { migrationsFolder: folder });
db.$client.close();
console.log(`The migrations of ${folder} are in ${url}.`);
