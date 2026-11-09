import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { localeRouting } from "../../shared/locale.ts";
import { it as italian } from "../i18n/it.ts";
import { headOf, localizeHead } from "./head.ts";

const SITE = "https://yumemiles.com";
const template = readFileSync("src/client/index.html", "utf8");

// The application holds one language. The test gives a second language, thus
// the head of that language has a test before the language exists.
const two = localeRouting(["it", "en"], "it");
const tags = {
	it: { html: "it", intl: "it-IT", openGraph: "it_IT" },
	en: { html: "en", intl: "en-GB", openGraph: "en_GB" },
};
const english = {
	...italian,
	homeTitle: "How many miles your points are worth",
	siteDescription: 'Yume gives the "potential" miles & more.',
};

function head(locale: "it" | "en", path = "/") {
	const t = locale === "it" ? italian : english;
	return headOf({
		site: SITE,
		locale,
		path,
		routing: two,
		locales: ["it", "en"],
		base: "it",
		tags,
		title: `Yume — ${t.homeTitle}`,
		description: t.siteDescription,
	});
}

describe("localizeHead for the base language", () => {
	const html = localizeHead(template, head("it"));

	// The head of `index.html` is Italian. The text of the dictionary must give
	// the same head: a difference is a text that moved in one file only.
	it("keeps the Italian text of index.html", () => {
		const withoutLinks = html.replace(/\t\t<link rel="alternate"[^\n]*\n/g, "");
		expect(withoutLinks).toBe(template);
	});

	it("gives a link hreflang to each language and x-default to the base", () => {
		expect(html).toContain(
			`<link rel="alternate" hreflang="it" href="${SITE}/" />`,
		);
		expect(html).toContain(
			`<link rel="alternate" hreflang="en" href="${SITE}/en/" />`,
		);
		expect(html).toContain(
			`<link rel="alternate" hreflang="x-default" href="${SITE}/" />`,
		);
	});
});

describe("localizeHead for an other language", () => {
	const html = localizeHead(template, head("en"));

	it("gives the attribute lang and og:locale of the language", () => {
		expect(html).toContain('<html lang="en">');
		expect(html).toContain('<meta property="og:locale" content="en_GB" />');
	});

	it("gives the address of the page of the language", () => {
		expect(html).toContain(`<link rel="canonical" href="${SITE}/en/" />`);
		expect(html).toContain(`<meta property="og:url" content="${SITE}/en/" />`);
	});

	it("gives the title and the description of the language", () => {
		expect(html).toContain(
			"<title>Yume — How many miles your points are worth</title>",
		);
		expect(html).toContain(
			'content="Yume — How many miles your points are worth"',
		);
		expect(html).not.toContain(italian.homeTitle);
		expect(html).not.toContain(italian.siteDescription);
	});

	// A quote of the text closes the attribute before its place, and the page
	// then holds an attribute that no person wrote.
	it("writes the special characters of HTML as entities", () => {
		expect(html).toContain(
			"Yume gives the &quot;potential&quot; miles &amp; more.",
		);
		expect(html).not.toContain('"potential"');
	});

	it("keeps the x-default link on the base language", () => {
		expect(html).toContain(
			`<link rel="alternate" hreflang="x-default" href="${SITE}/" />`,
		);
	});
});

// The build is the only moment that writes the head. A template with a change
// must stop the build, not give a page with the Italian head.
describe("localizeHead with a template that is not correct", () => {
	it("stops when an element is not in the template", () => {
		const broken = template.replace(/<meta\s+property="og:url"[^>]*>/, "");
		expect(() => localizeHead(broken, head("en"))).toThrow(/og:url/);
	});

	it("stops when an element is two times in the template", () => {
		const twice = template.replace("</head>", "<title>X</title></head>");
		expect(() => localizeHead(twice, head("en"))).toThrow(/title/);
	});
});

// Each page of the build has its own address. A legal page with the address of
// the home page says to Google that the policy is the home page.
describe("headOf for a page that is not the home page", () => {
	it("gives the address of the page in each language", () => {
		expect(head("it", "/privacy").url).toBe(`${SITE}/privacy`);
		expect(head("en", "/privacy").url).toBe(`${SITE}/en/privacy`);
	});

	it("gives the links hreflang of the same page", () => {
		expect(head("en", "/privacy").alternates).toEqual([
			{ hreflang: "it", href: `${SITE}/privacy` },
			{ hreflang: "en", href: `${SITE}/en/privacy` },
			{ hreflang: "x-default", href: `${SITE}/privacy` },
		]);
	});
});
