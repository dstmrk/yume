/**
 * The pre-render of the public page.
 *
 * The client is a single page application: `index.html` holds an empty `div`,
 * and React writes each element in the browser. Google executes that
 * JavaScript. The crawlers of the assistants read the HTML only, thus the
 * public page is an empty page for the channel of `docs/monetisation.md`.
 *
 * This file writes three items in `dist/`:
 *
 * 1. The elements of the page, in the empty `div` of `index.html`. Then a
 *    crawler that executes no JavaScript reads the blocks and the questions,
 *    and a browser paints them before it loads the bundle.
 * 2. The structured data of schema.org, in the head of the same file. A search
 *    engine reads there what the application is and what questions the page
 *    answers. Refer to `lib/jsonLd.ts`.
 * 3. The file `llms.txt`, with the same text in markdown. The server supplies
 *    `dist/` as static files, thus that file needs no route. Refer to
 *    `lib/llms.ts`.
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

import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "./AppShell.tsx";
import { HomePage } from "./HomePage.tsx";
import { homeGraph, toJsonLdScript } from "./lib/jsonLd.ts";
import { llmsTxt } from "./lib/llms.ts";
import { SITE_URL } from "./lib/site.ts";
import { text } from "./text.ts";

/** The file that Vite wrote. The path is from the root of the repository. */
const INDEX_PATH = "dist/index.html";

/** The file of the crawlers of the assistants. Refer to https://llmstxt.org. */
const LLMS_PATH = "dist/llms.txt";

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

const markup = renderToStaticMarkup(
	<AppShell>
		<HomePage />
	</AppShell>,
);

const jsonLd = toJsonLdScript(homeGraph(SITE_URL, text.homeFaq));

writeFileSync(
	INDEX_PATH,
	html
		.replace(HEAD_END, `${jsonLd}${HEAD_END}`)
		.replace(EMPTY_ROOT, `<div id="root">${markup}</div>`),
);

const llms = llmsTxt(SITE_URL);
writeFileSync(LLMS_PATH, llms);

console.log(
	`The pre-render wrote ${markup.length} characters in ${INDEX_PATH}, with ${text.homeFaq.length} questions of structured data, and ${llms.length} characters in ${LLMS_PATH}.`,
);
