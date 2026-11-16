import { describe, expect, it } from "vitest";
import {
	BASE_LOCALE,
	LOCALE_TAGS,
	LOCALES,
	localeRouting,
	routing,
} from "./locale.ts";

// These tests use a language of the test, `en`, with its own rules, thus
// they examine the routing that the second language receives.
const two = localeRouting(["it", "en"], "it");

describe("localeOfPath", () => {
	it("gives the base language to a path with no prefix", () => {
		expect(two.localeOfPath("/")).toEqual({ locale: "it", path: "/" });
		expect(two.localeOfPath("/login")).toEqual({
			locale: "it",
			path: "/login",
		});
	});

	it("gives the language of the prefix and the path without it", () => {
		expect(two.localeOfPath("/en/login")).toEqual({
			locale: "en",
			path: "/login",
		});
		expect(two.localeOfPath("/en/dashboard")).toEqual({
			locale: "en",
			path: "/dashboard",
		});
	});

	it("gives the page of the root to the prefix alone", () => {
		expect(two.localeOfPath("/en")).toEqual({ locale: "en", path: "/" });
		expect(two.localeOfPath("/en/")).toEqual({ locale: "en", path: "/" });
	});

	// The base language has no prefix. Thus `/it/login` is not a second
	// address of `/login`: the path stays, and the server gives the status 404.
	it("reads no prefix for the base language", () => {
		expect(two.localeOfPath("/it/login")).toEqual({
			locale: "it",
			path: "/it/login",
		});
	});

	it("reads a prefix only as a full segment", () => {
		expect(two.localeOfPath("/english")).toEqual({
			locale: "it",
			path: "/english",
		});
		expect(two.localeOfPath("/enx/login")).toEqual({
			locale: "it",
			path: "/enx/login",
		});
	});

	// Two addresses with a different case are two addresses for a search
	// engine. Refer to `isClientPath` of `routes.ts`.
	it("keeps the case of the prefix", () => {
		expect(two.localeOfPath("/EN/login")).toEqual({
			locale: "it",
			path: "/EN/login",
		});
	});

	it("reads an unknown language as a path of the base language", () => {
		expect(two.localeOfPath("/fr/login")).toEqual({
			locale: "it",
			path: "/fr/login",
		});
	});
});

describe("pathFor", () => {
	it("writes no prefix for the base language", () => {
		expect(two.pathFor("it", "/")).toBe("/");
		expect(two.pathFor("it", "/login")).toBe("/login");
	});

	// The root of a language holds a slash at the end: the router writes
	// `/en/` for the link to `/`. The canonical address and the links of the
	// router then give one address for one page.
	it("writes the prefix of an other language", () => {
		expect(two.pathFor("en", "/login")).toBe("/en/login");
		expect(two.pathFor("en", "/")).toBe("/en/");
	});

	it("gives back the path that localeOfPath reads", () => {
		for (const path of ["/", "/login", "/dashboard"]) {
			for (const locale of ["it", "en"] as const) {
				expect(two.localeOfPath(two.pathFor(locale, path))).toEqual({
					locale,
					path,
				});
			}
		}
	});

	it("refuses a path with no slash at the start", () => {
		expect(() => two.pathFor("en", "login")).toThrow();
	});
});

// A second language with its own words in the path. The Italian path is the
// path in the code: the routing writes the word of the language.
const local = localeRouting(["it", "en"], "it", {
	en: { calcolatore: "calculator", miglia: "miles" },
});

describe("localPath", () => {
	it("writes the word of the language for the first segment", () => {
		expect(local.localPath("en", "/calcolatore")).toBe("/calculator");
		expect(local.localPath("en", "/miglia")).toBe("/miles");
		expect(local.localPath("en", "/miglia/avios")).toBe("/miles/avios");
	});

	it("keeps a segment with no word of the language", () => {
		expect(local.localPath("en", "/punti/amex")).toBe("/punti/amex");
		expect(local.localPath("en", "/login")).toBe("/login");
		expect(local.localPath("en", "/")).toBe("/");
	});

	// Only a full segment changes: `/miglia-extra` is not `/miglia`.
	it("changes only a full segment", () => {
		expect(local.localPath("en", "/miglia-extra")).toBe("/miglia-extra");
		expect(local.localPath("en", "/x/miglia")).toBe("/x/miglia");
	});

	it("keeps the path of the base language", () => {
		expect(local.localPath("it", "/calcolatore")).toBe("/calcolatore");
	});

	it("gives the word to pathFor, after the prefix", () => {
		expect(local.pathFor("en", "/miglia/avios")).toBe("/en/miles/avios");
		expect(local.pathFor("it", "/miglia/avios")).toBe("/miglia/avios");
	});

	// `localeOfPath` gives the path of the language. The server and the router
	// compare it with `localPath`, thus `/en/calcolatore` is no page.
	it("gives the path of the language from localeOfPath", () => {
		expect(local.localeOfPath("/en/miles/avios")).toEqual({
			locale: "en",
			path: "/miles/avios",
		});
	});
});

describe("codePath", () => {
	it("gives the path of the code for the word of the language", () => {
		expect(local.codePath("en", "/calculator")).toBe("/calcolatore");
		expect(local.codePath("en", "/miles/avios")).toBe("/miglia/avios");
	});

	it("keeps a path with no word of the language", () => {
		expect(local.codePath("en", "/login")).toBe("/login");
		expect(local.codePath("en", "/punti/amex")).toBe("/punti/amex");
		expect(local.codePath("en", "/")).toBe("/");
		expect(local.codePath("it", "/calcolatore")).toBe("/calcolatore");
	});

	// `/en/calcolatore` is the Italian word under the prefix of English: no
	// page. A second address of one page divides the results of a search.
	it("gives null to a segment that the language writes with its own word", () => {
		expect(local.codePath("en", "/calcolatore")).toBeNull();
		expect(local.codePath("en", "/miglia/avios")).toBeNull();
	});

	it("reverses localPath", () => {
		for (const path of ["/", "/calcolatore", "/miglia/avios", "/punti/x"]) {
			for (const locale of ["it", "en"] as const) {
				expect(local.codePath(locale, local.localPath(locale, path))).toBe(
					path,
				);
			}
		}
	});
});

describe("localeRouting", () => {
	it("refuses a word that is not a segment of a path", () => {
		expect(() =>
			localeRouting(["it", "en"], "it", { en: { miglia: "Miles" } }),
		).toThrow();
		expect(() =>
			localeRouting(["it", "en"], "it", { en: { miglia: "mi/les" } }),
		).toThrow();
	});

	// Two segments with one word give two pages at one address.
	it("refuses the same word for two segments of a language", () => {
		expect(() =>
			localeRouting(["it", "en"], "it", {
				en: { miglia: "miles", punti: "miles" },
			}),
		).toThrow();
	});

	// The word of one segment must not be an other Italian segment: `/en/punti`
	// is then two pages.
	it("refuses a word that is an other segment of the code", () => {
		expect(() =>
			localeRouting(["it", "en"], "it", { en: { miglia: "punti" } }),
		).toThrow();
	});

	it("refuses a base language that the list does not hold", () => {
		expect(() => localeRouting(["it"], "en")).toThrow();
	});

	it("refuses a list with the same language two times", () => {
		expect(() => localeRouting(["it", "it"], "it")).toThrow();
	});
});

describe("the languages of the application", () => {
	it("hold Italian as the base language", () => {
		expect(BASE_LOCALE).toBe("it");
		expect(LOCALES).toContain(BASE_LOCALE);
	});

	it("give the tags of each language", () => {
		for (const locale of LOCALES) {
			const tags = LOCALE_TAGS[locale];
			expect(tags.html).toBe(locale);
			expect(tags.intl.startsWith(`${locale}-`)).toBe(true);
			expect(tags.openGraph).toBe(tags.intl.replace("-", "_"));
		}
	});

	it("give the base language to each path of the application now", () => {
		expect(routing.localeOfPath("/dashboard")).toEqual({
			locale: "it",
			path: "/dashboard",
		});
	});
});
