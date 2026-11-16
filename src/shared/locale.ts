/**
 * The languages of the interface and the prefix of each one in the path.
 *
 * The language is different from the market. The language gives the text and
 * the format of the numbers. The market gives the catalogue and the transfer
 * rules: refer to `MARKETS` of `catalogue.ts`. Paragraph 5.8 of
 * `docs/architecture.md` gives the decisions.
 *
 * The path is the only source of the language. The base language has no
 * prefix: `/login`. Each other language has its prefix: `/en/login`. The
 * server makes no redirect from the header `Accept-Language`, thus a crawler
 * and a link always receive the same page.
 *
 * The client and the server both read this file. It does no I/O.
 */

/** The languages of the application. Add a language here with its text. */
export const LOCALES = ["it", "es"] as const;

export type Locale = (typeof LOCALES)[number];

/** The language of the paths with no prefix. */
export const BASE_LOCALE: Locale = "it";

/** The tags of a language for the HTML, for `Intl` and for Open Graph. */
export type LocaleTags = {
	/** The attribute `lang` of `html` and the value of `hreflang`. */
	html: string;
	/** The locale of `Intl`, for the numbers, the dates and the order. */
	intl: string;
	/** The value of `og:locale`. */
	openGraph: string;
};

export const LOCALE_TAGS: Record<Locale, LocaleTags> = {
	it: { html: "it", intl: "it-IT", openGraph: "it_IT" },
	es: { html: "es", intl: "es-ES", openGraph: "es_ES" },
};

/**
 * The segments of a path that each language writes with its own word.
 *
 * The code writes the Italian path, for example `/miglia/avios`. A language
 * with a word for `miglia` gives `/millas/avios`. The other paths stay the
 * same in each language: the legal pages, the guides and the private pages.
 * Paragraph 5.8 of `docs/architecture.md` gives the rules.
 */
export const SEGMENTS = ["calcolatore", "miglia", "punti"] as const;

export type Segment = (typeof SEGMENTS)[number];

/** The words of the segments of a language. A missing word keeps the segment. */
export type SegmentWords = Readonly<Partial<Record<Segment, string>>>;

/** The words of each language of the application. */
export const SEGMENT_WORDS: Readonly<Record<Locale, SegmentWords>> = {
	it: {},
	es: { calcolatore: "calculadora", miglia: "millas", punti: "puntos" },
};

/** A word of a path: lower case letters, digits and hyphens. */
const WORD = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The functions of the path for a list of languages.
 *
 * The application uses `routing`, with `LOCALES`. A test gives a list with a
 * second language: thus the routing of that language has a test before the
 * language exists.
 */
export function localeRouting<L extends string>(
	locales: readonly L[],
	base: L,
	words: Readonly<Partial<Record<L, SegmentWords>>> = {} as Readonly<
		Partial<Record<L, SegmentWords>>
	>,
) {
	if (!locales.includes(base)) {
		throw new Error(`The base language ${base} is not in the list.`);
	}
	if (new Set(locales).size !== locales.length) {
		throw new Error("The list holds the same language two times.");
	}
	for (const [locale, table] of Object.entries(words) as [L, SegmentWords][]) {
		const values = Object.values(table);
		if (new Set(values).size !== values.length) {
			throw new Error(`The language ${locale} gives one word to two segments.`);
		}
		for (const [segment, word] of Object.entries(table)) {
			if (!WORD.test(word)) {
				throw new Error(`The word ${word} of ${locale} is not a segment.`);
			}
			if (word !== segment && (SEGMENTS as readonly string[]).includes(word)) {
				throw new Error(`The word ${word} of ${locale} is an other segment.`);
			}
		}
	}

	const prefixed = locales.filter((locale) => locale !== base);

	/** Writes the first segment of a path with the word of the language. */
	function localPath(locale: L, path: string): string {
		const table: Record<string, string | undefined> = words[locale] ?? {};
		const end = path.indexOf("/", 1);
		const segment = end === -1 ? path.slice(1) : path.slice(1, end);
		const word = table[segment];
		if (word === undefined) {
			return path;
		}
		return `/${word}${end === -1 ? "" : path.slice(end)}`;
	}

	/**
	 * Gives the path of the code for a path of the language: the opposite of
	 * `localPath`. The Italian segment of a language with its own word gives
	 * null: `/es/calcolatore` is no page, because `/es/calculadora` is.
	 */
	function codePath(locale: L, path: string): string | null {
		const table: Record<string, string | undefined> = words[locale] ?? {};
		const end = path.indexOf("/", 1);
		const segment = end === -1 ? path.slice(1) : path.slice(1, end);
		const rest = end === -1 ? "" : path.slice(end);
		for (const [code, word] of Object.entries(table)) {
			if (word === segment) {
				return `/${code}${rest}`;
			}
		}
		const own = table[segment];
		return own !== undefined && own !== segment ? null : path;
	}

	return {
		/**
		 * Gives the language of a path and the path without the prefix.
		 *
		 * A prefix is a full segment with the exact case. The base language has
		 * no prefix, thus `/it/login` stays a path of the base language, and
		 * the server gives the status 404 to it. Two addresses for one page
		 * divide the results of a search engine.
		 *
		 * The path keeps the words of the language. Compare it with `localPath`.
		 */
		localeOfPath(path: string): { locale: L; path: string } {
			for (const locale of prefixed) {
				const prefix = `/${locale}`;
				if (path === prefix || path === `${prefix}/`) {
					return { locale, path: "/" };
				}
				if (path.startsWith(`${prefix}/`)) {
					return { locale, path: path.slice(prefix.length) };
				}
			}
			return { locale: base, path };
		},

		localPath,
		codePath,

		/**
		 * Writes the path of a page in a language: the prefix, then the path
		 * with the words of the language.
		 */
		pathFor(locale: L, path: string): string {
			if (!path.startsWith("/")) {
				throw new Error(`The path ${path} has no slash at the start.`);
			}
			const local = localPath(locale, path);
			if (locale === base) {
				return local;
			}
			return `/${locale}${local}`;
		},
	};
}

/** The routing of the application. */
export const routing = localeRouting(LOCALES, BASE_LOCALE, SEGMENT_WORDS);
