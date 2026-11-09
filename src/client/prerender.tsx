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
import { i18nOf } from "./i18n/messages.ts";
import { headOf, localizeHead } from "./lib/head.ts";
import { homeGraph, toJsonLdScript } from "./lib/jsonLd.ts";
import { llmsTxt } from "./lib/llms.ts";
import { SITE_URL } from "./lib/site.ts";

/** The file that Vite wrote. The path is from the root of the repository. */
const INDEX_PATH = "dist/index.html";

/** The path in `dist/` of a file of a language, for example `dist/en/llms.txt`. */
function distPath(locale: (typeof LOCALES)[number], file: string): string {
	return `dist${routing.pathFor(locale, `/${file}`)}`;
}

/**
 * The empty element of `index.html`.
 *
 * The build must stop when this text is not in the file: a change of the name
 * of the element gives a page with no text, and that defect is not visible in
 * the browser.
 */
const EMPTY_ROOT = '<div id="root"></div>';

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

for (const locale of LOCALES) {
	const i18n = i18nOf(locale);

	const markup = renderToStaticMarkup(
		<I18nProvider locale={locale}>
			<AppShell>
				<HomePage />
			</AppShell>
		</I18nProvider>,
	);

	const head = headOf({
		site: SITE_URL,
		locale,
		routing,
		locales: LOCALES,
		base: BASE_LOCALE,
		tags: LOCALE_TAGS,
		t: i18n.t,
	});
	const jsonLd = toJsonLdScript(homeGraph(SITE_URL, i18n));

	const pagePath = distPath(locale, "index.html");
	mkdirSync(dirname(pagePath), { recursive: true });
	writeFileSync(
		pagePath,
		localizeHead(html, head)
			.replace(HEAD_END, `${jsonLd}${HEAD_END}`)
			.replace(EMPTY_ROOT, `<div id="root">${markup}</div>`),
	);

	// The address of the public page of the language, with a slash at the end
	// for the base language as before.
	const page = `${SITE_URL}${routing.pathFor(locale, "/")}`;
	const llmsPath = distPath(locale, "llms.txt");
	const llms = llmsTxt(page, i18n.t);
	writeFileSync(llmsPath, llms);

	console.log(
		`The pre-render wrote ${markup.length} characters in ${pagePath}, with ${i18n.t.homeFaq.length} questions of structured data, and ${llms.length} characters in ${llmsPath}.`,
	);
}
