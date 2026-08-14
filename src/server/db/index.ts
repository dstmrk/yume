import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.ts";

/**
 * Gives the message of the error of the directory of the database.
 *
 * The message of the package names no path and no cause. Thus this message
 * gives both.
 *
 * The container is the frequent cause. The image runs as the user 1000, and
 * `compose.yaml` mounts `./data` of the host on `/data`. Docker makes that
 * directory of the host with the owner `root` when the directory is absent.
 * The user 1000 then writes no file in it. Paragraph 7 of
 * `docs/architecture.md` gives the command of the installation.
 */
export function cantOpenMessage(url: string): string {
	return [
		`Cannot open the database file ${url}.`,
		`The directory ${dirname(url)} must exist, and the user of the process must write in it.`,
		"In the container that user is 1000. Run this command near compose.yaml:",
		"  mkdir -p data && sudo chown -R 1000:1000 data",
	].join("\n");
}

/**
 * Gives true for an error of the directory of the database.
 *
 * `better-sqlite3` gives two different errors for one cause. The package
 * examines the directory first, thus an absent directory gives a `TypeError`
 * with no code. A directory that exists but that the user cannot write arrives
 * at SQLite, and that library gives the code `SQLITE_CANTOPEN`. The container
 * with a mounted volume gives the second error.
 */
export function isCantOpen(error: unknown): boolean {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "SQLITE_CANTOPEN"
	) {
		return true;
	}
	return (
		error instanceof TypeError &&
		error.message.includes("directory does not exist")
	);
}

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
	let sqlite: Database.Database;
	try {
		sqlite = new Database(url);
	} catch (error) {
		if (isCantOpen(error)) {
			throw new Error(cantOpenMessage(url), { cause: error });
		}
		throw error;
	}
	sqlite.pragma("journal_mode = WAL");
	sqlite.pragma("foreign_keys = ON");
	sqlite.pragma("busy_timeout = 5000");
	sqlite.pragma("synchronous = NORMAL");
	return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof openDatabase>;
