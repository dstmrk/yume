/**
 * The paths of the pages of the client.
 *
 * The client and the server both need this list. `src/client/router.tsx` gives
 * one route to each path. The server gives `index.html` to each path of this
 * list with the status 200, and it gives the status 404 to each other path.
 *
 * Without that difference each path gives the status 200 with the page of the
 * application. A search engine then reads an unlimited quantity of addresses as
 * pages of the site, and each one holds no content. Paragraph 5.5.3 of
 * `docs/architecture.md` gives the rule.
 *
 * Add a path here at the moment that you add a route to the client. The test of
 * this file reads `router.tsx` and it refuses a difference: the development
 * server of Vite holds its own fallback, thus only the container shows that
 * defect.
 */
import { type Locale, routing } from "./locale.ts";

export const CLIENT_PATHS = [
	"/",
	"/dashboard",
	"/login",
	"/privacy",
	"/tos",
] as const;

/**
 * Does the client hold a page at this path?
 *
 * The function removes one slash at the end, because `/login/` and `/login` are
 * one page for the router. It keeps the case: two addresses that hold a
 * different case are two addresses for a search engine.
 */
export function isClientPath(path: string): boolean {
	const trimmed =
		path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

	return CLIENT_PATHS.some((clientPath) => clientPath === trimmed);
}

/**
 * The page of a path: its language and if the client holds a page there.
 *
 * The server reads the language to give the page of that language, also with
 * the status 404. The prefix of the base language gives no page: refer to
 * `localeRouting` of `locale.ts`. Paragraph 5.8 of `docs/architecture.md`
 * gives the rules.
 */
export function pageOfPath(path: string): { locale: Locale; found: boolean };
export function pageOfPath<L extends string>(
	path: string,
	languages: LocaleOfPath<L>,
): { locale: L; found: boolean };
export function pageOfPath(
	path: string,
	languages: LocaleOfPath<string> = routing,
): { locale: string; found: boolean } {
	const { locale, path: rest } = languages.localeOfPath(path);
	return { locale, found: isClientPath(rest) };
}

/** The part of `localeRouting` that this file reads. */
type LocaleOfPath<L extends string> = {
	localeOfPath(path: string): { locale: L; path: string };
};
