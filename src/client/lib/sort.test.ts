import { describe, expect, it } from "vitest";
import { byValueDesc } from "./sort.ts";

type Row = { name: string; points: number | null };

function sorted(rows: Row[]): string[] {
	return [...rows]
		.sort(byValueDesc((row) => row.points))
		.map((row) => row.name);
}

describe("byValueDesc", () => {
	it("puts the largest value first", () => {
		expect(
			sorted([
				{ name: "iberia", points: 1800 },
				{ name: "ba", points: 12500 },
				{ name: "amex", points: 42000 },
			]),
		).toEqual(["amex", "ba", "iberia"]);
	});

	it("puts a value of null at the end", () => {
		expect(
			sorted([
				{ name: "no snapshot", points: null },
				{ name: "small", points: 1 },
			]),
		).toEqual(["small", "no snapshot"]);
	});

	it("keeps the first sequence of two equal values", () => {
		expect(
			sorted([
				{ name: "first", points: 400 },
				{ name: "second", points: 400 },
			]),
		).toEqual(["first", "second"]);
	});

	it("keeps the first sequence of two values of null", () => {
		expect(
			sorted([
				{ name: "first", points: null },
				{ name: "second", points: null },
			]),
		).toEqual(["first", "second"]);
	});

	it("puts a value of 0 before a value of null", () => {
		expect(
			sorted([
				{ name: "empty", points: null },
				{ name: "zero", points: 0 },
			]),
		).toEqual(["zero", "empty"]);
	});
});
