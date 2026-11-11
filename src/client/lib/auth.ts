/**
 * The sign-in with Google, the only provider for a person, and the sign-in
 * with a password of the account of the reviewers of Anthropic. Paragraphs 4.1
 * and 4.1.1 of `docs/architecture.md` give the decisions.
 *
 * The functions are pure. The page of the access calls them, and `api.ts`
 * sends the request.
 */

import { type Locale, routing } from "../../shared/locale.ts";

/** The body of `POST /api/auth/sign-in/social`. */
export type GoogleSignInBody = {
	provider: "google";
	/** The page after a sign-in that is correct. */
	callbackURL: string;
	/** The page after an error. Better Auth adds the parameter `error`. */
	errorCallbackURL: string;
	/**
	 * The signed query of an authorisation of the MCP server. With it, the
	 * server goes on with that authorisation after the sign-in, not to the
	 * dashboard. Paragraph 4.7.2 of `docs/architecture.md` gives the flow.
	 */
	oauth_query?: string;
};

/**
 * Gives the body of the start of the sign-in with Google.
 *
 * The two addresses hold the origin of the page. In development the client of
 * Vite is on the port 5173 and the server on the port 3000: a path with no
 * origin gives the page of the server. The server accepts the origin of Vite
 * from `TRUSTED_ORIGINS`.
 *
 * The two addresses keep the prefix of the language. Thus the person reads the
 * same language after the page of Google. Paragraph 5.8 of
 * `docs/architecture.md` gives the rule.
 */
export function googleSignInBody(
	origin: string,
	locale: Locale,
): GoogleSignInBody;
export function googleSignInBody<L extends string>(
	origin: string,
	locale: L,
	languages: PathFor<L>,
): GoogleSignInBody;
export function googleSignInBody(
	origin: string,
	locale: string,
	languages: PathFor<string> = routing,
): GoogleSignInBody {
	return {
		provider: "google",
		callbackURL: `${origin}${languages.pathFor(locale, "/dashboard")}`,
		errorCallbackURL: `${origin}${languages.pathFor(locale, "/login")}`,
	};
}

/**
 * The body of `POST /api/auth/sign-in/email`. Only the account of the
 * reviewers has a password: paragraph 4.1.1 of `docs/architecture.md`.
 */
export type PasswordSignInBody = {
	email: string;
	password: string;
	/** The page after a sign-in with no authorisation of the MCP server. */
	callbackURL: string;
	/** Refer to `GoogleSignInBody`. */
	oauth_query?: string;
};

/**
 * Gives the body of the sign-in with a password.
 *
 * The function removes the spaces at the two ends of the address, because a
 * person copies it from the instructions. It keeps the password as it is: a
 * space can be a character of a password.
 */
export function passwordSignInBody(
	origin: string,
	locale: Locale,
	email: string,
	password: string,
): PasswordSignInBody;
export function passwordSignInBody<L extends string>(
	origin: string,
	locale: L,
	email: string,
	password: string,
	languages: PathFor<L>,
): PasswordSignInBody;
export function passwordSignInBody(
	origin: string,
	locale: string,
	email: string,
	password: string,
	languages: PathFor<string> = routing,
): PasswordSignInBody {
	return {
		email: email.trim(),
		password,
		callbackURL: `${origin}${languages.pathFor(locale, "/dashboard")}`,
	};
}

/**
 * Reads the next page from the answer of a sign-in with a password.
 *
 * With a signed query, the authorisation server goes on with the
 * authorisation, and the field `url` gives `/consent`. With no signed query,
 * the field gives `callbackURL`. It gives undefined with no address: the page
 * then opens the dashboard.
 */
export function signInTarget(answer: unknown): string | undefined {
	if (typeof answer !== "object" || answer === null) {
		return undefined;
	}
	const { url } = answer as { url?: unknown };
	return typeof url === "string" && url !== "" ? url : undefined;
}

/** The part of `localeRouting` that this file reads. */
type PathFor<L extends string> = {
	pathFor(locale: L, path: string): string;
};

/**
 * Reads the code of the error of the address of the page of the access.
 *
 * It gives undefined with no error. The page then shows no message. The code
 * stays in the address only: the page shows one message for each error, in
 * the language of the page.
 */
export function loginErrorOf(
	search: Record<string, unknown>,
): string | undefined {
	const value = search.error;
	return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/**
 * Gives the signed query of an authorisation from the address of `/login`.
 *
 * The authorisation server of the MCP server sends a person with no session to
 * `/login`, with a signed query. The signature covers each parameter except
 * `sig`, and the values of `ba_param` name the signed parameters. A parameter
 * that the server did not sign breaks the signature, thus the function keeps
 * only `sig`, `ba_param` and the signed parameters. The plugin of the client of
 * Better Auth does the same operation, and Yume does not use that client.
 *
 * It gives undefined with no signature: the page then starts a sign-in only.
 */
export function signedOAuthQuery(search: string): string | undefined {
	const params = new URLSearchParams(search);
	if (!params.has("sig")) {
		return undefined;
	}
	const signed = new Set(params.getAll("ba_param"));
	if (signed.size === 0) {
		return undefined;
	}
	const kept = new URLSearchParams();
	for (const [key, value] of params) {
		if (key === "sig" || key === "ba_param" || signed.has(key)) {
			kept.append(key, value);
		}
	}
	return kept.toString();
}

/**
 * Adds the signed query of the address to the body of the sign-in, if the
 * address holds one. Refer to `signedOAuthQuery`.
 */
export function withOAuthQuery<B extends { oauth_query?: string }>(
	body: B,
	search: string,
): B {
	const query = signedOAuthQuery(search);
	return query === undefined ? body : { ...body, oauth_query: query };
}
