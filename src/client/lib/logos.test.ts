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
			if ("path" in logo) {
				expect(logo.path).toMatch(/^M/);
			}
		}
	});

	// Two flaps of 11 pixels fill the box of 20 pixels. A third flap goes
	// outside it.
	it("gives a code of one or two letters", () => {
		for (const logo of Object.values(PROGRAM_LOGOS)) {
			if ("code" in logo) {
				expect(logo.code).toMatch(/^[A-Z0-9]{1,2}$/);
			}
		}
	});
});

describe("logoOf", () => {
	it("gives the logo of a programme", () => {
		expect(logoOf("amex-mr")?.title).toBe("American Express");
	});

	it("gives the code of a programme with no free logo", () => {
		expect(logoOf("flying-blue")).toEqual({
			title: "Flying Blue",
			code: "FB",
		});
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
