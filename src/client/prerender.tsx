/**
 * The pre-render of the public page.
 *
 * The client is a single page application: `index.html` holds an empty `div`,
 * and React writes each element in the browser. Google executes that
 * JavaScript. The crawlers of the assistants read the HTML only, thus the
 * public page is an empty page for the channel of `docs/monetisation.md`.
 *
 * This file writes the elements of that page in `dist/index.html`. Then a
 * crawler reads the four blocks of text, and a browser paints them before it
 * loads the bundle.
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
 * change.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "./AppShell.tsx";
import { HomePage } from "./HomePage.tsx";

/** The file that Vite wrote. The path is from the root of the repository. */
const INDEX_PATH = "dist/index.html";

/**
 * The empty element of `index.html`.
 *
 * The build must stop when this text is not in the file: a change of the name
 * of the element gives a page with no text, and that defect is not visible in
 * the browser.
 */
const EMPTY_ROOT = '<div id="root"></div>';

const html = readFileSync(INDEX_PATH, "utf8");
if (!html.includes(EMPTY_ROOT)) {
	throw new Error(
		`${INDEX_PATH} holds no ${EMPTY_ROOT}. The pre-render stops.`,
	);
}

const markup = renderToStaticMarkup(
	<AppShell>
		<HomePage />
	</AppShell>,
);

writeFileSync(
	INDEX_PATH,
	html.replace(EMPTY_ROOT, `<div id="root">${markup}</div>`),
);

console.log(
	`The pre-render wrote ${markup.length} characters in ${INDEX_PATH}.`,
);
