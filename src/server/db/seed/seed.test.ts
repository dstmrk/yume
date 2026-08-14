import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "../index.ts";
import { currency, program, transferRule } from "../schema.ts";
import { currencies, programs, transferRules } from "./catalogue.ts";
import { seedCatalogue } from "./seed.ts";

let db: Db;

beforeEach(() => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
});

describe("seedCatalogue", () => {
	it("writes each row of the catalogue", () => {
		seedCatalogue(db);
		expect(db.select().from(currency).all()).toHaveLength(currencies.length);
		expect(db.select().from(program).all()).toHaveLength(programs.length);
		expect(db.select().from(transferRule).all()).toHaveLength(
			transferRules.length,
		);
	});

	it("makes no duplicate row when it runs two times", () => {
		seedCatalogue(db);
		seedCatalogue(db);
		expect(db.select().from(currency).all()).toHaveLength(currencies.length);
		expect(db.select().from(program).all()).toHaveLength(programs.length);
		expect(db.select().from(transferRule).all()).toHaveLength(
			transferRules.length,
		);
	});

	it("keeps the values of the catalogue", () => {
		seedCatalogue(db);
		const rules = db.select().from(transferRule).all();
		const toIberia = rules.find((rule) => rule.toProgramId === "iberia-club");
		expect(toIberia).toMatchObject({
			fromProgramId: "amex-mr",
			ratioNum: 4,
			ratioDen: 5,
			minTransfer: 500,
			increment: 500,
			validTo: null,
		});
	});

	it("stores transferable as a boolean", () => {
		seedCatalogue(db);
		const rows = db.select().from(program).all();
		expect(rows.find((row) => row.id === "ba-club")?.transferable).toBe(true);
		expect(rows.find((row) => row.id === "amex-mr")?.transferable).toBe(false);
	});
});

describe("the pragmas", () => {
	it("refuses a programme with a currency that does not exist", () => {
		expect(() =>
			db
				.insert(program)
				.values({
					id: "x",
					currencyId: "does-not-exist",
					code: "X",
					name: "X",
					transferable: true,
				})
				.run(),
		).toThrow();
	});
});
