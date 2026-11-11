import { DEFAULT_COUNTRY } from "../shared/catalogue.ts";
import { routing } from "../shared/locale.ts";
import { SectionTitle } from "./components/board/SectionTitle.tsx";
import { TextLink } from "./components/board/TextLink.tsx";
import { FaqList } from "./components/FaqList.tsx";
import { RouteList } from "./components/RouteList.tsx";
import { useI18n } from "./i18n/I18n.tsx";
import { airlinesOf } from "./lib/airlines.ts";
import { todayIso } from "./lib/balance.ts";
import { currencyPages, SOURCE_SLUGS, sourcePages } from "./lib/catalogue.ts";
import { currencyText, routeSourceLabel } from "./lib/content.ts";
import { currencyCrumbs, PATHS } from "./lib/pages.ts";
import { SEED } from "./lib/seed.ts";
import { NotFoundPage } from "./NotFoundPage.tsx";
import { PublicPage } from "./PublicPage.tsx";

/**
 * The page of one airline currency: `/miglia/<valuta>`.
 *
 * It answers "how do I convert my points into this currency": the sources that
 * reach it, then each route with its ratio, its minimum and its step, from the
 * seed. Paragraph 5.5.5 of `docs/architecture.md` gives the rules.
 *
 * The page shows the balance of no person, thus it gives no warning of the
 * transfer: the calculator and the dashboard give it. The examples are a
 * calculation, and the page says it.
 */
export function CurrencyPage({ currencyId }: { currencyId: string }) {
	const i18n = useI18n();
	const { t: text, locale } = i18n;
	const at = todayIso(new Date());
	const page = currencyPages(SEED, DEFAULT_COUNTRY, at).find(
		(item) => item.currency.id === currencyId,
	);
	if (page === undefined) {
		return <NotFoundPage />;
	}
	const sources = sourcePages(SEED, DEFAULT_COUNTRY, at, SOURCE_SLUGS);
	const content = currencyText(page, sources, i18n);
	const name = page.currency.name;

	return (
		<PublicPage
			crumbs={currencyCrumbs(text.catalogue, page.currency)}
			title={content.title}
			lead={content.lead}
			updated={page.updated}
			updatedLabel={text.catalogue.verified}
		>
			<section className="flex flex-col gap-3">
				<SectionTitle>{text.catalogue.currency.programsTitle}</SectionTitle>
				<p className="text-board-text text-sm leading-relaxed">
					{page.programs.length > 1
						? text.catalogue.currency.programsShared(name, page.programs.length)
						: text.catalogue.currency.programsOne(
								name,
								page.programs[0]?.name ?? name,
							)}
				</p>
				<ul className="flex flex-col gap-1 text-sm">
					{page.programs.map((program) => {
						// An airline with the name of the programme says the name two times.
						const airlines = airlinesOf(program.id).filter(
							(name) => name !== program.name,
						);
						return (
							<li key={program.id} className="text-board-text">
								{program.name}
								{airlines.length > 0 && (
									<span className="text-board-muted">
										{" — "}
										{airlines.join(", ")}
									</span>
								)}
							</li>
						);
					})}
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<SectionTitle>{text.catalogue.routesTitle}</SectionTitle>
				<p className="text-board-muted text-xs">{text.catalogue.exampleNote}</p>
				<RouteList
					routes={page.routes}
					currencyName={name}
					label={(route) => `${routeSourceLabel(route)} → ${route.target.name}`}
				/>
				<p className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
					<TextLink href={routing.pathFor(locale, PATHS.calculator)}>
						{text.catalogue.calculatorLink}
					</TextLink>
					{page.sources.map((source) => {
						const slug = SOURCE_SLUGS[source.id];
						const route = page.routes.find((item) => item.source === source);
						return slug === undefined || route === undefined ? null : (
							<TextLink
								key={source.id}
								href={routing.pathFor(locale, PATHS.source(slug))}
							>
								{text.catalogue.source.title(routeSourceLabel(route))}
							</TextLink>
						);
					})}
				</p>
			</section>

			<FaqList title={text.catalogue.faqTitle} items={content.faq} />
		</PublicPage>
	);
}
