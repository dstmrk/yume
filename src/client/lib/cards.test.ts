import { describe, expect, it } from "vitest";
import { cardsToShow, HOME_CARDS } from "./cards.ts";

const row = (currencyId: string, total: number) => ({ currencyId, total });

describe("cardsToShow", () => {
	it("gives no card for an empty list", () => {
		expect(cardsToShow([], false)).toEqual({ cards: [], hidden: 0 });
	});

	it("removes a currency with a potential of 0", () => {
		const result = cardsToShow([row("avios", 0), row("krisflyer", 500)], false);
		expect(result.cards).toEqual([row("krisflyer", 500)]);
		expect(result.hidden).toBe(0);
	});

	it("puts the largest value first", () => {
		const result = cardsToShow(
			[row("avios", 100), row("krisflyer", 900), row("skymiles", 500)],
			false,
		);
		expect(result.cards.map((card) => card.currencyId)).toEqual([
			"krisflyer",
			"skymiles",
			"avios",
		]);
	});

	it("holds three cards and counts the other ones", () => {
		const rows = [10, 20, 30, 40, 50].map((total, index) =>
			row(`c${index}`, total),
		);
		const result = cardsToShow(rows, false);
		expect(result.cards).toHaveLength(HOME_CARDS);
		expect(result.cards.map((card) => card.total)).toEqual([50, 40, 30]);
		expect(result.hidden).toBe(2);
	});

	it("counts no card when the list is not longer than the first view", () => {
		const rows = [10, 20, 30].map((total, index) => row(`c${index}`, total));
		expect(cardsToShow(rows, false).hidden).toBe(0);
	});

	// A currency with a potential of 0 stays out of the count. Without this
	// rule, the button gives a number of cards that the user never sees.
	it("does not count a currency with a potential of 0", () => {
		const rows = [
			row("a", 50),
			row("b", 40),
			row("c", 30),
			row("d", 0),
			row("e", 0),
		];
		expect(cardsToShow(rows, false).hidden).toBe(0);
	});

	it("gives all the cards when the user opens the list", () => {
		const rows = [10, 20, 30, 40].map((total, index) =>
			row(`c${index}`, total),
		);
		const result = cardsToShow(rows, true);
		expect(result.cards).toHaveLength(4);
		expect(result.hidden).toBe(0);
	});

	it("does not change the list of the caller", () => {
		const rows = [row("avios", 100), row("krisflyer", 900)];
		cardsToShow(rows, false);
		expect(rows.map((one) => one.currencyId)).toEqual(["avios", "krisflyer"]);
	});
});
