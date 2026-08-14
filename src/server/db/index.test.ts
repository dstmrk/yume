import { describe, expect, it } from "vitest";
import { cantOpenMessage, isCantOpen, openDatabase } from "./index.ts";

describe("cantOpenMessage", () => {
	it("names the file and the directory of that file", () => {
		const message = cantOpenMessage("/data/yume.db");
		expect(message).toContain("/data/yume.db");
		expect(message).toContain("The directory /data must exist");
	});

	it("gives the command that corrects the owner of the directory", () => {
		expect(cantOpenMessage("/data/yume.db")).toContain(
			"sudo chown -R 1000:1000 data",
		);
	});

	it("names the directory of a relative path", () => {
		expect(cantOpenMessage("./data/yume.db")).toContain(
			"The directory ./data must exist",
		);
	});

	it("names the current directory for a file with no directory", () => {
		expect(cantOpenMessage("yume.db")).toContain("The directory . must exist");
	});
});

describe("isCantOpen", () => {
	// The container gives this error: the directory of the volume exists, and
	// the user 1000 cannot write in it.
	it("gives true for the code SQLITE_CANTOPEN", () => {
		const error = Object.assign(new Error("unable to open database file"), {
			code: "SQLITE_CANTOPEN",
		});
		expect(isCantOpen(error)).toBe(true);
	});

	// `better-sqlite3` examines the directory before SQLite, thus this error
	// holds no code.
	it("gives true for the TypeError of an absent directory", () => {
		const error = new TypeError(
			"Cannot open database because the directory does not exist",
		);
		expect(isCantOpen(error)).toBe(true);
	});

	it("gives false for an other error of SQLite", () => {
		const error = Object.assign(new Error("database is locked"), {
			code: "SQLITE_BUSY",
		});
		expect(isCantOpen(error)).toBe(false);
	});

	it("gives false for an other TypeError", () => {
		expect(isCantOpen(new TypeError("Expected first argument"))).toBe(false);
	});

	it("gives false for a value that is not an error", () => {
		expect(isCantOpen(null)).toBe(false);
		expect(isCantOpen("SQLITE_CANTOPEN")).toBe(false);
	});
});

describe("openDatabase", () => {
	it("gives the message of the correction for a directory that is absent", () => {
		expect(() => openDatabase("/no/such/directory/yume.db")).toThrow(
			/sudo chown -R 1000:1000 data/,
		);
	});

	it("keeps the error of the package as the cause", () => {
		let cause: unknown;
		try {
			openDatabase("/no/such/directory/yume.db");
		} catch (error) {
			cause = (error as Error).cause;
		}
		expect(cause).toBeInstanceOf(Error);
	});

	it("opens a database in the memory", () => {
		const db = openDatabase(":memory:");
		expect(db.$client.open).toBe(true);
		db.$client.close();
	});
});
