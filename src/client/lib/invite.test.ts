import { describe, expect, it } from "vitest";
import { inviteCodeOf } from "./invite.ts";

describe("inviteCodeOf", () => {
	it("gives the code of the link", () => {
		expect(inviteCodeOf({ code: "ABCD234567" })).toBe("ABCD234567");
	});

	it("gives undefined with no parameter", () => {
		expect(inviteCodeOf({})).toBeUndefined();
	});

	// A person can copy the link with a space at the end.
	it("removes the space at the two ends", () => {
		expect(inviteCodeOf({ code: " ABCD234567 " })).toBe("ABCD234567");
	});

	it("gives undefined with a parameter that holds only spaces", () => {
		expect(inviteCodeOf({ code: "   " })).toBeUndefined();
	});

	it("gives undefined with a parameter that is not text", () => {
		expect(inviteCodeOf({ code: 1234 })).toBeUndefined();
		expect(inviteCodeOf({ code: ["ABCD"] })).toBeUndefined();
	});
});
