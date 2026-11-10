import { describe, expect, it } from "vitest";
import { isAdmin } from "./admin.ts";

const ME = { email: "me@example.com", emailVerified: true };

describe("isAdmin", () => {
	it("accepts the user with the email of ADMIN_EMAIL", () => {
		expect(isAdmin(ME, "me@example.com")).toBe(true);
	});

	it("refuses an other user", () => {
		expect(isAdmin({ ...ME, email: "you@example.com" }, "me@example.com")).toBe(
			false,
		);
	});

	// A self-hosted installation has no administrator.
	it("refuses each user with no value of the variable", () => {
		expect(isAdmin(ME, undefined)).toBe(false);
		expect(isAdmin(ME, "")).toBe(false);
		expect(isAdmin(ME, "   ")).toBe(false);
	});

	// An empty email of a user must not match an empty variable.
	it("refuses a user with an empty email", () => {
		expect(isAdmin({ ...ME, email: "" }, "")).toBe(false);
	});

	it("ignores the case and the spaces at the ends", () => {
		expect(
			isAdmin({ ...ME, email: "Me@Example.com" }, " ME@example.COM "),
		).toBe(true);
	});

	// Google proves the address. A future provider can give an address that no
	// one proved.
	it("refuses an address that is not verified", () => {
		expect(isAdmin({ ...ME, emailVerified: false }, "me@example.com")).toBe(
			false,
		);
	});

	// The variable holds one address, not a list.
	it("refuses a list of addresses", () => {
		expect(isAdmin(ME, "me@example.com,you@example.com")).toBe(false);
	});
});
