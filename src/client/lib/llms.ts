/**
 * The file `/llms.txt` of the site (https://llmstxt.org).
 *
 * A crawler of an assistant reads the HTML only, and it reads a file of text
 * with no effort. This file gives the same text as the public page, in
 * markdown: the summary, the blocks, the questions and the warning.
 *
 * The site holds one public page, therefore one file is sufficient. The format
 * also gives `/llms-full.txt` for the full text of a site with many pages. Add
 * that file with the first group of pages of the catalogue.
 *
 * The function reads the text of the language. Thus the file and the page hold the same text,
 * and no person writes that text two times. Paragraph 5.5.3 of
 * `docs/architecture.md` gives the rule.
 */

import type { Messages } from "../i18n/messages.ts";

/** One block of a title and its lines. */
function section(title: string, lines: readonly string[]): readonly string[] {
	return [`## ${title}`, "", ...lines, ""];
}

/**
 * The body of `/llms.txt`, for the page at `page`, in the language of `text`.
 *
 * `page` is the address of the public page of the language, for example
 * `https://yumemiles.com/` for Italian.
 */
export function llmsTxt(page: string, text: Messages): string {
	return [
		"# Yume",
		"",
		`> ${text.siteDescription}`,
		"",
		text.homeLead,
		"",
		`${text.llms.publicPage}: ${page}`,
		"",
		text.llms.access,
		"",
		...section(
			text.homeWhatTitle,
			text.homeWhat.map((block) => `- **${block.title}**: ${block.body}`),
		),
		...section(
			text.homeFaqTitle,
			text.homeFaq.flatMap((item) => [
				`### ${item.question}`,
				"",
				item.answer,
				"",
			]),
		),
		...section(text.llms.warnings, [`- ${text.footerDisclaimer}`]),
	].join("\n");
}
