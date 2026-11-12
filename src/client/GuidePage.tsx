import { DEFAULT_COUNTRY } from "../shared/catalogue.ts";
import { routing } from "../shared/locale.ts";
import { SectionTitle } from "./components/board/SectionTitle.tsx";
import { TextLink } from "./components/board/TextLink.tsx";
import { FaqList } from "./components/FaqList.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./components/ui/table.tsx";
import { useI18n } from "./i18n/I18n.tsx";
import { todayIso } from "./lib/balance.ts";
import { currencyPages, SOURCE_SLUGS, sourcePages } from "./lib/catalogue.ts";
import { matrixLead, sourceMatrix } from "./lib/content.ts";
import { PATHS, pageCrumbs } from "./lib/pages.ts";
import { SEED } from "./lib/seed.ts";
import { NotFoundPage } from "./NotFoundPage.tsx";
import { PublicPage } from "./PublicPage.tsx";

/**
 * A guide: `/guide/<slug>`. The text is in the dictionary. A guide with
 * `matrix` also holds the table of the comparison of the sources, from the
 * seed. Paragraph 5.5.7 of `docs/architecture.md` gives the rules.
 */
export function GuidePage({ slug }: { slug: string }) {
	const i18n = useI18n();
	const { t: text, locale } = i18n;
	const guide = text.guides.items.find((item) => item.slug === slug);
	if (guide === undefined) {
		return <NotFoundPage />;
	}
	const others = text.guides.items.filter((item) => item.slug !== slug);

	return (
		<PublicPage
			crumbs={pageCrumbs(text.catalogue, guide.title, PATHS.guide(guide.slug))}
			title={guide.title}
			lead={guide.lead}
			updated={guide.modified}
			updatedLabel={text.guides.updated}
		>
			{guide.matrix && <SourceMatrix />}

			{guide.sections.map((section) => (
				<section key={section.title} className="flex flex-col gap-2">
					<h2 className="font-semibold text-board-text">{section.title}</h2>
					{section.paragraphs.map((paragraph) => (
						<p
							key={paragraph}
							className="text-board-text text-sm leading-relaxed"
						>
							{paragraph}
						</p>
					))}
					{section.items.length > 0 && (
						<ol className="flex list-decimal flex-col gap-1 pl-5 text-board-text text-sm leading-relaxed">
							{section.items.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ol>
					)}
				</section>
			))}

			<p className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
				<TextLink href={routing.pathFor(locale, PATHS.calculator)}>
					{text.catalogue.calculatorLink}
				</TextLink>
				<TextLink href={routing.pathFor(locale, PATHS.currencies)}>
					{text.homeExploreCurrencies}
				</TextLink>
			</p>

			<FaqList title={text.catalogue.faqTitle} items={guide.faq} />

			<section className="flex flex-col gap-2">
				<SectionTitle>{text.guides.relatedTitle}</SectionTitle>
				<ul className="flex flex-col gap-1 text-sm">
					{others.map((item) => (
						<li key={item.slug}>
							<TextLink href={routing.pathFor(locale, PATHS.guide(item.slug))}>
								{item.title}
							</TextLink>
						</li>
					))}
				</ul>
			</section>
		</PublicPage>
	);
}

/**
 * The table of the comparison: one row for each currency, one column for each
 * source. A table of four short columns stays inside the screen of a telephone.
 */
function SourceMatrix() {
	const i18n = useI18n();
	const { t: text, locale, intl } = i18n;
	const at = todayIso(new Date());
	const currencies = currencyPages(SEED, DEFAULT_COUNTRY, at);
	const sources = sourcePages(SEED, DEFAULT_COUNTRY, at, SOURCE_SLUGS);
	const rows = sourceMatrix(currencies, sources, intl);

	return (
		<section className="flex flex-col gap-3">
			<SectionTitle>{text.guides.matrixTitle}</SectionTitle>
			<p className="text-board-text text-sm leading-relaxed">
				{matrixLead(sources, i18n)}
			</p>
			<Table className="text-xs">
				<TableHeader>
					<TableRow>
						<TableHead scope="col">{text.guides.matrixCurrency}</TableHead>
						{sources.map((source) => (
							<TableHead key={source.slug} scope="col">
								<TextLink
									href={routing.pathFor(locale, PATHS.source(source.slug))}
								>
									{source.source.name}
								</TextLink>
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row) => (
						<TableRow key={row.currency.id}>
							<TableHead scope="row">
								<TextLink
									href={routing.pathFor(
										locale,
										PATHS.currency(row.currency.id),
									)}
								>
									{row.currency.name}
								</TextLink>
							</TableHead>
							{row.cells.map((cell, index) => (
								<TableCell
									key={sources[index]?.slug}
									className={
										cell === null ? "text-board-muted" : "whitespace-normal"
									}
								>
									{cell ?? text.guides.matrixNone}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}
