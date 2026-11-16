/**
 * The rewrite of the address for the router.
 *
 * The routes hold the paths of the code, in Italian. A language with its own
 * word for a segment writes that word in the address: `/es/calculadora`. The
 * router of TanStack applies this pair after the basepath on the input, and
 * before it on the output. Paragraph 5.8 of `docs/architecture.md` gives the
 * rules.
 */

/**
 * The path of no route. The Italian word under the prefix of a language with
 * its own word is no page: the router then shows the page of the status 404,
 * as the server does.
 */
export const NO_PAGE = "/~";

/** The part of `localeRouting` that the rewrite reads. */
type PathWords<L extends string> = {
	localPath(locale: L, path: string): string;
	codePath(locale: L, path: string): string | null;
};

/** Gives the pair `input` and `output` of the option `rewrite`. */
export function pathRewrite<L extends string>(
	routing: PathWords<L>,
	locale: L,
) {
	return {
		input: ({ url }: { url: URL }) => {
			url.pathname = routing.codePath(locale, url.pathname) ?? NO_PAGE;
			return url;
		},
		output: ({ url }: { url: URL }) => {
			url.pathname = routing.localPath(locale, url.pathname);
			return url;
		},
	};
}
