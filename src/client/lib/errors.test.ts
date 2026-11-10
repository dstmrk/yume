import { describe, expect, it } from "vitest";
import { ApiError, errorCodeOf } from "./errors.ts";

describe("errorCodeOf", () => {
	it("gives the field error of the body", () => {
		expect(errorCodeOf({ error: "too_many_accounts" })).toBe(
			"too_many_accounts",
		);
	});

	// A proxy or Cloudflare can answer with HTML: `response.json()` then fails,
	// and the client gives null to this function.
	it("gives null for a body that is not an object", () => {
		expect(errorCodeOf(null)).toBeNull();
		expect(errorCodeOf("Payload Too Large")).toBeNull();
	});

	it("gives null for a field error that is not a text", () => {
		expect(errorCodeOf({ error: 413 })).toBeNull();
		expect(errorCodeOf({})).toBeNull();
	});
});

describe("ApiError", () => {
	it("keeps the status and the code", () => {
		const error = new ApiError("/api/accounts", 409, "too_many_accounts");

		expect(error).toBeInstanceOf(Error);
		expect(error.status).toBe(409);
		expect(error.code).toBe("too_many_accounts");
		expect(error.message).toBe("/api/accounts gives the status 409");
	});
});
