/**
 * The language of the page for each component.
 *
 * The page knows its language from the path before the render. Paragraph 5.8
 * of `docs/architecture.md` gives the rule. A component reads the text and the
 * locale of `Intl` with `useI18n`. The logic is in `messages.ts`.
 */

import { createContext, type ReactNode, use } from "react";
import type { Locale } from "../../shared/locale.ts";
import { type I18n, i18nOf } from "./messages.ts";

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider(props: { locale: Locale; children: ReactNode }) {
	return (
		<I18nContext value={i18nOf(props.locale)}>{props.children}</I18nContext>
	);
}

/**
 * Gives the text and the locale of `Intl` of the page.
 *
 * A component outside `I18nProvider` is a defect of the tree, thus the hook
 * stops the render with a message.
 */
export function useI18n(): I18n {
	const i18n = use(I18nContext);
	if (i18n === null) {
		throw new Error("useI18n needs an I18nProvider above the component.");
	}
	return i18n;
}
