import { describe, expect, it } from "vitest";
import {
	BASE_LOCALE,
	LOCALE_TAGS,
	LOCALES,
	localeRouting,
	routing,
} from "./locale.ts";

// The application holds one language. These tests use a second language, thus
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

describe("localeRouting", () => {
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
