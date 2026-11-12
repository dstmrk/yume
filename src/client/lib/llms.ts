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

import { routing } from "../../shared/locale.ts";
import type { I18n, Messages } from "../i18n/messages.ts";
import type { CurrencyPage, Route, SourcePage } from "./catalogue.ts";
import {
	currencyText,
	pointsText,
	ratioLine,
	routeSourceLabel,
	sourceText,
} from "./content.ts";
import { PATHS } from "./pages.ts";

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
export function llmsTxt(
	page: string,
	text: Messages,
	links: readonly { title: string; url: string }[],
	full: string,
): string {
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
		...section(text.llms.pages, [
			...links.map((link) => `- [${link.title}](${link.url})`),
			`- [${text.llms.full}](${full})`,
		]),
		...section(text.llms.warnings, [`- ${text.footerDisclaimer}`]),
	].join("\n");
}

/**
 * The file `llms-full.txt`: the text of each page of the catalogue and of each
 * guide, in markdown. The format gives that file for a site with many pages
 * (https://llmstxt.org).
 *
 * The file reads the functions of the pages, thus it holds the same text and
 * the same values as the pages. No search engine reads it: an assistant that
 * reads a page of documentation reads it. Paragraph 5.5.3 of
 * `docs/architecture.md`.
 */
export function llmsFullTxt(input: {
	site: string;
	i18n: I18n;
	currencies: readonly CurrencyPage[];
	sources: readonly SourcePage[];
}): string {
	const { site, i18n, currencies, sources } = input;
	const text = i18n.t;
	const url = (path: string) => `${site}${routing.pathFor(i18n.locale, path)}`;
	const faq = (items: readonly { question: string; answer: string }[]) =>
		items.flatMap((item) => [`### ${item.question}`, "", item.answer, ""]);
	const routeLine = (route: Route, currency: string) =>
		`- ${routeSourceLabel(route)} → ${route.target.name}: ${ratioLine(route, currency, i18n)}; ${text.catalogue.minimum.toLowerCase()} ${pointsText(route.rule.minTransfer, i18n)}; ${text.catalogue.increment.toLowerCase()} ${pointsText(route.rule.increment, i18n)}; ${text.catalogue.verifiedOn.toLowerCase()} ${route.rule.validFrom}`;

	return [
		"# Yume",
		"",
		`> ${text.siteDescription}`,
		"",
		...currencies.flatMap((page) => {
			const content = currencyText(page, sources, i18n);
			return [
				`## ${content.title}`,
				"",
				url(PATHS.currency(page.currency.id)),
				"",
				content.lead,
				"",
				...page.routes.map((route) => routeLine(route, page.currency.name)),
				"",
				...faq(content.faq),
			];
		}),
		...sources.flatMap((page) => {
			const content = sourceText(page, i18n);
			return [
				`## ${content.title}`,
				"",
				url(PATHS.source(page.slug)),
				"",
				content.lead,
				"",
				...page.groups.flatMap((group) =>
					group.routes.map((route) => routeLine(route, group.currency.name)),
				),
				"",
				...faq(content.faq),
			];
		}),
		...text.guides.items.flatMap((guide) => [
			`## ${guide.title}`,
			"",
			url(PATHS.guide(guide.slug)),
			"",
			guide.lead,
			"",
			...guide.sections.flatMap((item) => [
				`### ${item.title}`,
				"",
				...item.paragraphs.flatMap((paragraph) => [paragraph, ""]),
				...item.items.map((line) => `- ${line}`),
				...(item.items.length > 0 ? [""] : []),
			]),
			...faq(guide.faq),
		]),
		...section(text.llms.warnings, [`- ${text.footerDisclaimer}`]),
	].join("\n");
}
