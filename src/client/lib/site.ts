/**
 * The address of the official instance.
 *
 * The structured data of `jsonLd.ts` and the file of `llms.ts` both write
 * absolute addresses. The head of `index.html` holds the same domain in
 * `canonical`, in `og:url` and in `og:image`: a static file imports no module,
 * therefore that text stays there.
 *
 * `site.test.ts` reads `index.html` and it refuses a domain that is different.
 * Thus the four places move together at a change of the domain.
 */
export const SITE_URL = "https://yumemiles.com";
