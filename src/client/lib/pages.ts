/**
 * The public pages of the site: their paths and the date of their content.
 *
 * The pre-render writes one static page for each path, and the sitemap gives
 * the same list. Paragraph 5.5.5 of `docs/architecture.md` gives the rules.
 *
 * The functions are pure.
 */

import type { CountryCode, IsoDate } from "../../shared/catalogue.ts";
import {
	type Catalogue,
	currencyPages,
	SOURCE_SLUGS,
	sourcePages,
} from "./catalogue.ts";
import type { Crumb } from "./jsonLd.ts";

/** The paths of the pages of the catalogue, the calculator and the guides. */
export const PATHS = {
	calculator: "/calcolatore",
	currencies: "/miglia",
	currency: (currencyId: string) => `/miglia/${currencyId}`,
	source: (slug: string) => `/punti/${slug}`,
	guide: (slug: string) => `/guide/${slug}`,
} as const;

/** One page of the sitemap. `modified` is null when no date is known. */
export type PublicPath = {
	readonly path: string;
	readonly modified: IsoDate | null;
};

/**
 * The public pages with content for a search engine.
 *
 * A page of the catalogue gives the latest examination of its rules, and a
 * guide gives the date of its last change. The other pages give no date: a
 * date that moves at each build is a false signal of freshness.
 */
export function publicPaths(
	catalogue: Catalogue,
	country: CountryCode,
	at: IsoDate,
	guides: readonly { slug: string; modified: IsoDate }[],
): PublicPath[] {
	const currencies = currencyPages(catalogue, country, at);
	return [
		{ path: "/", modified: null },
		{ path: PATHS.calculator, modified: null },
		{ path: PATHS.currencies, modified: null },
		...currencies.map((page) => ({
			path: PATHS.currency(page.currency.id),
			modified: page.updated,
		})),
		...sourcePages(catalogue, country, at, SOURCE_SLUGS).map((page) => ({
			path: PATHS.source(page.slug),
			modified: page.updated,
		})),
		...guides.map((guide) => ({
			path: PATHS.guide(guide.slug),
			modified: guide.modified,
		})),
		{ path: "/connector", modified: null },
		{ path: "/support", modified: null },
		{ path: "/privacy", modified: null },
		{ path: "/tos", modified: null },
	];
}

/** Writes a text as the content of an element of XML. */
function xmlText(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

/** Gives the file `sitemap.xml` of the paths (https://www.sitemaps.org). */
export function sitemapXml(site: string, paths: readonly PublicPath[]): string {
	const urls = paths.map((page) => {
		const lastmod =
			page.modified === null ? "" : `<lastmod>${page.modified}</lastmod>`;
		return `<url><loc>${xmlText(`${site}${page.path}`)}</loc>${lastmod}</url>`;
	});
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...urls,
		"</urlset>",
		"",
	].join("\n");
}

/** The text of the path of each page. */
type CrumbText = { home: string; currencies: string };

/** The path of the page of a currency: Yume, then the currencies. */
export function currencyCrumbs(
	text: CrumbText,
	currency: { id: string; name: string },
): Crumb[] {
	return [
		{ name: text.home, path: "/" },
		{ name: text.currencies, path: PATHS.currencies },
		{ name: currency.name, path: PATHS.currency(currency.id) },
	];
}

/** The path of a page below the public page, with no level between. */
export function pageCrumbs(
	text: CrumbText,
	name: string,
	path: string,
): Crumb[] {
	return [
		{ name: text.home, path: "/" },
		{ name, path },
	];
}
