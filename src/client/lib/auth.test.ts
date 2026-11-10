import { describe, expect, it } from "vitest";
import { localeRouting } from "../../shared/locale.ts";
import {
	googleSignInBody,
	loginErrorOf,
	signedOAuthQuery,
	withOAuthQuery,
} from "./auth.ts";

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

/**
 * The query that the authorisation server gives to `/login`. The server signs
 * each parameter except `sig`, and `ba_param` names each signed parameter.
 */
const SIGNED =
	"client_id=https%3A%2F%2Fclaude.ai%2Fclient&scope=balances&exp=1794340000&ba_param=ba_param&ba_param=client_id&ba_param=exp&ba_param=scope&sig=abc";

describe("signedOAuthQuery", () => {
	it("gives the signed query of the authorisation server", () => {
		expect(signedOAuthQuery(`?${SIGNED}`)).toBe(SIGNED);
	});

	it("accepts the query with no question mark", () => {
		expect(signedOAuthQuery(SIGNED)).toBe(SIGNED);
	});

	it("gives undefined with no query", () => {
		expect(signedOAuthQuery("")).toBeUndefined();
	});

	// After an error of Google, Better Auth opens `/login?error=...`. That page
	// starts a new sign-in, not an authorisation.
	it("gives undefined for the error of the sign-in", () => {
		expect(signedOAuthQuery("?error=access_denied")).toBeUndefined();
	});

	it("gives undefined with no signature", () => {
		expect(
			signedOAuthQuery("?client_id=x&ba_param=client_id&ba_param=ba_param"),
		).toBeUndefined();
	});

	it("gives undefined with no list of the signed parameters", () => {
		expect(signedOAuthQuery("?client_id=x&sig=abc")).toBeUndefined();
	});

	// The signature covers each parameter except `sig`. A parameter that a
	// person or a link adds then breaks it, thus the function removes it.
	it("removes a parameter that the server did not sign", () => {
		expect(signedOAuthQuery(`?utm_source=mail&${SIGNED}&error=x`)).toBe(SIGNED);
	});

	it("keeps each value of a signed parameter that repeats", () => {
		const query = "scope=a&scope=b&ba_param=ba_param&ba_param=scope&sig=abc";
		expect(signedOAuthQuery(query)).toBe(query);
	});
});

describe("withOAuthQuery", () => {
	const body = googleSignInBody("https://yumemiles.com", "it");

	it("adds the signed query to the body of the sign-in", () => {
		expect(withOAuthQuery(body, `?${SIGNED}`)).toEqual({
			...body,
			oauth_query: SIGNED,
		});
	});

	it("gives the same body with no signed query", () => {
		expect(withOAuthQuery(body, "?error=access_denied")).toEqual(body);
		expect(withOAuthQuery(body, "")).not.toHaveProperty("oauth_query");
	});
});
