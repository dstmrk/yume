import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { localeRouting } from "./locale.ts";
import { CLIENT_PATHS, isClientPath, pageOfPath } from "./routes.ts";

describe("isClientPath", () => {
	it("holds each page of the client", () => {
		expect(isClientPath("/")).toBe(true);
		expect(isClientPath("/dashboard")).toBe(true);
		expect(isClientPath("/login")).toBe(true);
		expect(isClientPath("/privacy")).toBe(true);
		expect(isClientPath("/tos")).toBe(true);
		expect(isClientPath("/connector")).toBe(true);
	});

	it("holds a path with a slash at the end", () => {
		expect(isClientPath("/dashboard/")).toBe(true);
		expect(isClientPath("/login/")).toBe(true);
	});

	it("refuses a path that the client does not hold", () => {
		// The link of an invitation. Google is the only provider now.
		expect(isClientPath("/signup")).toBe(false);
		expect(isClientPath("/questa-pagina-non-esiste")).toBe(false);
		expect(isClientPath("/wp-admin")).toBe(false);
	});

	it("refuses a path below a page of the client", () => {
		expect(isClientPath("/dashboard/extra")).toBe(false);
		expect(isClientPath("/login/x")).toBe(false);
	});

	// A path of HTTP holds its case. A server that answers `/Dashboard` and
	// `/dashboard` gives two addresses to one page.
	it("refuses a path with an other case", () => {
		expect(isClientPath("/Dashboard")).toBe(false);
		expect(isClientPath("/LOGIN")).toBe(false);
	});

	it("refuses an empty path", () => {
		expect(isClientPath("")).toBe(false);
	});

	// Two slashes at the end are not the address of a page. The function removes
	// one slash only, thus the path stays different.
	it("refuses two slashes at the end", () => {
		expect(isClientPath("/dashboard//")).toBe(false);
	});
});

/**
 * The router of the client is the other half of this list. A route that arrives
 * there and not here gives the status 404 in the container, and the development
 * server of Vite hides that defect: Vite holds its own fallback and it never
 * calls Hono. Therefore this test reads the file of the router.
 */
describe("the paths of the router", () => {
	it("gives the same paths as CLIENT_PATHS", () => {
		const source = readFileSync("src/client/router.tsx", "utf8");
		const paths = [...source.matchAll(/\bpath: "([^"]+)"/g)].map(
			(match) => match[1],
		);

		expect(paths.toSorted()).toStrictEqual([...CLIENT_PATHS].toSorted());
	});
});

/**
 * The page of a path in each language. Paragraph 5.8 of
 * `docs/architecture.md` gives the rules. The test gives a second language,
 * thus the prefix has a test before the language exists.
 */
describe("pageOfPath", () => {
	const two = localeRouting(["it", "en"], "it");

	it("gives the base language to a page with no prefix", () => {
		expect(pageOfPath("/", two)).toEqual({ locale: "it", found: true });
		expect(pageOfPath("/login", two)).toEqual({ locale: "it", found: true });
	});

	it("gives the language of the prefix to a page", () => {
		expect(pageOfPath("/en", two)).toEqual({ locale: "en", found: true });
		expect(pageOfPath("/en/", two)).toEqual({ locale: "en", found: true });
		expect(pageOfPath("/en/dashboard", two)).toEqual({
			locale: "en",
			found: true,
		});
		expect(pageOfPath("/en/dashboard/", two)).toEqual({
			locale: "en",
			found: true,
		});
	});

	// The page of the status 404 is in the language of the prefix. A person who
	// reads English then reads the message in English.
	it("gives the language of the prefix to a path with no page", () => {
		expect(pageOfPath("/en/nulla", two)).toEqual({
			locale: "en",
			found: false,
		});
		expect(pageOfPath("/nulla", two)).toEqual({ locale: "it", found: false });
	});

	// The base language has no prefix. A second address of one page divides the
	// results of a search engine.
	it("gives no page to the prefix of the base language", () => {
		expect(pageOfPath("/it", two)).toEqual({ locale: "it", found: false });
		expect(pageOfPath("/it/login", two)).toEqual({
			locale: "it",
			found: false,
		});
	});

	it("gives no page to a prefix in two places", () => {
		expect(pageOfPath("/en/en/login", two).found).toBe(false);
	});

	it("uses the languages of the application with no second argument", () => {
		expect(pageOfPath("/login")).toEqual({ locale: "it", found: true });
	});
});

/**
 * `robots.txt` blocks each page that needs a session, with no prefix and with
 * the prefix of a language. A new route that the file does not block gives a
 * crawler a page with no data.
 */
describe("robots.txt", () => {
	const lines = readFileSync("src/client/public/robots.txt", "utf8")
		.split("\n")
		.filter((line) => line.startsWith("Disallow: "))
		.map((line) => line.slice("Disallow: ".length));

	/** The pages that need a session. A crawler receives no data there. */
	const PRIVATE = ["/admin", "/consent", "/dashboard", "/login"] as const;

	for (const path of PRIVATE) {
		it(`blocks ${path} in each language`, () => {
			expect(lines).toContain(path);
			expect(lines).toContain(`/*${path}`);
		});
	}

	// Each path of the client is private or public. A new path must take one
	// of the two places, thus this test fails until a person decides.
	it("knows each path of the client", () => {
		const known = new Set<string>([...PRIVATE, ...PUBLIC]);
		expect(CLIENT_PATHS.filter((path) => !known.has(path))).toEqual([]);
	});

	/** The pages with content for each person, also with no session. */
	const PUBLIC = ["/", "/connector", "/privacy", "/tos"] as const;

	for (const path of PUBLIC) {
		it(`does not block ${path}`, () => {
			expect(lines).not.toContain(path);
			expect(lines).not.toContain(`/*${path}`);
		});
	}
});
