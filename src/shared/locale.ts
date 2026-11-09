/**
 * The languages of the interface and the prefix of each one in the path.
 *
 * The language is different from the market. The language gives the text and
 * the format of the numbers. The market gives the catalogue and the transfer
 * rules: refer to `DEFAULT_COUNTRY` of `catalogue.ts`. Paragraph 5.8 of
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
export const LOCALES = ["it"] as const;

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
};

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
) {
	if (!locales.includes(base)) {
		throw new Error(`The base language ${base} is not in the list.`);
	}
	if (new Set(locales).size !== locales.length) {
		throw new Error("The list holds the same language two times.");
	}

	const prefixed = locales.filter((locale) => locale !== base);

	return {
		/**
		 * Gives the language of a path and the path without the prefix.
		 *
		 * A prefix is a full segment with the exact case. The base language has
		 * no prefix, thus `/it/login` stays a path of the base language, and
		 * the server gives the status 404 to it. Two addresses for one page
		 * divide the results of a search engine.
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

		/** Writes the path of a page in a language. */
		pathFor(locale: L, path: string): string {
			if (!path.startsWith("/")) {
				throw new Error(`The path ${path} has no slash at the start.`);
			}
			if (locale === base) {
				return path;
			}
			return path === "/" ? `/${locale}` : `/${locale}${path}`;
		},
	};
}

/** The routing of the application. */
export const routing = localeRouting(LOCALES, BASE_LOCALE);
