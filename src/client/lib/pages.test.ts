import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	currencies,
	programs,
	transferRules,
} from "../../server/db/seed/catalogue.ts";
import { i18nOf } from "../i18n/messages.ts";
import type { Catalogue } from "./catalogue.ts";
import {
	currencyCrumbs,
	PATHS,
	pageCrumbs,
	publicPaths,
	sitemapXml,
} from "./pages.ts";

const SITE = "https://yumemiles.com";
const AT = "2026-11-11";
const seed: Catalogue = { currencies, programs, rules: transferRules };
const guides = i18nOf("it").t.guides.items;

describe("publicPaths", () => {
	const paths = publicPaths(seed, "IT", AT, guides);

	it("starts with the public page", () => {
		expect(paths[0]).toStrictEqual({ path: "/", modified: null });
	});

	it("holds the calculator, the list of the currencies and each guide", () => {
		const list = paths.map((page) => page.path);

		expect(list).toContain(PATHS.calculator);
		expect(list).toContain(PATHS.currencies);
		for (const guide of guides) {
			expect(list).toContain(PATHS.guide(guide.slug));
		}
	});

	it("gives the date of the rules to a page of a currency", () => {
		const avios = paths.find((page) => page.path === "/miglia/avios");

		expect(avios?.modified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it("gives the date of the last change to a guide", () => {
		const guide = guides[0];
		const page = paths.find(
			(item) => item.path === PATHS.guide(guide?.slug ?? ""),
		);

		expect(page?.modified).toBe(guide?.modified);
	});

	it("gives each path one time", () => {
		const list = paths.map((page) => page.path);

		expect(new Set(list).size).toBe(list.length);
	});

	/**
	 * The router of the client renders each page after the load. A path that
	 * the router does not hold gives the page of the status 404 in the browser,
	 * over the static page. This test reads the file of the router.
	 */
	it("gives only paths that the router holds", () => {
		const source = readFileSync("src/client/router.tsx", "utf8");
		const patterns = [...source.matchAll(/\bpath: "([^"]+)"/g)].map(
			(match) =>
				new RegExp(
					`^${(match[1] ?? "").replace(/\$[A-Za-z]+/g, "[a-z0-9-]+")}$`,
				),
		);

		for (const page of paths) {
			expect(
				patterns.some((pattern) => pattern.test(page.path)),
				page.path,
			).toBe(true);
		}
	});
});

describe("sitemapXml", () => {
	it("gives each address, with the date when it is known", () => {
		const xml = sitemapXml(SITE, [
			{ path: "/", modified: null },
			{ path: "/miglia/avios", modified: "2026-10-06" },
		]);

		expect(xml).toBe(
			[
				'<?xml version="1.0" encoding="UTF-8"?>',
				'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
				`<url><loc>${SITE}/</loc></url>`,
				`<url><loc>${SITE}/miglia/avios</loc><lastmod>2026-10-06</lastmod></url>`,
				"</urlset>",
				"",
			].join("\n"),
		);
	});

	it("writes the characters of XML as entities", () => {
		const xml = sitemapXml(SITE, [{ path: "/a&b", modified: null }]);

		expect(xml).toContain(`<loc>${SITE}/a&amp;b</loc>`);
	});
});

describe("the paths of the pages", () => {
	const text = { home: "Yume", currencies: "Valute" };

	it("gives Yume, the currencies and the currency", () => {
		expect(currencyCrumbs(text, { id: "avios", name: "Avios" })).toStrictEqual([
			{ name: "Yume", path: "/" },
			{ name: "Valute", path: "/miglia" },
			{ name: "Avios", path: "/miglia/avios" },
		]);
	});

	it("gives Yume and the page", () => {
		expect(pageCrumbs(text, "Calcolatore", "/calcolatore")).toStrictEqual([
			{ name: "Yume", path: "/" },
			{ name: "Calcolatore", path: "/calcolatore" },
		]);
	});
});
