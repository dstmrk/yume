import { describe, expect, it } from "vitest";
import { it as text } from "../i18n/it.ts";
import { i18nOf } from "../i18n/messages.ts";
import { currencyPages, SOURCE_SLUGS, sourcePages } from "./catalogue.ts";
import { currencyText, sourceText } from "./content.ts";
import { llmsFullTxt, llmsTxt } from "./llms.ts";
import { SEED } from "./seed.ts";

const SITE = "https://yumemiles.com";
const LINKS = [
	{ title: "Calcola le miglia", url: `${SITE}/calcolatore` },
	{ title: "Avios", url: `${SITE}/miglia/avios` },
];
const body = llmsTxt(`${SITE}/`, text, LINKS, `${SITE}/llms-full.txt`);

describe("llmsTxt", () => {
	it("opens with the name of the application, as the format asks", () => {
		expect(body.startsWith("# Yume\n")).toBe(true);
	});

	it("gives one line of summary after the title", () => {
		expect(body).toContain("\n> Yume calcola");
	});

	it("gives the address of the page", () => {
		expect(body).toContain(`${SITE}/`);
	});

	/**
	 * The file and the page must hold the same text. A file with its own text
	 * says one thing to an assistant and an other thing to a reader, and no
	 * person sees that difference.
	 */
	it("holds each block of the page", () => {
		for (const block of text.homeWhat) {
			expect(body).toContain(block.title);
			expect(body).toContain(block.body);
		}
	});

	it("holds each question and each answer of the page", () => {
		for (const item of text.homeFaq) {
			expect(body).toContain(item.question);
			expect(body).toContain(item.answer);
		}
	});

	it("holds the warning of the affiliation", () => {
		expect(body).toContain(text.footerDisclaimer);
	});

	it("holds no element of HTML", () => {
		expect(body).not.toMatch(/<[a-z]/i);
	});
});

describe("the links of llmsTxt", () => {
	it("gives each page as a link of markdown", () => {
		expect(body).toContain(`- [Calcola le miglia](${SITE}/calcolatore)`);
		expect(body).toContain(`- [Avios](${SITE}/miglia/avios)`);
	});

	it("gives the address of the full file", () => {
		expect(body).toContain(`${SITE}/llms-full.txt`);
	});
});

describe("llmsFullTxt", () => {
	const IT = i18nOf("it");
	const AT = "2026-11-11";
	const currencies = currencyPages(SEED, "IT", AT);
	const sources = sourcePages(SEED, "IT", AT, SOURCE_SLUGS);
	const full = llmsFullTxt({
		site: SITE,
		i18n: IT,
		currencies,
		sources,
	});

	it("opens with the name of the application", () => {
		expect(full.startsWith("# Yume\n")).toBe(true);
	});

	it("gives the title, the answer and the questions of each page of a currency", () => {
		for (const page of currencies) {
			const content = currencyText(page, sources, IT);
			expect(full).toContain(`## ${content.title}`);
			expect(full).toContain(content.lead);
			for (const item of content.faq) {
				expect(full).toContain(item.answer);
			}
		}
	});

	it("gives each route with its ratio and its minimum", () => {
		expect(full).toContain(
			"- Amex Membership Rewards → British Airways: 5 punti = 4 Avios; minimo 800 punti; multipli di 400 punti",
		);
	});

	it("gives the answer of each page of a source", () => {
		for (const page of sources) {
			expect(full).toContain(sourceText(page, IT).lead);
		}
	});

	it("gives each guide", () => {
		for (const guide of IT.t.guides.items) {
			expect(full).toContain(`## ${guide.title}`);
			expect(full).toContain(guide.lead);
		}
	});

	it("holds no element of HTML", () => {
		expect(full).not.toMatch(/<[a-z]/i);
	});
});
