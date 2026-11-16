import { describe, expect, it } from "vitest";
import { es } from "./es.ts";
import { it as italian } from "./it.ts";

/**
 * The lists of the subjects of the site. A market names its own sources, thus
 * the length of these lists follows the catalogue of the country.
 */
const FREE_LISTS = new Set(["es.jsonLd.knowsAbout", "es.jsonLd.featureList"]);

/**
 * The type `Messages` asks for each key, but it does not count the items of a
 * list. A translation with one section less of the privacy policy passes the
 * typecheck. This test compares the shape of the two texts: the same lists
 * with the same length, and functions with the same parameters.
 */
function differences(base: unknown, other: unknown, path: string): string[] {
	if (FREE_LISTS.has(path)) {
		return Array.isArray(other) && other.length > 0 ? [] : [`${path}: a list`];
	}
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
