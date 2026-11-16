/**
 * The links of the selector of the language, in the foot of each surface.
 *
 * Each link opens the public page of an other language. The name of a language
 * is in that language: a person who reads no Italian finds "Español". The foot
 * holds no router, thus the link opens the root of the language and not the
 * same page. Paragraph 5.8 of `docs/architecture.md` gives the rules.
 */

/** One link of the selector. */
export type LanguageLink<L extends string> = {
	locale: L;
	name: string;
	href: string;
};

export function languageLinks<L extends string>(
	current: L,
	locales: readonly L[],
	routing: { pathFor(locale: L, path: string): string },
	names: Readonly<Record<L, string>>,
): LanguageLink<L>[] {
	return locales
		.filter((locale) => locale !== current)
		.map((locale) => ({
			locale,
			name: names[locale],
			href: routing.pathFor(locale, "/"),
		}));
}
