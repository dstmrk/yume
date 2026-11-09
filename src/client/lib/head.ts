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

/** Gives the template with the head of one language. */
export function localizeHead(template: string, head: Head): string {
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
	html = replaceOne(
		html,
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
	const end = html.lastIndexOf("\t</head>");
	if (end === -1) {
		throw new Error("The template holds no </head>. The pre-render stops.");
	}
	return `${html.slice(0, end)}${links}${html.slice(end)}`;
}
