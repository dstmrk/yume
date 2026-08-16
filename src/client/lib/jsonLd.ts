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

/** The context of each item. schema.org gives the vocabulary. */
const CONTEXT = "https://schema.org";

/** An item of the graph. Each item holds the context and the type. */
export type JsonLdItem = Record<string, unknown>;

/**
 * The subjects of the application.
 *
 * A search engine and an assistant read this list to know on what questions
 * this site is a source. Each item is a subject that the page covers with a
 * text, not a function of the product: the functions are in `featureList`.
 */
const KNOWS_ABOUT = [
	"Avios",
	"Membership Rewards",
	"RevPoints",
	"Miglia aeree",
	"Trasferimento punti",
	"Programmi fedeltà aerei",
	"Rapporti di trasferimento",
] as const;

/**
 * The functions that the application gives today.
 *
 * A function of `docs/monetisation.md` is not in this list. The page shows that
 * function with the mark of the future, and this data says what the application
 * does now.
 */
const FEATURE_LIST = [
	"Calcolo delle miglia potenziali per ogni valuta",
	"Rapporti di trasferimento ufficiali per l'Italia",
	"Saldi con la data di osservazione",
	"Applicazione installabile (PWA)",
] as const;

/** The description of the application. It is the description of `index.html`. */
const DESCRIPTION =
	"Yume calcola quante miglia puoi ottenere dai tuoi punti. Un valore per ogni valuta, con i rapporti di trasferimento ufficiali per l'Italia.";

/**
 * The person or the group behind the application.
 *
 * `areaServed` is `IT`: the catalogue holds the rules of Italy only. Refer to
 * the rule 6 of the data in `CLAUDE.md`.
 */
export function organizationJsonLd(site: string) {
	return {
		"@context": CONTEXT,
		"@type": "Organization",
		name: "Yume",
		url: site,
		logo: `${site}/icon-512.png`,
		areaServed: "IT",
		knowsAbout: [...KNOWS_ABOUT],
	} as const;
}

/**
 * The site.
 *
 * The item holds no `potentialAction`: the site has no search of its own, and a
 * declaration of a search that does not exist is a value that is not true.
 */
export function webSiteJsonLd(site: string) {
	return {
		"@context": CONTEXT,
		"@type": "WebSite",
		name: "Yume",
		url: site,
		inLanguage: "it-IT",
		publisher: { "@type": "Organization", name: "Yume", url: site },
	} as const;
}

/**
 * The application.
 *
 * The price is 0: Yume gives an account with an invitation, and the code is
 * under the licence MIT. The plan of `docs/monetisation.md` writes no price
 * here before the step of the payment.
 */
export function softwareApplicationJsonLd(site: string) {
	return {
		"@context": CONTEXT,
		"@type": "SoftwareApplication",
		name: "Yume",
		url: site,
		inLanguage: "it-IT",
		applicationCategory: "FinanceApplication",
		operatingSystem: "Web, iOS, Android",
		description: DESCRIPTION,
		featureList: [...FEATURE_LIST],
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

/** The four items of the public page, in the order of the head. */
export function homeGraph(
	site: string,
	faq: readonly FaqItem[],
): readonly JsonLdItem[] {
	return [
		organizationJsonLd(site),
		webSiteJsonLd(site),
		softwareApplicationJsonLd(site),
		faqPageJsonLd(faq),
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
