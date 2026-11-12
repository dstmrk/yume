/**
 * The pre-render of the public page.
 *
 * The client is a single page application: `index.html` holds an empty `div`,
 * and React writes each element in the browser. Google executes that
 * JavaScript. The crawlers of the assistants read the HTML only, thus the
 * public page is an empty page for them.
 *
 * This file writes one page for each language: `dist/index.html` for the base
 * language and `dist/en/index.html` for English. Paragraph 5.8 of
 * `docs/architecture.md` gives the rules. Each page holds four items:
 *
 * 1. The elements of the page, in the empty `div` of `index.html`. Then a
 *    crawler that executes no JavaScript reads the blocks and the questions,
 *    and a browser paints them before it loads the bundle.
 * 2. The structured data of schema.org, in the head of the same file. A search
 *    engine reads there what the application is and what questions the page
 *    answers. Refer to `lib/jsonLd.ts`.
 * 3. The file `llms.txt`, with the same text in markdown, near the page of the
 *    language. The server supplies `dist/` as static files, thus that file
 *    needs no route. Refer to `lib/llms.ts`.
 * 4. The head of the language: `lang`, the title, the description, Open Graph,
 *    the canonical address and the links `hreflang`. Refer to `lib/head.ts`.
 *
 * The file also writes the shell of the application for each language:
 * `dist/app.html` for the base language and `dist/en/app.html` for English.
 * The shell holds an empty root, no structured data and `noindex`. The server
 * gives it to `/dashboard`, `/login` and each 404: the public page there
 * paints the example board before the bundle loads. Refer to `appShellOf`.
 *
 * `npm run build` runs this file. Vite makes the bundle of this module for
 * Node, because Node executes no JSX. The build of the client comes first: this
 * file reads the file that Vite wrote, and it writes that same file again.
 *
 * The page holds no element of the router, thus `renderToStaticMarkup` needs no
 * context and no session. `AppShell` gives the same column as the root route.
 * Refer to paragraph 5.5.3 of `docs/architecture.md`.
 *
 * React writes the page again at the load, because `main.tsx` calls
 * `createRoot`. The elements of the two are the same, thus a person sees no
 * change. The structured data is in the head, outside the element of the root:
 * React writes the elements of the root again and it removes no item of the
 * head.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_COUNTRY } from "../shared/catalogue.ts";
import {
	BASE_LOCALE,
	LOCALE_TAGS,
	LOCALES,
	routing,
} from "../shared/locale.ts";
import { AppShell } from "./AppShell.tsx";
import { CalculatorPage } from "./CalculatorPage.tsx";
import { CurrenciesPage } from "./CurrenciesPage.tsx";
import { CurrencyPage } from "./CurrencyPage.tsx";
import { GuidePage } from "./GuidePage.tsx";
import { HomePage } from "./HomePage.tsx";
import { I18nProvider } from "./i18n/I18n.tsx";
import { type I18n, i18nOf, type Messages } from "./i18n/messages.ts";
import { LegalPage } from "./LegalPage.tsx";
import { todayIso } from "./lib/balance.ts";
import {
	currencyPages,
	SOURCE_SLUGS,
	sourcePages,
	unreachableCurrencies,
} from "./lib/catalogue.ts";
import { currencyText, sourceText } from "./lib/content.ts";
import { appShellOf, EMPTY_ROOT, headOf, localizeHead } from "./lib/head.ts";
import {
	articleJsonLd,
	breadcrumbJsonLd,
	type Crumb,
	faqPageJsonLd,
	homeGraph,
	type JsonLdItem,
	toJsonLdScript,
	webPageJsonLd,
} from "./lib/jsonLd.ts";
import { llmsFullTxt, llmsTxt } from "./lib/llms.ts";
import {
	currencyCrumbs,
	PATHS,
	pageCrumbs,
	publicPaths,
	sitemapXml,
} from "./lib/pages.ts";
import { SEED } from "./lib/seed.ts";
import { SITE_URL } from "./lib/site.ts";
import { SourcePage } from "./SourcePage.tsx";

/** The file that Vite wrote. The path is from the root of the repository. */
const INDEX_PATH = "dist/index.html";

/** The path in `dist/` of a file of a language, for example `dist/en/llms.txt`. */
function distPath(locale: (typeof LOCALES)[number], file: string): string {
	return `dist${routing.pathFor(locale, `/${file}`)}`;
}

/*
 * The build must stop when the empty element of the root is not in the file:
 * a change of the name of the element gives a page with no text, and that
 * defect is not visible in the browser. `EMPTY_ROOT` is in `lib/head.ts`.
 */

/**
 * The end of the head of `index.html`.
 *
 * The build must stop when this text is not in the file, for the same reason as
 * `EMPTY_ROOT`: a page with no structured data is not visible in the browser.
 */
const HEAD_END = "</head>";

const html = readFileSync(INDEX_PATH, "utf8");
if (!html.includes(EMPTY_ROOT)) {
	throw new Error(
		`${INDEX_PATH} holds no ${EMPTY_ROOT}. The pre-render stops.`,
	);
}
if (!html.includes(HEAD_END)) {
	throw new Error(`${INDEX_PATH} holds no ${HEAD_END}. The pre-render stops.`);
}

/** A static page of the build: its path, its elements and its head. */
type StaticPage = {
	/** The path with no prefix of the language. */
	path: string;
	element: ReactNode;
	title: (i18n: I18n) => string;
	description: (i18n: I18n) => string;
	/** The structured data of the page. */
	jsonLd?: (i18n: I18n) => string;
};

/** The date of the build. The pages give the rules that are valid today. */
const AT = todayIso(new Date());
const currencies = currencyPages(SEED, DEFAULT_COUNTRY, AT);
const sources = sourcePages(SEED, DEFAULT_COUNTRY, AT, SOURCE_SLUGS);
const unreachable = unreachableCurrencies(SEED, DEFAULT_COUNTRY, AT);

/** The path of a page in the language, with absolute paths of the prefix. */
function localCrumbs(
	locale: (typeof LOCALES)[number],
	crumbs: readonly Crumb[],
): Crumb[] {
	return crumbs.map((crumb) => ({
		name: crumb.name,
		path: routing.pathFor(locale, crumb.path),
	}));
}

/** The elements `script` of a list of structured data. */
function graph(items: readonly JsonLdItem[]): string {
	return toJsonLdScript(items);
}

/**
 * The pages with content for a crawler. The legal pages are static also:
 * Google reads the policy of the privacy before it publishes the sign-in, and
 * its crawler executes no JavaScript there. A page that the client writes in
 * the browser is the public page for such a crawler.
 *
 * The pages of the catalogue, the calculator and the guides follow. Their
 * title is the title of the page alone, with no name of the application: the
 * search engine cuts a title of more than 60 characters. Paragraph 5.5.5 of
 * `docs/architecture.md` gives the rules.
 */
const PAGES: readonly StaticPage[] = [
	{
		path: "/",
		element: <HomePage />,
		title: ({ t }) => `Yume — ${t.homeTitle}`,
		description: ({ t }) => t.siteDescription,
		jsonLd: (i18n) => toJsonLdScript(homeGraph(SITE_URL, i18n)),
	},
	{
		path: "/privacy",
		element: <LegalPage document="privacy" />,
		title: ({ t }) => `${t.privacy.title} — Yume`,
		description: ({ t }) => t.privacy.description,
	},
	{
		path: "/tos",
		element: <LegalPage document="tos" />,
		title: ({ t }) => `${t.tos.title} — Yume`,
		description: ({ t }) => t.tos.description,
	},
	// The documentation of the MCP server. The reviewer of the directory of
	// Anthropic and an assistant can read it with no JavaScript.
	{
		path: "/connector",
		element: <LegalPage document="connector" />,
		title: ({ t }) => `${t.connector.title} — Yume`,
		description: ({ t }) => t.connector.description,
	},
	// The contact of the service. The directories of the assistants read it.
	{
		path: "/support",
		element: <LegalPage document="support" />,
		title: ({ t }) => `${t.support.title} — Yume`,
		description: ({ t }) => t.support.description,
	},
	{
		path: PATHS.calculator,
		element: <CalculatorPage />,
		title: ({ t }) => t.calculator.metaTitle,
		description: ({ t }) => t.calculator.description,
		jsonLd: (i18n) =>
			graph([
				breadcrumbJsonLd(
					SITE_URL,
					localCrumbs(
						i18n.locale,
						pageCrumbs(
							i18n.t.catalogue,
							i18n.t.footerCalculator,
							PATHS.calculator,
						),
					),
				),
				faqPageJsonLd(i18n.t.calculator.faq),
			]),
	},
	{
		path: PATHS.currencies,
		element: <CurrenciesPage />,
		title: ({ t }) => t.catalogue.hub.metaTitle,
		description: ({ t }) => t.catalogue.hub.description,
		jsonLd: (i18n) =>
			graph([
				breadcrumbJsonLd(
					SITE_URL,
					localCrumbs(
						i18n.locale,
						pageCrumbs(
							i18n.t.catalogue,
							i18n.t.catalogue.currencies,
							PATHS.currencies,
						),
					),
				),
			]),
	},
	...currencies.map(
		(page): StaticPage => ({
			path: PATHS.currency(page.currency.id),
			element: <CurrencyPage currencyId={page.currency.id} />,
			title: ({ t }) => t.catalogue.currency.metaTitle(page.currency.name),
			description: (i18n) => currencyText(page, sources, i18n).description,
			jsonLd: (i18n) => {
				const text = currencyText(page, sources, i18n);
				const path = routing.pathFor(
					i18n.locale,
					PATHS.currency(page.currency.id),
				);
				return graph([
					webPageJsonLd(SITE_URL, i18n, {
						path,
						title: text.title,
						description: text.description,
						modified: page.updated,
					}),
					breadcrumbJsonLd(
						SITE_URL,
						localCrumbs(
							i18n.locale,
							currencyCrumbs(i18n.t.catalogue, page.currency),
						),
					),
					faqPageJsonLd(text.faq),
				]);
			},
		}),
	),
	...sources.map(
		(page): StaticPage => ({
			path: PATHS.source(page.slug),
			element: <SourcePage slug={page.slug} />,
			title: (i18n) => sourceText(page, i18n).metaTitle,
			description: (i18n) => sourceText(page, i18n).description,
			jsonLd: (i18n) => {
				const text = sourceText(page, i18n);
				const path = routing.pathFor(i18n.locale, PATHS.source(page.slug));
				return graph([
					webPageJsonLd(SITE_URL, i18n, {
						path,
						title: text.title,
						description: text.description,
						modified: page.updated,
					}),
					breadcrumbJsonLd(
						SITE_URL,
						localCrumbs(
							i18n.locale,
							pageCrumbs(i18n.t.catalogue, text.title, PATHS.source(page.slug)),
						),
					),
					faqPageJsonLd(text.faq),
				]);
			},
		}),
	),
	...i18nOf(BASE_LOCALE).t.guides.items.map((base, index): StaticPage => {
		const guideOf = (t: Messages) => t.guides.items[index] ?? base;
		return {
			path: PATHS.guide(base.slug),
			element: <GuidePage slug={base.slug} />,
			title: ({ t }) => guideOf(t).metaTitle,
			description: ({ t }) => guideOf(t).description,
			jsonLd: (i18n) => {
				const guide = guideOf(i18n.t);
				return graph([
					articleJsonLd(SITE_URL, i18n, {
						path: routing.pathFor(i18n.locale, PATHS.guide(guide.slug)),
						title: guide.title,
						description: guide.description,
						published: guide.published,
						modified: guide.modified,
					}),
					breadcrumbJsonLd(
						SITE_URL,
						localCrumbs(
							i18n.locale,
							pageCrumbs(
								i18n.t.catalogue,
								guide.title,
								PATHS.guide(guide.slug),
							),
						),
					),
					faqPageJsonLd(guide.faq),
				]);
			},
		};
	}),
];

for (const locale of LOCALES) {
	const i18n = i18nOf(locale);

	// The shell has the title and the description of the public page: the
	// browser shows that title until the bundle loads.
	const shellPath = distPath(locale, "app.html");
	mkdirSync(dirname(shellPath), { recursive: true });
	writeFileSync(
		shellPath,
		appShellOf(
			html,
			headOf({
				site: SITE_URL,
				locale,
				path: "/",
				routing,
				locales: LOCALES,
				base: BASE_LOCALE,
				tags: LOCALE_TAGS,
				title: `Yume — ${i18n.t.homeTitle}`,
				description: i18n.t.siteDescription,
			}),
		),
	);
	console.log(
		`The pre-render wrote the shell of the application in ${shellPath}.`,
	);

	for (const page of PAGES) {
		const markup = renderToStaticMarkup(
			<I18nProvider locale={locale}>
				<AppShell>{page.element}</AppShell>
			</I18nProvider>,
		);

		const head = headOf({
			site: SITE_URL,
			locale,
			path: page.path,
			routing,
			locales: LOCALES,
			base: BASE_LOCALE,
			tags: LOCALE_TAGS,
			title: page.title(i18n),
			description: page.description(i18n),
		});
		const jsonLd = page.jsonLd?.(i18n) ?? "";

		// `/privacy` gives `dist/privacy/index.html`. The server supplies the
		// files of `dist/` before its own routes, thus that file answers.
		const file =
			page.path === "/" ? "index.html" : `${page.path.slice(1)}/index.html`;
		const pagePath = distPath(locale, file);
		mkdirSync(dirname(pagePath), { recursive: true });
		writeFileSync(
			pagePath,
			localizeHead(html, head)
				.replace(HEAD_END, `${jsonLd}${HEAD_END}`)
				.replace(EMPTY_ROOT, `<div id="root">${markup}</div>`),
		);
		console.log(
			`The pre-render wrote ${markup.length} characters in ${pagePath}.`,
		);
	}

	// The address of the public page of the language, with a slash at the end
	// for the base language as before.
	const home = `${SITE_URL}${routing.pathFor(locale, "/")}`;
	const llmsPath = distPath(locale, "llms.txt");
	const fullPath = distPath(locale, "llms-full.txt");
	// The links of `llms.txt`: each page of content after the public page,
	// with the title of its head.
	const links = PAGES.filter((page) => page.path !== "/").map((page) => ({
		title: page.title(i18n),
		url: `${SITE_URL}${routing.pathFor(locale, page.path)}`,
	}));
	const llms = llmsTxt(
		home,
		i18n.t,
		links,
		`${SITE_URL}${routing.pathFor(locale, "/llms-full.txt")}`,
	);
	writeFileSync(llmsPath, llms);
	console.log(
		`The pre-render wrote ${llms.length} characters in ${llmsPath}, with ${i18n.t.homeFaq.length} questions of structured data on the public page.`,
	);
	const full = llmsFullTxt({
		site: SITE_URL,
		i18n,
		currencies,
		sources,
	});
	writeFileSync(fullPath, full);
	console.log(`The pre-render wrote ${full.length} characters in ${fullPath}.`);
}

// One sitemap for each language, at the root: `robots.txt` gives its address.
const sitemap = sitemapXml(
	SITE_URL,
	LOCALES.flatMap((locale) =>
		publicPaths(SEED, DEFAULT_COUNTRY, AT, i18nOf(locale).t.guides.items).map(
			(page) => ({ ...page, path: routing.pathFor(locale, page.path) }),
		),
	),
);
writeFileSync("dist/sitemap.xml", sitemap);
console.log(
	`The pre-render wrote ${sitemap.split("<url>").length - 1} addresses in dist/sitemap.xml.`,
);
// The currencies that no source reaches have no page. The list of the
// currencies names them.
console.log(
	`The pre-render wrote ${currencies.length} pages of currencies and ${sources.length} pages of sources. ${unreachable.length} currencies have no page.`,
);
