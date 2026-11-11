/**
 * The public pages of the catalogue: one page for each airline currency and one
 * page for each source of points.
 *
 * The pages give the transfer rules of the seed. A ratio needs a source, and
 * `src/server/db/seed/catalogue.ts` is the only source: thus no text of the
 * dictionary holds a ratio, and no person writes a ratio two times. Paragraph
 * 5.5.5 of `docs/architecture.md` gives the rules.
 *
 * The functions are pure. The caller gives the catalogue, the country and the
 * date. The build gives the date of the build, and the browser gives the date
 * of today.
 */

import type {
	CountryCode,
	Currency,
	IsoDate,
	Program,
	TransferRule,
} from "../../shared/catalogue.ts";
import { isValidAt } from "../../shared/conversion.ts";
import { formatHundredths, formatPoints } from "./format.ts";

/** The three lists of the seed. */
export type Catalogue = {
	readonly currencies: readonly Currency[];
	readonly programs: readonly Program[];
	readonly rules: readonly TransferRule[];
};

/** One rule of today, with its two programmes. */
export type Route = {
	readonly source: Program;
	readonly sourceCurrency: Currency;
	readonly target: Program;
	readonly rule: TransferRule;
};

export type CurrencyPage = {
	readonly currency: Currency;
	/** The programmes of the currency, in the sequence of the catalogue. */
	readonly programs: readonly Program[];
	/** The source programmes, one time each, in the sequence of the rules. */
	readonly sources: readonly Program[];
	readonly routes: readonly Route[];
	/** The latest `validFrom` of the routes: the latest examination. */
	readonly updated: IsoDate;
};

export type SourcePage = {
	/** The last part of the address: `/punti/<slug>`. */
	readonly slug: string;
	readonly source: Program;
	readonly currency: Currency;
	/** The routes, grouped by the currency of the target. */
	readonly groups: readonly {
		readonly currency: Currency;
		readonly routes: readonly Route[];
	}[];
	/** The airline currencies that this source does not reach. */
	readonly unreachable: readonly Currency[];
	readonly updated: IsoDate;
};

/**
 * The quantity of points of the example of each route.
 *
 * The value is above the minimum of each rule of the seed, and a test examines
 * it. The page writes that the result is a calculation.
 */
export const EXAMPLE_POINTS = 10_000;

/**
 * The address of the page of each source, by the `id` of the programme.
 *
 * The address holds the name of the issuer and the name of the currency, the
 * words that a person writes in a search engine. The `id` of the seed is short
 * and it is not that text. A source with no address stops the build: refer to
 * `sourcePages`.
 */
export const SOURCE_SLUGS: Readonly<Record<string, string>> = {
	"amex-mr": "amex-membership-rewards",
	revolut: "revolut-revpoints",
	klarna: "klarna-cashback",
};

/** Each rule of the country, valid at the date, with its two programmes. */
function routesOf(
	catalogue: Catalogue,
	country: CountryCode,
	at: IsoDate,
): Route[] {
	const programById = new Map(catalogue.programs.map((p) => [p.id, p]));
	const currencyById = new Map(catalogue.currencies.map((c) => [c.id, c]));
	const routes: Route[] = [];
	for (const rule of catalogue.rules) {
		if (rule.country !== country || !isValidAt(rule, at)) {
			continue;
		}
		const source = programById.get(rule.fromProgramId);
		const target = programById.get(rule.toProgramId);
		const sourceCurrency =
			source === undefined ? undefined : currencyById.get(source.currencyId);
		if (
			source === undefined ||
			target === undefined ||
			sourceCurrency === undefined
		) {
			continue;
		}
		routes.push({ source, sourceCurrency, target, rule });
	}
	return routes;
}

/** The latest date of a list of routes. The routes are not empty. */
function latestOf(routes: readonly Route[]): IsoDate {
	// An ISO date sorts as a text. `Math.max` reads no text.
	const dates = routes.map((route) => route.rule.validFrom).toSorted();
	return dates[dates.length - 1] as IsoDate;
}

/** The programme that a route reaches belongs to this currency. */
function inCurrency(currency: Currency) {
	return (route: Route) => route.target.currencyId === currency.id;
}

const airlineCurrencies = (catalogue: Catalogue) =>
	catalogue.currencies.filter((currency) => currency.kind === "airline");

/**
 * Gives one page for each airline currency that a source reaches today, in the
 * sequence of the catalogue.
 */
export function currencyPages(
	catalogue: Catalogue,
	country: CountryCode,
	at: IsoDate,
): CurrencyPage[] {
	const routes = routesOf(catalogue, country, at);
	const pages: CurrencyPage[] = [];
	for (const currency of airlineCurrencies(catalogue)) {
		const own = routes.filter(inCurrency(currency));
		if (own.length === 0) {
			continue;
		}
		const sources: Program[] = [];
		for (const route of own) {
			if (!sources.includes(route.source)) {
				sources.push(route.source);
			}
		}
		pages.push({
			currency,
			programs: catalogue.programs.filter((p) => p.currencyId === currency.id),
			sources,
			routes: own,
			updated: latestOf(own),
		});
	}
	return pages;
}

/** Gives each airline currency that no source reaches today. */
export function unreachableCurrencies(
	catalogue: Catalogue,
	country: CountryCode,
	at: IsoDate,
): Currency[] {
	const routes = routesOf(catalogue, country, at);
	return airlineCurrencies(catalogue).filter(
		(currency) => !routes.some(inCurrency(currency)),
	);
}

/**
 * Gives one page for each source programme with a route today, in the sequence
 * of the rules.
 *
 * A source with no address in `slugs` stops the build. A page with no address
 * is a defect that no browser shows.
 */
export function sourcePages(
	catalogue: Catalogue,
	country: CountryCode,
	at: IsoDate,
	slugs: Readonly<Record<string, string>>,
): SourcePage[] {
	const routes = routesOf(catalogue, country, at);
	const sources: Program[] = [];
	for (const route of routes) {
		if (!sources.includes(route.source)) {
			sources.push(route.source);
		}
	}
	return sources.map((source) => {
		const slug = slugs[source.id];
		if (slug === undefined) {
			throw new Error(`The source ${source.id} has no address.`);
		}
		const own = routes.filter((route) => route.source === source);
		const groups = airlineCurrencies(catalogue)
			.map((currency) => ({
				currency,
				routes: own.filter(inCurrency(currency)),
			}))
			.filter((group) => group.routes.length > 0);
		const firstRoute = own[0] as Route;
		return {
			slug,
			source,
			currency: firstRoute.sourceCurrency,
			groups,
			unreachable: airlineCurrencies(catalogue).filter(
				(currency) => !own.some(inCurrency(currency)),
			),
			updated: latestOf(own),
		};
	});
}

/**
 * The ratio of a rule in the form that a person reads: `from` source points
 * give `to` points of the target.
 *
 * The function reduces the two integers. A large reduced ratio, as 5 000 :
 * 4 001, says nothing to a reader: then the ratio is for 100 points, in
 * hundredths, as Klarna writes it. `toHundredths` is null when the hundredths
 * are not exact, and the ratio then keeps the reduced integers. The function
 * uses integers only: refer to the rule 1 of the data in `CLAUDE.md`.
 */
export function ratioOf(rule: TransferRule): {
	from: number;
	to: number | null;
	toHundredths: number | null;
} {
	const divisor = gcd(rule.ratioNum, rule.ratioDen);
	const num = rule.ratioNum / divisor;
	const den = rule.ratioDen / divisor;
	if (den <= LARGEST_READABLE && num <= LARGEST_READABLE) {
		return { from: den, to: num, toHundredths: null };
	}
	const scaled = num * 100 * 100;
	if (scaled % den === 0) {
		return { from: 100, to: null, toHundredths: scaled / den };
	}
	return { from: den, to: num, toHundredths: null };
}

/** The largest term of a ratio that a person reads with no effort. */
const LARGEST_READABLE = 100;

function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b);
}

/**
 * The name of a source for a person: the issuer and the currency, for example
 * `Amex Membership Rewards`. A currency that already holds the name of the
 * issuer stays alone: `Klarna Cashback`, not `Klarna Klarna Cashback`.
 */
export function sourceLabel(source: Program, currency: Currency): string {
	return currency.name.startsWith(source.name)
		? currency.name
		: `${source.name} ${currency.name}`;
}

/** Writes the ratio of `ratioOf` with the locale of the page. */
export function formatRatio(
	rule: TransferRule,
	intl: string,
): { from: string; to: string } {
	const ratio = ratioOf(rule);
	return {
		from: formatPoints(ratio.from, intl),
		to:
			ratio.toHundredths === null
				? formatPoints(ratio.to ?? 0, intl)
				: formatHundredths(ratio.toHundredths, intl),
	};
}
