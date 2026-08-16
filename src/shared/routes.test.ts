import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLIENT_PATHS, isClientPath } from "./routes.ts";

describe("isClientPath", () => {
	it("holds each page of the client", () => {
		expect(isClientPath("/")).toBe(true);
		expect(isClientPath("/dashboard")).toBe(true);
		expect(isClientPath("/login")).toBe(true);
		expect(isClientPath("/signup")).toBe(true);
	});

	it("holds a path with a slash at the end", () => {
		expect(isClientPath("/dashboard/")).toBe(true);
		expect(isClientPath("/login/")).toBe(true);
	});

	it("refuses a path that the client does not hold", () => {
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
