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
import {
	BASE_LOCALE,
	LOCALE_TAGS,
	LOCALES,
	routing,
} from "../shared/locale.ts";
import { AppShell } from "./AppShell.tsx";
import { HomePage } from "./HomePage.tsx";
import { I18nProvider } from "./i18n/I18n.tsx";
import { type I18n, i18nOf, type Messages } from "./i18n/messages.ts";
import { LegalPage } from "./LegalPage.tsx";
import { appShellOf, EMPTY_ROOT, headOf, localizeHead } from "./lib/head.ts";
import { homeGraph, toJsonLdScript } from "./lib/jsonLd.ts";
import { llmsTxt } from "./lib/llms.ts";
import { SITE_URL } from "./lib/site.ts";

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
	title: (t: Messages) => string;
	description: (t: Messages) => string;
	/** The structured data of the page. Only the public page holds it. */
	jsonLd?: (i18n: I18n) => string;
};

/**
 * The pages with content for a crawler. The legal pages are static also:
 * Google reads the policy of the privacy before it publishes the sign-in, and
 * its crawler executes no JavaScript there. A page that the client writes in
 * the browser is the public page for such a crawler.
 */
const PAGES: readonly StaticPage[] = [
	{
		path: "/",
		element: <HomePage />,
		title: (t) => `Yume — ${t.homeTitle}`,
		description: (t) => t.siteDescription,
		jsonLd: (i18n) => toJsonLdScript(homeGraph(SITE_URL, i18n)),
	},
	{
		path: "/privacy",
		element: <LegalPage document="privacy" />,
		title: (t) => `${t.privacy.title} — Yume`,
		description: (t) => t.privacy.description,
	},
	{
		path: "/tos",
		element: <LegalPage document="tos" />,
		title: (t) => `${t.tos.title} — Yume`,
		description: (t) => t.tos.description,
	},
	// The documentation of the MCP server. The reviewer of the directory of
	// Anthropic and an assistant can read it with no JavaScript.
	{
		path: "/connector",
		element: <LegalPage document="connector" />,
		title: (t) => `${t.connector.title} — Yume`,
		description: (t) => t.connector.description,
	},
	// The contact of the service. The directories of the assistants read it.
	{
		path: "/support",
		element: <LegalPage document="support" />,
		title: (t) => `${t.support.title} — Yume`,
		description: (t) => t.support.description,
	},
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
			title: page.title(i18n.t),
			description: page.description(i18n.t),
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
	const llms = llmsTxt(home, i18n.t);
	writeFileSync(llmsPath, llms);
	console.log(
		`The pre-render wrote ${llms.length} characters in ${llmsPath}, with ${i18n.t.homeFaq.length} questions of structured data on the public page.`,
	);
}
