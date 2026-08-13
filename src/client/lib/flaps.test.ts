import { describe, expect, it } from "vitest";
import { toFlapCells } from "./flaps.ts";

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
