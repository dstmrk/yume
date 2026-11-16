import { describe, expect, it } from "vitest";
import { countryOptions } from "./country.ts";

const IT = "it-IT";

describe("countryOptions", () => {
	it("gives each country with its name in the language of the page", () => {
		expect(countryOptions(["IT"], IT)).toEqual([
			{ country: "IT", name: "Italia" },
		]);
	});

	// The list follows the alphabet of the page, not the code of the country:
	// `DE` is Germania, after Francia.
	it("puts the names in the order of the alphabet of the page", () => {
		expect(
			countryOptions(["IT", "ES", "DE", "FR"], IT).map((row) => row.name),
		).toEqual(["Francia", "Germania", "Italia", "Spagna"]);
	});
});
