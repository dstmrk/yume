import { DEFAULT_COUNTRY } from "../shared/catalogue.ts";
import { routing } from "../shared/locale.ts";
import { SectionTitle } from "./components/board/SectionTitle.tsx";
import { TextLink } from "./components/board/TextLink.tsx";
import { FaqList } from "./components/FaqList.tsx";
import { RouteList } from "./components/RouteList.tsx";
import { useI18n } from "./i18n/I18n.tsx";
import { todayIso } from "./lib/balance.ts";
import { SOURCE_SLUGS, sourcePages } from "./lib/catalogue.ts";
import { pageSourceLabel, sourceText } from "./lib/content.ts";
import { formatList } from "./lib/format.ts";
import { PATHS, pageCrumbs } from "./lib/pages.ts";
import { SEED } from "./lib/seed.ts";
import { NotFoundPage } from "./NotFoundPage.tsx";
import { PublicPage } from "./PublicPage.tsx";

/**
 * The page of one source of points: `/punti/<fonte>`.
 *
 * It answers "where can I transfer these points": each airline programme that
 * the source reaches, grouped by currency, then the currencies that it does not
 * reach. Paragraph 5.5.5 of `docs/architecture.md` gives the rules.
 */
export function SourcePage({ slug }: { slug: string }) {
	const i18n = useI18n();
	const { t: text, locale, intl } = i18n;
	const page = sourcePages(
		SEED,
		DEFAULT_COUNTRY,
		todayIso(new Date()),
		SOURCE_SLUGS,
	).find((item) => item.slug === slug);
	if (page === undefined) {
		return <NotFoundPage />;
	}
	const content = sourceText(page, i18n);
	const label = pageSourceLabel(page);

	return (
		<PublicPage
			crumbs={pageCrumbs(text.catalogue, label, PATHS.source(page.slug))}
			title={content.title}
			lead={content.lead}
			updated={page.updated}
			updatedLabel={text.catalogue.verified}
		>
			<section className="flex flex-col gap-6">
				<SectionTitle>{text.catalogue.routesTitle}</SectionTitle>
				<p className="text-board-muted text-xs">{text.catalogue.exampleNote}</p>
				{page.groups.map((group) => (
					<div key={group.currency.id} className="flex flex-col gap-3">
						<h3 className="font-semibold text-board-text text-sm">
							<TextLink
								href={routing.pathFor(
									locale,
									PATHS.currency(group.currency.id),
								)}
							>
								{group.currency.name}
							</TextLink>
						</h3>
						<RouteList
							routes={group.routes}
							currencyName={group.currency.name}
							label={(route) => route.target.name}
						/>
					</div>
				))}
				<p className="text-sm">
					<TextLink href={routing.pathFor(locale, PATHS.calculator)}>
						{text.catalogue.calculatorLink}
					</TextLink>
				</p>
			</section>

			{page.unreachable.length > 0 && (
				<section className="flex flex-col gap-2">
					<SectionTitle>{text.catalogue.source.unreachableTitle}</SectionTitle>
					<p className="text-board-text text-sm leading-relaxed">
						{text.catalogue.source.unreachable(label)}{" "}
						{formatList(
							page.unreachable.map((currency) => currency.name),
							intl,
						)}
						.
					</p>
				</section>
			)}

			<FaqList title={text.catalogue.faqTitle} items={content.faq} />
		</PublicPage>
	);
}
