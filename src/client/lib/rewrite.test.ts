import { describe, expect, it } from "vitest";
import { localeRouting } from "../../shared/locale.ts";
import { NO_PAGE, pathRewrite } from "./rewrite.ts";

const local = localeRouting(["it", "en"], "it", {
	en: { calcolatore: "calculator", miglia: "miles" },
});

function input(locale: "it" | "en", path: string): string {
	const url = new URL(`https://yume.example${path}?x=1`);
	return pathRewrite(local, locale).input({ url }).pathname;
}

function output(locale: "it" | "en", path: string): string {
	const url = new URL(`https://yume.example${path}`);
	return pathRewrite(local, locale).output({ url }).pathname;
}

describe("pathRewrite", () => {
	// The router reads the path after the prefix: the basepath goes first.
	it("gives the router the path of the code", () => {
		expect(input("en", "/calculator")).toBe("/calcolatore");
		expect(input("en", "/miles/avios")).toBe("/miglia/avios");
		expect(input("en", "/login")).toBe("/login");
		expect(input("it", "/calcolatore")).toBe("/calcolatore");
	});

	// The Italian word under the prefix of a language with its own word.
	it("gives the router a path with no route for the Italian word", () => {
		expect(input("en", "/calcolatore")).toBe(NO_PAGE);
	});

	it("writes the word of the language in the address", () => {
		expect(output("en", "/calcolatore")).toBe("/calculator");
		expect(output("en", "/miglia/avios")).toBe("/miles/avios");
		expect(output("it", "/miglia/avios")).toBe("/miglia/avios");
	});

	it("keeps the query", () => {
		const url = new URL("https://yume.example/calculator?x=1");
		expect(pathRewrite(local, "en").input({ url }).search).toBe("?x=1");
	});
});
