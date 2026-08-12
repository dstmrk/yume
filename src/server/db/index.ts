import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.ts";

/**
 * Opens the database and sets the pragmas.
 *
 * SQLite sets `foreign_keys` to OFF. Without this pragma, the database accepts
 * a row that refers to a programme that does not exist. Paragraph 2.3 of
 * `docs/architecture.md` gives the four pragmas.
 *
 * Give the path `:memory:` for a test.
 */
export function openDatabase(url: string) {
	const sqlite = new Database(url);
	sqlite.pragma("journal_mode = WAL");
	sqlite.pragma("foreign_keys = ON");
	sqlite.pragma("busy_timeout = 5000");
	sqlite.pragma("synchronous = NORMAL");
	return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof openDatabase>;
