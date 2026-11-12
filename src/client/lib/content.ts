/**
 * The text of the pages of the catalogue, made from the rules of the seed and
 * the dictionary of the language.
 *
 * The page and its structured data read the same function. Thus a question of
 * the structured data is always a question of the page: data that says one
 * thing to a crawler and an other thing to a reader is a defect. Paragraph
 * 5.5.5 of `docs/architecture.md` gives the rules.
 *
 * The functions are pure.
 */

import type { I18n } from "../i18n/messages.ts";
import {
	type CurrencyPage,
	formatRatio,
	type Route,
	type SourcePage,
	sourceLabel,
} from "./catalogue.ts";
import { formatList, formatPoints } from "./format.ts";
import type { FaqItem } from "./jsonLd.ts";

/** The text of one page: the head, the title, the answer and the questions. */
export type PageText = {
	readonly metaTitle: string;
	readonly description: string;
	readonly title: string;
	readonly lead: string;
	readonly faq: readonly FaqItem[];
};

/** `5 punti = 4 Avios`: the ratio of a route in the currency of its target. */
export function ratioLine(
	route: Route,
	currencyName: string,
	i18n: I18n,
): string {
	const ratio = formatRatio(route.rule, i18n.intl);
	return i18n.t.catalogue.ratioLine(ratio.from, ratio.to, currencyName);
}

/** `800 punti`, with the plural of the language. */
export function pointsText(points: number, i18n: I18n): string {
	return i18n.t.catalogue.points(formatPoints(points, i18n.intl), points);
}

/** The name of the source of a route: `Amex Membership Rewards`. */
export function routeSourceLabel(route: Route): string {
	return sourceLabel(route.source, route.sourceCurrency);
}

/** The name of the source of a page: `Amex Membership Rewards`. */
export function pageSourceLabel(page: SourcePage): string {
	return sourceLabel(page.source, page.currency);
}

/** The names of the sources of a currency, one time each. */
export function currencySourceNames(page: CurrencyPage): string[] {
	const names: string[] = [];
	for (const route of page.routes) {
		const label = routeSourceLabel(route);
		if (!names.includes(label)) {
			names.push(label);
		}
	}
	return names;
}

/**
 * The text of the page of one currency.
 *
 * The questions hold one question for each source of the catalogue, also for a
 * source that does not reach the currency: "can I transfer the points of Amex
 * into Miles & More?" is a question that a person writes, and "no" is an
 * answer.
 */
export function currencyText(
	page: CurrencyPage,
	sources: readonly SourcePage[],
	i18n: I18n,
): PageText {
	const text = i18n.t.catalogue;
	const name = page.currency.name;
	const names = currencySourceNames(page);
	const list = formatList(names, i18n.intl);

	const faq: FaqItem[] = sources.map((source) => {
		const label = pageSourceLabel(source);
		const routes = page.routes.filter(
			(route) => route.source.id === source.source.id,
		);
		return {
			question: text.currency.sourceQuestion(label, name),
			answer:
				routes.length === 0
					? text.currency.sourceNo(label, name)
					: text.currency.sourceYes(
							routes
								.map((route) =>
									text.currency.sourceRoute(
										route.target.name,
										ratioLine(route, name, i18n),
										pointsText(route.rule.minTransfer, i18n),
									),
								)
								.join("; "),
						),
		};
	});

	return {
		metaTitle: text.currency.metaTitle(name),
		description: text.currency.description(name, list),
		title: text.currency.title(name),
		lead: text.currency.lead(name, names.length, list),
		faq: [
			...faq,
			{ question: text.irreversibleQuestion, answer: text.irreversibleAnswer },
		],
	};
}

/** The text of the page of one source. */
export function sourceText(page: SourcePage, i18n: I18n): PageText {
	const text = i18n.t.catalogue;
	const label = pageSourceLabel(page);
	const routes = page.groups.flatMap((group) => group.routes);
	const minimums = routes.map((route) => route.rule.minTransfer);
	const low = Math.min(...minimums);
	const high = Math.max(...minimums);

	return {
		metaTitle: text.source.metaTitle(label),
		description: text.source.description(label),
		title: text.source.title(label),
		lead: text.source.lead(label, routes.length, page.groups.length),
		faq: [
			{
				question: text.source.countQuestion(label),
				answer: text.source.countAnswer(
					routes.length,
					formatList(
						page.groups.map((group) => group.currency.name),
						i18n.intl,
					),
				),
			},
			{
				question: text.source.minimumQuestion(label),
				answer:
					low === high
						? text.source.minimumSame(pointsText(low, i18n))
						: text.source.minimumRange(
								pointsText(low, i18n),
								pointsText(high, i18n),
							),
			},
			{ question: text.irreversibleQuestion, answer: text.irreversibleAnswer },
		],
	};
}

/** One row of the table of the comparison of the sources. */
export type MatrixRow = {
	readonly currency: CurrencyPage["currency"];
	/** One cell for each source: the ratios of its routes, or null. */
	readonly cells: readonly (string | null)[];
};

/**
 * The table of the comparison: one row for each currency, one column for each
 * source. A cell gives each different ratio of the routes of the source into
 * that currency, for example `5 : 4` for Amex into Avios.
 */
export function sourceMatrix(
	currencies: readonly CurrencyPage[],
	sources: readonly SourcePage[],
	intl: string,
): MatrixRow[] {
	return currencies.map((page) => ({
		currency: page.currency,
		cells: sources.map((source) => {
			const ratios: string[] = [];
			for (const route of page.routes) {
				if (route.source.id !== source.source.id) {
					continue;
				}
				const ratio = formatRatio(route.rule, intl);
				const cell = `${ratio.from} : ${ratio.to}`;
				if (!ratios.includes(cell)) {
					ratios.push(cell);
				}
			}
			return ratios.length === 0 ? null : ratios.join(" / ");
		}),
	}));
}

/**
 * The answer of the table of the comparison: the source with the most airline
 * programmes, then the others. Two sources with the same quantity keep the
 * sequence of the catalogue.
 */
export function matrixLead(sources: readonly SourcePage[], i18n: I18n): string {
	const counted = sources
		.map((page) => ({
			label: pageSourceLabel(page),
			programs: page.groups.reduce(
				(sum, group) => sum + group.routes.length,
				0,
			),
		}))
		.toSorted((a, b) => b.programs - a.programs);
	const [leader, ...others] = counted;
	if (leader === undefined) {
		return "";
	}
	const text = i18n.t.guides;
	return text.matrixLead(
		leader.label,
		leader.programs,
		formatList(
			others.map((other) => text.matrixOther(other.label, other.programs)),
			i18n.intl,
		),
	);
}
