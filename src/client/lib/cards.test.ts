import { describe, expect, it } from "vitest";
import { cardsToShow, HOME_CARDS } from "./cards.ts";

const row = (currencyId: string, total: number) => ({ currencyId, total });

/** The user marked no currency. */
const none: ReadonlySet<string> = new Set();

describe("cardsToShow", () => {
	it("gives no card for an empty list", () => {
		expect(cardsToShow([], false, none)).toEqual({ cards: [], hidden: 0 });
	});

	it("removes a currency with a potential of 0", () => {
		const result = cardsToShow(
			[row("avios", 0), row("krisflyer", 500)],
			false,
			none,
		);
		expect(result.cards).toEqual([row("krisflyer", 500)]);
		expect(result.hidden).toBe(0);
	});

	it("puts the largest value first", () => {
		const result = cardsToShow(
			[row("avios", 100), row("krisflyer", 900), row("skymiles", 500)],
			false,
			none,
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
		const result = cardsToShow(rows, false, none);
		expect(result.cards).toHaveLength(HOME_CARDS);
		expect(result.cards.map((card) => card.total)).toEqual([50, 40, 30]);
		expect(result.hidden).toBe(2);
	});

	it("counts no card when the list is not longer than the first view", () => {
		const rows = [10, 20, 30].map((total, index) => row(`c${index}`, total));
		expect(cardsToShow(rows, false, none).hidden).toBe(0);
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
		expect(cardsToShow(rows, false, none).hidden).toBe(0);
	});

	it("gives all the cards when the user opens the list", () => {
		const rows = [10, 20, 30, 40].map((total, index) =>
			row(`c${index}`, total),
		);
		const result = cardsToShow(rows, true, none);
		expect(result.cards).toHaveLength(4);
		expect(result.hidden).toBe(0);
	});

	it("does not change the list of the caller", () => {
		const rows = [row("avios", 100), row("krisflyer", 900)];
		cardsToShow(rows, false, none);
		expect(rows.map((one) => one.currencyId)).toEqual(["avios", "krisflyer"]);
	});
});

describe("cardsToShow with the favourites", () => {
	it("puts a favourite before a currency with a larger value", () => {
		const result = cardsToShow(
			[row("avios", 100), row("krisflyer", 900)],
			true,
			new Set(["avios"]),
		);
		expect(result.cards.map((card) => card.currencyId)).toEqual([
			"avios",
			"krisflyer",
		]);
	});

	it("puts the largest value first in each of the two groups", () => {
		const result = cardsToShow(
			[
				row("avios", 100),
				row("krisflyer", 900),
				row("skymiles", 300),
				row("flying-blue", 200),
			],
			true,
			new Set(["avios", "skymiles"]),
		);
		expect(result.cards.map((card) => card.currencyId)).toEqual([
			"skymiles",
			"avios",
			"krisflyer",
			"flying-blue",
		]);
	});

	// The first view holds the first three cards of the new sequence. Thus a
	// favourite with a small value takes the place of a larger currency: that
	// result is the reason of the mark.
	it("gives the first three cards of the new sequence", () => {
		const rows = [
			row("a", 50),
			row("b", 40),
			row("c", 30),
			row("d", 20),
			row("e", 10),
		];
		const result = cardsToShow(rows, false, new Set(["e"]));
		expect(result.cards.map((card) => card.currencyId)).toEqual([
			"e",
			"a",
			"b",
		]);
		expect(result.hidden).toBe(2);
	});

	// A mark of a currency with no potential shows no card. Therefore the count
	// of the button stays the quantity of the cards that the user does not see.
	it("shows no card for a favourite with a potential of 0", () => {
		const result = cardsToShow(
			[row("avios", 0), row("krisflyer", 500)],
			false,
			new Set(["avios"]),
		);
		expect(result.cards).toEqual([row("krisflyer", 500)]);
		expect(result.hidden).toBe(0);
	});

	// The list of the marks arrives from the server. A currency of that list
	// that the calculation does not hold gives no card and no error.
	it("ignores a mark of a currency that the list does not hold", () => {
		const result = cardsToShow(
			[row("krisflyer", 500)],
			true,
			new Set(["does-not-exist"]),
		);
		expect(result.cards).toEqual([row("krisflyer", 500)]);
	});

	it("keeps the sequence of two favourites with the same value", () => {
		const result = cardsToShow(
			[row("avios", 100), row("krisflyer", 100)],
			true,
			new Set(["avios", "krisflyer"]),
		);
		expect(result.cards.map((card) => card.currencyId)).toEqual([
			"avios",
			"krisflyer",
		]);
	});
});
