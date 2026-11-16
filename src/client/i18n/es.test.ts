import { describe, expect, it } from "vitest";
import {
	currencies,
	programs,
	transferRules,
} from "../../server/db/seed/catalogue.ts";
import { MARKETS } from "../../shared/catalogue.ts";
import { es } from "./es.ts";
import { it as italian } from "./it.ts";

/**
 * The type `Messages` asks for each key, but it does not count the items of a
 * list. A translation with one section less of the privacy policy passes the
 * typecheck. This test compares the shape of the two texts: the same lists
 * with the same length, and functions with the same parameters.
 */
function differences(base: unknown, other: unknown, path: string): string[] {
	if (typeof base === "function") {
		return typeof other === "function" && other.length === base.length
			? []
			: [`${path}: a function with ${base.length} parameters`];
	}
	if (Array.isArray(base)) {
		if (!Array.isArray(other) || other.length !== base.length) {
			return [`${path}: a list of ${base.length} items`];
		}
		return base.flatMap((item, index) =>
			differences(item, other[index], `${path}[${index}]`),
		);
	}
	if (typeof base === "object" && base !== null) {
		const record = other as Record<string, unknown>;
		return Object.entries(base).flatMap(([key, value]) =>
			differences(value, record[key], `${path}.${key}`),
		);
	}
	if (typeof base === "string") {
		return typeof other === "string" && other.trim() !== ""
			? []
			: [`${path}: a text`];
	}
	return typeof other === typeof base ? [] : [`${path}: a ${typeof base}`];
}

describe("the Spanish text", () => {
	it("has the shape of the Italian text", () => {
		expect(differences(italian, es, "es")).toEqual([]);
	});

	// The legal pages are a translation. The owner decided that the Italian
	// text prevails, and each page says so.
	it("says on each legal page that the Italian text prevails", () => {
		for (const page of [es.privacy, es.tos]) {
			expect(page.subtitle).toContain("texto italiano, que prevalece");
		}
	});

	it("gives each guide a slug of its own language", () => {
		const slugs = es.guides.items.map((guide) => guide.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const guide of italian.guides.items) {
			expect(slugs).not.toContain(guide.slug);
		}
	});
});

/**
 * The Spanish public page names the numbers of the catalogue of Spain, as
 * `it.test.ts` does for Italy. A new rule of Spain that the copy does not
 * follow makes a test fail.
 */
describe("the Spanish copy and the catalogue of Spain", () => {
	const airline = new Set(
		currencies.filter((c) => c.kind === "airline").map((c) => c.id),
	);
	const airlinePrograms = programs.filter((p) => airline.has(p.currencyId));
	const rules = transferRules.filter(
		(rule) => rule.validTo === null && rule.country === MARKETS.es,
	);
	const scope = es.homeFaq.find((item) =>
		item.answer.includes("programas aéreos"),
	)?.answer;
	const avios = es.homeFaq.find((item) =>
		item.answer.includes("Avios"),
	)?.answer;

	it("gives the quantity of the airline programmes", () => {
		expect(scope).toContain(`${airlinePrograms.length} programas aéreos`);
	});

	it("gives the quantity of the programmes that a source of Spain reaches", () => {
		const reached = new Set(rules.map((rule) => rule.toProgramId));
		const count = airlinePrograms.filter((p) => reached.has(p.id)).length;
		expect(scope).toContain(`Para los ${count} programas`);
	});

	it("names each source of Spain", () => {
		for (const id of new Set(rules.map((rule) => rule.fromProgramId))) {
			const name = programs.find((p) => p.id === id)?.name;
			expect(name).toBeDefined();
			expect(scope).toContain(name ?? "");
		}
	});

	it("names each programme that uses Avios, with the word of the quantity", () => {
		const aviosPrograms = programs.filter((p) => p.currencyId === "avios");
		const word = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis"][
			aviosPrograms.length
		];
		for (const program of aviosPrograms) {
			expect(avios).toContain(program.name);
		}
		expect(es.homeWhat[0]?.body.toLowerCase()).toContain(`${word} programas`);
		expect(avios).toContain(`${word} veces`);
	});
});
