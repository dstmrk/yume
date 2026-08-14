import { describe, expect, it } from "vitest";
import { inviteCodeOf, inviteLink } from "./invite.ts";

describe("inviteLink", () => {
	it("gives the link of the sign-up with the code", () => {
		expect(inviteLink("https://yume.example.com", "ABCD234567")).toBe(
			"https://yume.example.com/signup?code=ABCD234567",
		);
	});

	it("writes a character that a link cannot hold", () => {
		expect(inviteLink("https://yume.example.com", "A B")).toBe(
			"https://yume.example.com/signup?code=A%20B",
		);
	});
});

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
