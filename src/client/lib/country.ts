import { formatCountry } from "./format.ts";

/** A country of the choice after the first sign-in, with its name. */
export type CountryOption<C extends string> = { country: C; name: string };

/**
 * The countries of the choice after the first sign-in, in the order of the
 * names in the language of the page. Paragraph 3.3.2 of `docs/architecture.md`
 * gives the rule.
 */
export function countryOptions<C extends string>(
	countries: readonly C[],
	intl: string,
): CountryOption<C>[] {
	const collator = new Intl.Collator(intl);
	return countries
		.map((country) => ({ country, name: formatCountry(country, intl) }))
		.sort((a, b) => collator.compare(a.name, b.name));
}
