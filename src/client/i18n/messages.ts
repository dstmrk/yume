/**
 * The text and the tags of each language.
 *
 * Add the text of a new language here and in `LOCALES` of
 * `src/shared/locale.ts`. The type `Record<Locale, Messages>` then asks for the
 * text, and the type `Messages` asks for each key. Paragraph 5.8 of
 * `docs/architecture.md` gives the rules.
 */

import { LOCALE_TAGS, LOCALES, type Locale } from "../../shared/locale.ts";
import { it, type Messages } from "./it.ts";

export type { Messages };

const MESSAGES: Record<Locale, Messages> = { it };

/** The language of a page: its text and the locale of `Intl`. */
export type I18n = {
	readonly locale: Locale;
	/** The locale of `Intl`, for the numbers, the dates and the order. */
	readonly intl: string;
	readonly t: Messages;
};

/**
 * One value for each language, made one time. The context of React then
 * receives the same object at each render, and no component renders again
 * without a change.
 */
const BY_LOCALE = Object.fromEntries(
	LOCALES.map((locale) => [
		locale,
		{ locale, intl: LOCALE_TAGS[locale].intl, t: MESSAGES[locale] },
	]),
) as Record<Locale, I18n>;

/** Gives the text and the locale of `Intl` of a language. */
export function i18nOf(locale: Locale): I18n {
	return BY_LOCALE[locale];
}
