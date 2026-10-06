import { describe, expect, it } from "vitest";
import { text } from "../text.ts";
import { llmsTxt } from "./llms.ts";

const SITE = "https://yumemiles.com";
const body = llmsTxt(SITE);

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
