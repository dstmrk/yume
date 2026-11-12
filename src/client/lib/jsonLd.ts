/**
 * The structured data of the public page, in the format JSON-LD of schema.org.
 *
 * A search engine and an assistant read this data before the text: it says what
 * the application is, what subjects it covers and what questions the page
 * answers. Paragraph 5.5.3 of `docs/architecture.md` gives the channel.
 *
 * The functions are pure and they write a value. `src/client/prerender.tsx`
 * puts that value in the head of `dist/index.html`, thus a crawler that
 * executes no JavaScript reads it.
 *
 * The site holds one public page, therefore this file holds one graph. A second
 * page needs its own graph and a `BreadcrumbList`.
 */

import { DEFAULT_COUNTRY } from "../../shared/catalogue.ts";
import type { I18n } from "../i18n/messages.ts";

/** The context of each item. schema.org gives the vocabulary. */
const CONTEXT = "https://schema.org";

/**
 * The text of each item comes from the language of the page, in `t.jsonLd`.
 * The country of `areaServed` comes from the market, not from the language:
 * paragraph 5.8 of `docs/architecture.md` gives the difference.
 */

/** An item of the graph. Each item holds the context and the type. */
export type JsonLdItem = Record<string, unknown>;

/**
 * The person or the group behind the application.
 *
 * `areaServed` is the country of the rules of the catalogue. Refer to the rule
 * 6 of the data in `CLAUDE.md`.
 */
export function organizationJsonLd(site: string, i18n: I18n) {
	return {
		"@context": CONTEXT,
		"@type": "Organization",
		name: "Yume",
		url: site,
		logo: `${site}/icon-512.png`,
		areaServed: DEFAULT_COUNTRY,
		knowsAbout: [...i18n.t.jsonLd.knowsAbout],
	} as const;
}

/**
 * The site.
 *
 * The item holds no `potentialAction`: the site has no search of its own, and a
 * declaration of a search that does not exist is a value that is not true.
 */
export function webSiteJsonLd(site: string, i18n: I18n) {
	return {
		"@context": CONTEXT,
		"@type": "WebSite",
		name: "Yume",
		url: site,
		inLanguage: i18n.intl,
		publisher: { "@type": "Organization", name: "Yume", url: site },
	} as const;
}

/**
 * The application.
 *
 * The price is 0: the sign-in with Google makes the account, and the code is
 * under the licence MIT.
 */
export function softwareApplicationJsonLd(site: string, i18n: I18n) {
	return {
		"@context": CONTEXT,
		"@type": "SoftwareApplication",
		name: "Yume",
		url: site,
		inLanguage: i18n.intl,
		applicationCategory: "FinanceApplication",
		operatingSystem: "Web, iOS, Android",
		description: i18n.t.siteDescription,
		featureList: [...i18n.t.jsonLd.featureList],
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "EUR",
		},
	} as const;
}

/** One question of the page, with its answer. */
export type FaqItem = {
	readonly question: string;
	readonly answer: string;
};

/**
 * The questions that the page answers.
 *
 * Each question is on the page. A question that no person reads is data that
 * says one thing to a crawler and an other thing to a reader.
 */
export function faqPageJsonLd(items: readonly FaqItem[]) {
	if (items.length === 0) {
		throw new Error("faqPageJsonLd needs one question or more.");
	}
	return {
		"@context": CONTEXT,
		"@type": "FAQPage",
		mainEntity: items.map((item) => ({
			"@type": "Question" as const,
			name: item.question,
			acceptedAnswer: { "@type": "Answer" as const, text: item.answer },
		})),
	} as const;
}

/**
 * The four items of the public page, in the order of the head. The questions
 * are the questions of the page, in its language.
 */
export function homeGraph(site: string, i18n: I18n): readonly JsonLdItem[] {
	return [
		organizationJsonLd(site, i18n),
		webSiteJsonLd(site, i18n),
		softwareApplicationJsonLd(site, i18n),
		faqPageJsonLd(i18n.t.homeFaq),
	];
}

/**
 * Writes the graph as the elements of a script for the head of the page.
 *
 * The function replaces `<`, `>` and `&` with the escape of JSON. A value that
 * holds `</script>` closes the element before its place, and the page then
 * holds an element that no person wrote. A reader of JSON gives the same value
 * after that replacement.
 */
export function toJsonLdScript(graph: readonly JsonLdItem[]): string {
	return graph
		.map((item) => {
			const body = JSON.stringify(item)
				.replaceAll("<", "\\u003c")
				.replaceAll(">", "\\u003e")
				.replaceAll("&", "\\u0026");
			return `<script type="application/ld+json">${body}</script>`;
		})
		.join("");
}

/** One item of the path of a page: its name and its path with the prefix. */
export type Crumb = { readonly name: string; readonly path: string };

/**
 * The path from the public page to a page of the catalogue or a guide.
 *
 * A search engine shows that path in place of the address. A list of one item
 * is the public page alone, thus the function stops: that page holds no path.
 */
export function breadcrumbJsonLd(site: string, crumbs: readonly Crumb[]) {
	if (crumbs.length < 2) {
		throw new Error("breadcrumbJsonLd needs two items or more.");
	}
	return {
		"@context": CONTEXT,
		"@type": "BreadcrumbList",
		itemListElement: crumbs.map((crumb, index) => ({
			"@type": "ListItem" as const,
			position: index + 1,
			name: crumb.name,
			item: `${site}${crumb.path}`,
		})),
	} as const;
}

/** The values of a page for its structured data. */
export type PageFacts = {
	readonly path: string;
	readonly title: string;
	readonly description: string;
	readonly modified: string;
};

/**
 * A page of the catalogue. `dateModified` is the latest examination of an
 * official page of its rules: the date moves only with a change of a rule.
 */
export function webPageJsonLd(site: string, i18n: I18n, page: PageFacts) {
	return {
		"@context": CONTEXT,
		"@type": "WebPage",
		name: page.title,
		description: page.description,
		url: `${site}${page.path}`,
		inLanguage: i18n.intl,
		dateModified: page.modified,
		isPartOf: { "@type": "WebSite" as const, url: site },
	} as const;
}

/** A guide, with the date of the first version and of the last change. */
export function articleJsonLd(
	site: string,
	i18n: I18n,
	page: PageFacts & { readonly published: string },
) {
	return {
		"@context": CONTEXT,
		"@type": "Article",
		headline: page.title,
		description: page.description,
		inLanguage: i18n.intl,
		datePublished: page.published,
		dateModified: page.modified,
		mainEntityOfPage: `${site}${page.path}`,
		author: { "@type": "Organization" as const, name: "Yume", url: site },
		publisher: { "@type": "Organization" as const, name: "Yume", url: site },
	} as const;
}
