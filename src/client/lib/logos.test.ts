import { describe, expect, it } from "vitest";
import { programs } from "../../server/db/seed/catalogue.ts";
import { logoOf, PROGRAM_LOGOS } from "./logos.ts";

describe("PROGRAM_LOGOS", () => {
	it("holds one logo for each programme of the catalogue", () => {
		expect(Object.keys(PROGRAM_LOGOS).sort()).toEqual(
			programs.map((program) => program.id).sort(),
		);
	});

	it("keeps the order of the catalogue", () => {
		expect(Object.keys(PROGRAM_LOGOS)).toEqual(
			programs.map((program) => program.id),
		);
	});

	it("gives a path that starts with a move", () => {
		for (const logo of Object.values(PROGRAM_LOGOS)) {
			expect(logo.path).toMatch(/^M/);
		}
	});
});

describe("logoOf", () => {
	it("gives the logo of a programme", () => {
		expect(logoOf("amex-mr")?.title).toBe("American Express");
	});

	it("gives null for a programme that is not in the list", () => {
		expect(logoOf("unknown")).toBeNull();
	});

	// A key of `Object.prototype` is not a programme.
	it("gives null for a key of the prototype", () => {
		expect(logoOf("toString")).toBeNull();
		expect(logoOf("__proto__")).toBeNull();
	});
});
