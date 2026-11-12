import { DEFAULT_COUNTRY } from "../shared/catalogue.ts";
import { routing } from "../shared/locale.ts";
import { SectionTitle } from "./components/board/SectionTitle.tsx";
import { TextLink } from "./components/board/TextLink.tsx";
import { useI18n } from "./i18n/I18n.tsx";
import { todayIso } from "./lib/balance.ts";
import {
	currencyPages,
	SOURCE_SLUGS,
	sourcePages,
	unreachableCurrencies,
} from "./lib/catalogue.ts";
import { currencySourceNames, pageSourceLabel } from "./lib/content.ts";
import { formatList } from "./lib/format.ts";
import { PATHS, pageCrumbs } from "./lib/pages.ts";
import { SEED } from "./lib/seed.ts";
import { PublicPage } from "./PublicPage.tsx";

/**
 * The list of the currencies: `/miglia`. It links each page of a currency and
 * each page of a source, and it names the currencies that no source reaches.
 * Paragraph 5.5.5 of `docs/architecture.md` gives the rules.
 */
export function CurrenciesPage() {
	const { t: text, locale, intl } = useI18n();
	const at = todayIso(new Date());
	const pages = currencyPages(SEED, DEFAULT_COUNTRY, at);
	const sources = sourcePages(SEED, DEFAULT_COUNTRY, at, SOURCE_SLUGS);
	const unreachable = unreachableCurrencies(SEED, DEFAULT_COUNTRY, at);
	const hub = text.catalogue.hub;

	return (
		<PublicPage
			crumbs={pageCrumbs(
				text.catalogue,
				text.catalogue.currencies,
				PATHS.currencies,
			)}
			title={hub.title}
			lead={hub.lead(pages.length, unreachable.length)}
		>
			<section className="flex flex-col gap-3">
				<SectionTitle>{hub.reachableTitle}</SectionTitle>
				<ul className="flex flex-col gap-2 text-sm">
					{pages.map((page) => {
						const names = currencySourceNames(page);
						return (
							<li key={page.currency.id}>
								<TextLink
									href={routing.pathFor(
										locale,
										PATHS.currency(page.currency.id),
									)}
								>
									{page.currency.name}
								</TextLink>
								<span className="text-board-muted">
									{" — "}
									{hub.from(formatList(names, intl))}
								</span>
							</li>
						);
					})}
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<SectionTitle>{hub.sourcesTitle}</SectionTitle>
				<ul className="flex flex-col gap-2 text-sm">
					{sources.map((source) => (
						<li key={source.slug}>
							<TextLink
								href={routing.pathFor(locale, PATHS.source(source.slug))}
							>
								{text.catalogue.source.title(pageSourceLabel(source))}
							</TextLink>
						</li>
					))}
				</ul>
			</section>

			{unreachable.length > 0 && (
				<section className="flex flex-col gap-2">
					<SectionTitle>{hub.unreachableTitle}</SectionTitle>
					<p className="text-board-text text-sm leading-relaxed">
						{hub.unreachable}{" "}
						{formatList(
							unreachable.map((currency) => currency.name),
							intl,
						)}
						.
					</p>
				</section>
			)}
		</PublicPage>
	);
}
