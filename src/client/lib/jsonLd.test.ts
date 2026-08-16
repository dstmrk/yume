import { describe, expect, it } from "vitest";
import {
	faqPageJsonLd,
	homeGraph,
	organizationJsonLd,
	softwareApplicationJsonLd,
	toJsonLdScript,
	webSiteJsonLd,
} from "./jsonLd.ts";

const SITE = "https://yumemiles.com";

describe("organizationJsonLd", () => {
	it("gives the type and the URL of the official instance", () => {
		const data = organizationJsonLd(SITE);

		expect(data["@type"]).toBe("Organization");
		expect(data.url).toBe(SITE);
		expect(data.logo).toBe(`${SITE}/icon-512.png`);
	});

	it("gives the country of the rules of the catalogue", () => {
		expect(organizationJsonLd(SITE).areaServed).toBe("IT");
	});

	it("names the subjects of the page in knowsAbout", () => {
		expect(organizationJsonLd(SITE).knowsAbout).toContain("Avios");
	});
});

describe("webSiteJsonLd", () => {
	it("gives the language of the page", () => {
		expect(webSiteJsonLd(SITE).inLanguage).toBe("it-IT");
	});

	it("holds no SearchAction: the site has no search", () => {
		expect(webSiteJsonLd(SITE)).not.toHaveProperty("potentialAction");
	});
});

describe("softwareApplicationJsonLd", () => {
	it("gives an application of the web with no price", () => {
		const data = softwareApplicationJsonLd(SITE);

		expect(data["@type"]).toBe("SoftwareApplication");
		expect(data.offers.price).toBe("0");
		expect(data.offers.priceCurrency).toBe("EUR");
	});

	it("names each function that the application gives today", () => {
		expect(softwareApplicationJsonLd(SITE).featureList.length).toBeGreaterThan(
			0,
		);
	});
});

describe("faqPageJsonLd", () => {
	it("makes one question for each item", () => {
		const data = faqPageJsonLd([
			{ question: "Domanda?", answer: "Risposta." },
			{ question: "Seconda?", answer: "Seconda risposta." },
		]);

		expect(data.mainEntity).toHaveLength(2);
		expect(data.mainEntity[0]?.name).toBe("Domanda?");
		expect(data.mainEntity[0]?.acceptedAnswer.text).toBe("Risposta.");
	});

	// A FAQPage with no question is a page that says nothing. The error stops
	// the build, and the build is the only moment that writes this data.
	it("refuses a list with no item", () => {
		expect(() => faqPageJsonLd([])).toThrow();
	});
});

describe("homeGraph", () => {
	it("holds the four types of the public page", () => {
		const graph = homeGraph(SITE, [{ question: "D?", answer: "R." }]);

		expect(graph.map((item) => item["@type"])).toStrictEqual([
			"Organization",
			"WebSite",
			"SoftwareApplication",
			"FAQPage",
		]);
	});

	it("gives the context one time, on each item", () => {
		for (const item of homeGraph(SITE, [{ question: "D?", answer: "R." }])) {
			expect(item["@context"]).toBe("https://schema.org");
		}
	});
});

describe("toJsonLdScript", () => {
	it("writes one element of a script for each item of the graph", () => {
		const html = toJsonLdScript([{ "@context": "https://schema.org" }]);

		expect(html).toContain('<script type="application/ld+json">');
		expect(html).toContain("</script>");
	});

	/**
	 * A value that holds `</script>` closes the element before its place. The
	 * page then holds an element that no person wrote. The catalogue is data of
	 * the repository today, but the text of the page arrives from `text.ts` and
	 * a later version can hold the name of a programme with a character of HTML.
	 */
	it("writes no character that closes the element", () => {
		const html = toJsonLdScript([
			{ "@context": "https://schema.org", name: "</script><b>x</b>&y" },
		]);

		expect(html).not.toContain("</script><b>");
		expect(html).toContain("\\u003c");
		expect(html).toContain("\\u0026");
	});

	it("keeps a value that a reader can read again as JSON", () => {
		const html = toJsonLdScript([
			{ "@context": "https://schema.org", name: "Avios & Flying Blue" },
		]);
		const body = html.slice(
			html.indexOf(">") + 1,
			html.lastIndexOf("</script>"),
		);

		expect(JSON.parse(body).name).toBe("Avios & Flying Blue");
	});
});
