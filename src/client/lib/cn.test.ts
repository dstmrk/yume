import { describe, expect, it } from "vitest";
import { cn } from "./cn.ts";

describe("cn", () => {
	it("joins the classes with one space", () => {
		expect(cn("rounded-lg", "border")).toBe("rounded-lg border");
	});

	it("removes a class that a condition does not select", () => {
		expect(cn("border", false && "hidden", undefined, null)).toBe("border");
	});

	// This is the reason for tailwind-merge. A component gives a default class
	// and the point of use gives another class for the same property. The last
	// class must win. `clsx` alone keeps the two classes, and the result depends
	// on the order in the CSS file.
	it("keeps only the last class of one property", () => {
		expect(cn("px-4", "px-2")).toBe("px-2");
		expect(cn("text-board-muted", "text-board-amber")).toBe("text-board-amber");
	});

	it("does not remove a class of another property", () => {
		expect(cn("px-4", "py-2")).toBe("px-4 py-2");
	});

	it("reads an array and an object", () => {
		expect(cn(["border", "px-4"], { hidden: false, block: true })).toBe(
			"border px-4 block",
		);
	});

	it("gives an empty text with no class", () => {
		expect(cn()).toBe("");
	});
});
