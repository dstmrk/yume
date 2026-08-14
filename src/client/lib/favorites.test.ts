import { describe, expect, it } from "vitest";
import { toggleFavorite } from "./favorites.ts";

describe("toggleFavorite", () => {
	it("adds the currency to an empty list", () => {
		expect(toggleFavorite([], "avios", true)).toEqual(["avios"]);
	});

	it("keeps the other currencies", () => {
		expect(toggleFavorite(["krisflyer"], "avios", true)).toEqual([
			"krisflyer",
			"avios",
		]);
	});

	// Two taps of the heart give one mark only. Without this rule, the card
	// stays a favourite after one tap of the removal.
	it("holds one item for a currency that the list already holds", () => {
		expect(toggleFavorite(["avios"], "avios", true)).toEqual(["avios"]);
	});

	it("removes the currency", () => {
		expect(toggleFavorite(["avios", "krisflyer"], "avios", false)).toEqual([
			"krisflyer",
		]);
	});

	it("removes a currency that the list does not hold", () => {
		expect(toggleFavorite(["krisflyer"], "avios", false)).toEqual([
			"krisflyer",
		]);
	});

	it("does not change the list of the caller", () => {
		const currencyIds = ["krisflyer"];
		toggleFavorite(currencyIds, "avios", true);
		expect(currencyIds).toEqual(["krisflyer"]);
	});
});
