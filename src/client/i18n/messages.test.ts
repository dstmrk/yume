import { describe, expect, it } from "vitest";
import { LOCALE_TAGS, LOCALES } from "../../shared/locale.ts";
import { it as italian } from "./it.ts";
import { i18nOf } from "./messages.ts";

describe("i18nOf", () => {
	it("gives the Italian text and the locale it-IT", () => {
		const i18n = i18nOf("it");
		expect(i18n.t).toBe(italian);
		expect(i18n.intl).toBe("it-IT");
	});

	// The type asks for a text of each language. This test also reads the
	// value at runtime: a cast cannot then hide a language with no text.
	it("gives a text and a locale for each language", () => {
		for (const locale of LOCALES) {
			const i18n = i18nOf(locale);
			expect(i18n.t.appName).toBe("Yume");
			expect(i18n.intl).toBe(LOCALE_TAGS[locale].intl);
		}
	});

	it("gives the same object at each call", () => {
		expect(i18nOf("it")).toBe(i18nOf("it"));
	});
});
