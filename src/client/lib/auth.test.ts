import { describe, expect, it } from "vitest";
import { localeRouting } from "../../shared/locale.ts";
import { googleSignInBody, loginErrorOf } from "./auth.ts";

const two = localeRouting(["it", "en"], "it");

describe("googleSignInBody", () => {
	it("asks for the provider Google", () => {
		expect(googleSignInBody("https://yumemiles.com", "it").provider).toBe(
			"google",
		);
	});

	// The client of Vite is on the port 5173 and the server on the port 3000.
	// A path with no origin then gives the page of the server, not the page of
	// the client. Thus the two addresses hold the origin of the page.
	it("gives the absolute addresses of the dashboard and of the access", () => {
		const body = googleSignInBody("http://localhost:5173", "it");
		expect(body.callbackURL).toBe("http://localhost:5173/dashboard");
		expect(body.errorCallbackURL).toBe("http://localhost:5173/login");
	});

	// The person goes to Google and comes back. The page after the return must
	// be in the language of the page before.
	it("keeps the prefix of the language", () => {
		const body = googleSignInBody("https://yumemiles.com", "en", two);
		expect(body.callbackURL).toBe("https://yumemiles.com/en/dashboard");
		expect(body.errorCallbackURL).toBe("https://yumemiles.com/en/login");
	});
});

describe("loginErrorOf", () => {
	// Better Auth adds the parameter `error` to the address of the error, for
	// example when the person presses "Cancel" on the page of Google.
	it("reads the code of the error", () => {
		expect(loginErrorOf({ error: "access_denied" })).toBe("access_denied");
	});

	it("gives undefined with no error", () => {
		expect(loginErrorOf({})).toBeUndefined();
	});

	it("gives undefined for an empty value or a value that is not a text", () => {
		expect(loginErrorOf({ error: "" })).toBeUndefined();
		expect(loginErrorOf({ error: "   " })).toBeUndefined();
		expect(loginErrorOf({ error: 404 })).toBeUndefined();
		expect(loginErrorOf({ error: ["a"] })).toBeUndefined();
	});
});
