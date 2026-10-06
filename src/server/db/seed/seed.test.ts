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
			country: "IT",
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

// The key of `transfer_rule` holds the country. Thus a second country can hold
// its own ratio for a pair of programmes that Italy also holds.
describe("the key of a transfer rule", () => {
	const rule = {
		fromProgramId: "amex-mr",
		toProgramId: "ba-club",
		country: "IT",
		ratioNum: 4,
		ratioDen: 5,
		minTransfer: 800,
		increment: 400,
		validFrom: "2027-01-01",
		validTo: null,
	};

	it("accepts one pair with two countries on the same day", () => {
		seedCatalogue(db);
		db.insert(transferRule).values(rule).run();
		db.insert(transferRule)
			.values({ ...rule, country: "FR" })
			.run();
		const rows = db
			.select()
			.from(transferRule)
			.all()
			.filter((row) => row.validFrom === "2027-01-01");
		expect(rows.map((row) => row.country).sort()).toEqual(["FR", "IT"]);
	});

	it("refuses one pair with one country two times on the same day", () => {
		seedCatalogue(db);
		db.insert(transferRule).values(rule).run();
		expect(() => db.insert(transferRule).values(rule).run()).toThrow();
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
