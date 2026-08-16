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
 * The function reads `text.ts`. Thus the file and the page hold the same text,
 * and no person writes that text two times. Paragraph 5.5.3 of
 * `docs/architecture.md` gives the rule.
 */

import { text } from "../text.ts";

/** One block of a title and its lines. */
function section(title: string, lines: readonly string[]): readonly string[] {
	return [`## ${title}`, "", ...lines, ""];
}

/** The body of `/llms.txt`, for the instance at `site`. */
export function llmsTxt(site: string): string {
	return [
		"# Yume",
		"",
		"> Yume calcola quante miglia puoi ottenere dai tuoi punti. Un valore per ogni valuta, con i rapporti di trasferimento ufficiali per l'Italia.",
		"",
		text.homeLead,
		"",
		`Pagina pubblica: ${site}/`,
		"",
		"L'accesso è solo su invito. Il codice è open source con licenza MIT.",
		"",
		...section(
			text.homeWhatTitle,
			text.homeWhat.map((block) => `- **${block.title}**: ${block.body}`),
		),
		// The mark of the future is a title of its own. An assistant that reads
		// one list of functions cites each item of that list as a function of
		// today.
		...section("In arrivo", [`- **${text.homeSoonTitle}**: ${text.homeSoon}`]),
		...section(
			text.homeFaqTitle,
			text.homeFaq.flatMap((item) => [
				`### ${item.question}`,
				"",
				item.answer,
				"",
			]),
		),
		...section("Avvertenze", [
			`- ${text.footerDisclaimer}`,
			`- ${text.footerIndependence}`,
		]),
	].join("\n");
}
