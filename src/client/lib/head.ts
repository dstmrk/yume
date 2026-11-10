/**
 * The head of the static page of each language.
 *
 * `index.html` holds the Italian head: a static file imports no module, and a
 * crawler of an assistant reads no JavaScript. The build writes one page for
 * each language. This file gives the head of each one: the attribute `lang`,
 * the title, the description, Open Graph, the canonical address and the links
 * `hreflang`. Paragraphs 5.5.3 and 5.8 of `docs/architecture.md` give the
 * rules.
 *
 * The functions are pure. `src/client/prerender.tsx` calls them.
 */

import type { LocaleTags } from "../../shared/locale.ts";

/** The values of the head of one page. */
export type Head = {
	readonly lang: string;
	readonly openGraph: string;
	readonly title: string;
	readonly description: string;
	/** The absolute address of the page. */
	readonly url: string;
	readonly alternates: readonly { hreflang: string; href: string }[];
};

/**
 * Gives the values of the head of one static page in one language.
 *
 * `path` is the path of the page with no prefix, for example `/privacy`. Each
 * page holds its own canonical address and the links `hreflang` of the same
 * page in the other languages.
 */
export function headOf<L extends string>(input: {
	site: string;
	locale: L;
	path: string;
	routing: { pathFor(locale: L, path: string): string };
	locales: readonly L[];
	base: L;
	tags: Record<L, LocaleTags>;
	title: string;
	description: string;
}): Head {
	const urlOf = (locale: L) =>
		`${input.site}${input.routing.pathFor(locale, input.path)}`;
	return {
		lang: input.tags[input.locale].html,
		openGraph: input.tags[input.locale].openGraph,
		title: input.title,
		description: input.description,
		url: urlOf(input.locale),
		alternates: [
			...input.locales.map((locale) => ({
				hreflang: input.tags[locale].html,
				href: urlOf(locale),
			})),
			{ hreflang: "x-default", href: urlOf(input.base) },
		],
	};
}

/** Writes a text as the value of an attribute of HTML. */
function attribute(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

/**
 * Replaces the value of one element of the head.
 *
 * The element must be in the template one time. A template with no element, or
 * with two, stops the build: a page with the head of an other language is not
 * visible in the browser.
 */
function replaceOne(
	html: string,
	name: string,
	pattern: RegExp,
	value: string,
): string {
	const found = html.match(new RegExp(pattern.source, "g")) ?? [];
	if (found.length !== 1) {
		throw new Error(
			`The template holds ${found.length} elements ${name}, not 1. The pre-render stops.`,
		);
	}
	return html.replace(
		pattern,
		(_match, start: string, _old: string, end: string) =>
			`${start}${value}${end}`,
	);
}

/**
 * Gives the shell of the application in one language.
 *
 * The server gives this page to `/dashboard`, `/login` and each 404. The root
 * stays empty, thus the browser paints no element of the public page before
 * the bundle loads: the example board then reads as a balance of the person.
 *
 * One shell answers each path, thus it holds no canonical address and no link
 * `hreflang`. The tag `noindex` keeps the shell out of the search engines, and
 * the shell holds no structured data. Paragraph 5.5.3 of
 * `docs/architecture.md` gives the rule.
 */
export function appShellOf(template: string, head: Head): string {
	if (!template.includes(EMPTY_ROOT)) {
		throw new Error(
			`The template holds no ${EMPTY_ROOT}. The pre-render stops.`,
		);
	}
	const html = localizeCommon(template, head);
	const canonical = /\t\t<link rel="canonical" href="[^"]*" \/>\n/g;
	const found = html.match(canonical) ?? [];
	if (found.length !== 1) {
		throw new Error(
			`The template holds ${found.length} elements canonical, not 1. The pre-render stops.`,
		);
	}
	return insertBeforeHeadEnd(html.replace(canonical, ""), ROBOTS_NOINDEX);
}

/** The empty element of the root in the template of Vite. */
export const EMPTY_ROOT = '<div id="root"></div>';

/** The tag that keeps a page out of the index of a search engine. */
const ROBOTS_NOINDEX = '\t\t<meta name="robots" content="noindex" />\n';

/** Writes a text in the template, before the end of the head. */
function insertBeforeHeadEnd(html: string, text: string): string {
	const end = html.lastIndexOf("\t</head>");
	if (end === -1) {
		throw new Error("The template holds no </head>. The pre-render stops.");
	}
	return `${html.slice(0, end)}${text}${html.slice(end)}`;
}

/** Gives the template with the head of one language. */
export function localizeHead(template: string, head: Head): string {
	const html = replaceOne(
		localizeCommon(template, head),
		"canonical",
		/(<link rel="canonical" href=")([^"]*)(")/,
		attribute(head.url),
	);

	const links = head.alternates
		.map(
			(item) =>
				`\t\t<link rel="alternate" hreflang="${attribute(item.hreflang)}" href="${attribute(item.href)}" />\n`,
		)
		.join("");
	return insertBeforeHeadEnd(html, links);
}

/**
 * Gives the template with the language, the title, the description and Open
 * Graph of one head. The public page and the shell hold these elements.
 */
function localizeCommon(template: string, head: Head): string {
	const meta = (attr: string, key: string) =>
		new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")([^"]*)(")`);

	let html = template;
	html = replaceOne(html, "html", /(<html lang=")([^"]*)(")/, head.lang);
	html = replaceOne(
		html,
		"title",
		/(<title>)([^<]*)(<\/title>)/,
		attribute(head.title),
	);
	html = replaceOne(
		html,
		"description",
		meta("name", "description"),
		attribute(head.description),
	);
	html = replaceOne(
		html,
		"og:title",
		meta("property", "og:title"),
		attribute(head.title),
	);
	html = replaceOne(
		html,
		"og:description",
		meta("property", "og:description"),
		attribute(head.description),
	);
	html = replaceOne(
		html,
		"og:locale",
		meta("property", "og:locale"),
		head.openGraph,
	);
	html = replaceOne(
		html,
		"og:url",
		meta("property", "og:url"),
		attribute(head.url),
	);
	return html;
}
