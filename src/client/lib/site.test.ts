import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITE_URL } from "./site.ts";

/**
 * The head of `index.html` holds the domain three times, and this module holds
 * it one time. A static file imports no module, thus the two cannot share one
 * value. This test joins them: a change of one place with no change of the
 * other place makes the test fail.
 */
const head = readFileSync("src/client/index.html", "utf8");

describe("SITE_URL and the head of index.html", () => {
	it("gives the canonical address of the head", () => {
		expect(head).toContain(`<link rel="canonical" href="${SITE_URL}/" />`);
	});

	it("gives the address of Open Graph", () => {
		expect(head).toContain(`content="${SITE_URL}/"`);
	});

	it("gives the address of the image of Open Graph", () => {
		expect(head).toContain(`content="${SITE_URL}/icon-512.png"`);
	});

	it("holds no slash at the end: each caller writes its own path", () => {
		expect(SITE_URL.endsWith("/")).toBe(false);
	});
});
