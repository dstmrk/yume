import { describe, expect, it } from "vitest";
import { flapSize, toFlapCells, toFlapTurn, toWordCells } from "./flaps.ts";

describe("toFlapCells", () => {
	it("gives one flap for a value of one digit", () => {
		expect(toFlapCells(0)).toEqual([{ position: 0, char: "0" }]);
	});

	it("gives one flap also to the separator of the thousands", () => {
		const cells = toFlapCells(51400);
		expect(cells).toHaveLength(6);
		expect(cells.map((cell) => cell.char).join("")).toBe("51.400");
		expect(cells[2]).toEqual({ position: 2, char: "." });
	});

	it("gives a different position to each flap", () => {
		const cells = toFlapCells(1234567);
		expect(cells).toHaveLength(9);
		expect(cells.map((cell) => cell.position)).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7, 8,
		]);
	});

	it("gives a separator also in a value of four digits", () => {
		// The format always makes the groups. Refer to lib/format.ts.
		expect(
			toFlapCells(1000)
				.map((cell) => cell.char)
				.join(""),
		).toBe("1.000");
	});
});

describe("flapSize", () => {
	it("gives the large size to a value of one digit", () => {
		expect(flapSize(0)).toBe("lg");
	});

	it("gives the large size to a value of six digits", () => {
		expect(flapSize(999999)).toBe("lg");
	});

	it("gives the medium size to the first value of seven digits", () => {
		expect(flapSize(1000000)).toBe("md");
	});

	it("gives the medium size to a value of seven digits", () => {
		expect(flapSize(1234567)).toBe("md");
	});

	it("gives the medium size to a value of more than seven digits", () => {
		// A value of eight digits is 278 pixels at the medium size, thus it also
		// enters the 294 pixels of the panel. Refer to paragraph 5.3 of
		// docs/architecture.md.
		expect(flapSize(12345678)).toBe("md");
	});
});

describe("toWordCells", () => {
	it("gives one flap for each letter", () => {
		const cells = toWordCells("Yume");
		expect(cells).toHaveLength(4);
		expect(cells.map((cell) => cell.char).join("")).toBe("YUME");
	});

	it("gives capital letters, because the board holds capital letters", () => {
		expect(
			toWordCells("yume")
				.map((cell) => cell.char)
				.join(""),
		).toBe("YUME");
	});

	it("keeps a word that already holds capital letters", () => {
		expect(
			toWordCells("YUME")
				.map((cell) => cell.char)
				.join(""),
		).toBe("YUME");
	});

	it("gives a different position to each flap", () => {
		expect(toWordCells("Yume").map((cell) => cell.position)).toEqual([
			0, 1, 2, 3,
		]);
	});

	it("gives no flap to a word with no letter", () => {
		expect(toWordCells("")).toEqual([]);
	});

	it("gives a flap also to a space", () => {
		// A board of Solari holds one flap for each position. The separator of
		// the thousands also holds a flap. Refer to toFlapCells.
		const cells = toWordCells("a b");
		expect(cells).toHaveLength(3);
		expect(cells[1]).toEqual({ position: 1, char: " " });
	});
});

describe("toFlapTurn", () => {
	it("gives no fold to a flap that does not move", () => {
		expect(toFlapTurn("7", false)).toEqual({
			top: "7",
			bottom: "7",
			folds: [],
		});
	});

	it("starts a flap that moves from the empty position", () => {
		const turn = toFlapTurn("2", true);
		expect(turn.bottom).toBe(" ");
		expect(turn.top).toBe("2");
	});

	it("turns a digit through the separator and each digit before it", () => {
		expect(toFlapTurn("2", true).folds).toEqual([
			{ step: 0, from: " ", to: "." },
			{ step: 1, from: ".", to: "0" },
			{ step: 2, from: "0", to: "1" },
			{ step: 3, from: "1", to: "2" },
		]);
	});

	it("gives two folds to the first digit of the drum", () => {
		expect(toFlapTurn("0", true).folds).toEqual([
			{ step: 0, from: " ", to: "." },
			{ step: 1, from: ".", to: "0" },
		]);
	});

	it("gives eleven folds to the last digit of the drum", () => {
		expect(toFlapTurn("9", true).folds).toHaveLength(11);
	});

	it("turns the separator of the thousands one time", () => {
		// The separator is the second position of the drum, thus that flap turns
		// from the empty position one time.
		expect(toFlapTurn(".", true)).toEqual({
			top: ".",
			bottom: " ",
			folds: [{ step: 0, from: " ", to: "." }],
		});
	});

	it("gives no fold to a letter, because the drum holds no letter", () => {
		expect(toFlapTurn("A", true)).toEqual({
			top: "A",
			bottom: "A",
			folds: [],
		});
	});

	it("gives no fold to the empty position", () => {
		expect(toFlapTurn(" ", true)).toEqual({
			top: " ",
			bottom: " ",
			folds: [],
		});
	});

	it("gives the character of the last fold to the top half", () => {
		const turn = toFlapTurn("5", true);
		expect(turn.folds.at(-1)?.to).toBe(turn.top);
	});

	it("makes a chain of the folds, with one step for each place", () => {
		const folds = toFlapTurn("8", true).folds;
		for (const [index, fold] of folds.entries()) {
			expect(fold.step).toBe(index);
			if (index > 0) {
				expect(fold.from).toBe(folds[index - 1]?.to);
			}
		}
	});
});
