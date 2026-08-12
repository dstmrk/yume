import { describe, expect, it } from "vitest";
import { toFlapCells } from "./flaps.ts";

describe("toFlapCells", () => {
	it("gives one flap for a value of one digit", () => {
		expect(toFlapCells(0)).toEqual([{ position: 0, char: "0", kind: "digit" }]);
	});

	it("marks the separator of the thousands", () => {
		const cells = toFlapCells(51400);
		expect(cells).toHaveLength(6);
		expect(cells.map((cell) => cell.char).join("")).toBe("51.400");
		expect(cells[2]).toEqual({ position: 2, char: ".", kind: "separator" });
		expect(cells.filter((cell) => cell.kind === "digit")).toHaveLength(5);
	});

	it("gives a different position to each flap", () => {
		const cells = toFlapCells(1234567);
		expect(cells).toHaveLength(9);
		expect(cells.map((cell) => cell.position)).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7, 8,
		]);
	});

	it("marks the separator also in a value of four digits", () => {
		// The format always makes the groups. Refer to lib/format.ts.
		expect(toFlapCells(1000).map((cell) => cell.kind)).toEqual([
			"digit",
			"separator",
			"digit",
			"digit",
			"digit",
		]);
	});
});
