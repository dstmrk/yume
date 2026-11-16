import { describe, expect, it } from "vitest";
import { localeRouting } from "../../shared/locale.ts";
import { languageLinks } from "./languages.ts";

const routing = localeRouting(["it", "es"], "it");
const names = { it: "Italiano", es: "Español" };

describe("languageLinks", () => {
	// The selector gives the other languages: the current one is the page.
	it("gives each other language with its own name and its root", () => {
		expect(languageLinks("it", ["it", "es"], routing, names)).toEqual([
			{ locale: "es", name: "Español", href: "/es/" },
		]);
		expect(languageLinks("es", ["it", "es"], routing, names)).toEqual([
			{ locale: "it", name: "Italiano", href: "/" },
		]);
	});

	// Paragraph 5.8: the selector shows only with two languages or more.
	it("gives no link with one language", () => {
		expect(languageLinks("it", ["it"], routing, names)).toEqual([]);
	});
});
