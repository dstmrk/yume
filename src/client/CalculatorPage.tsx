import { useId, useState } from "react";
import { DEFAULT_COUNTRY } from "../shared/catalogue.ts";
import { routing } from "../shared/locale.ts";
import { SectionTitle } from "./components/board/SectionTitle.tsx";
import { SplitFlapNumber } from "./components/board/SplitFlapNumber.tsx";
import { TextLink } from "./components/board/TextLink.tsx";
import { FaqList } from "./components/FaqList.tsx";
import { Input } from "./components/ui/input.tsx";
import { Label } from "./components/ui/label.tsx";
import { useI18n } from "./i18n/I18n.tsx";
import { todayIso } from "./lib/balance.ts";
import { calculatorRows, readCalculatorFields } from "./lib/calculator.ts";
import { SOURCE_SLUGS, sourcePages } from "./lib/catalogue.ts";
import { pageSourceLabel } from "./lib/content.ts";
import { formatPoints } from "./lib/format.ts";
import { PATHS, pageCrumbs } from "./lib/pages.ts";
import { SEED } from "./lib/seed.ts";
import { PublicPage, SIGN_IN_ANCHOR } from "./PublicPage.tsx";

/**
 * The public calculator: `/calcolatore`.
 *
 * A visitor writes the points of each source and reads the potential miles of
 * each currency. The calculation happens in the browser with the rules of the
 * seed: the page sends no number to the server and keeps no number. Paragraph
 * 5.5.6 of `docs/architecture.md` gives the rules.
 *
 * The page shows a real value of the person, thus it gives the warning of the
 * transfer, as the dashboard does. It shows no sum of the rows: the same
 * points cannot go to two currencies.
 *
 * The form is a standard surface. The results are a surface of the board, thus
 * each value is a `SplitFlapNumber`.
 */
export function CalculatorPage() {
	const i18n = useI18n();
	const { t: text, locale, intl } = i18n;
	const fieldId = useId();
	const at = todayIso(new Date());
	const sources = sourcePages(SEED, DEFAULT_COUNTRY, at, SOURCE_SLUGS);
	const [fields, setFields] = useState<Record<string, string>>({});
	const calc = text.calculator;

	const { points, invalid, typed } = readCalculatorFields(
		fields,
		sources.map((source) => source.source.id),
		intl,
	);
	const rows = calculatorRows({
		points,
		catalogue: SEED,
		country: DEFAULT_COUNTRY,
		at,
	});
	const labelOf = new Map(
		sources.map((source) => [source.source.id, pageSourceLabel(source)]),
	);

	return (
		<PublicPage
			crumbs={pageCrumbs(
				text.catalogue,
				text.footerCalculator,
				PATHS.calculator,
			)}
			title={calc.title}
			lead={calc.lead}
		>
			<section className="flex flex-col gap-4">
				<SectionTitle>{calc.formTitle}</SectionTitle>
				{sources.map((source) => {
					const id = `${fieldId}-${source.source.id}`;
					const error = invalid.has(source.source.id);
					return (
						<div key={source.source.id} className="flex flex-col gap-2">
							<Label htmlFor={id}>{pageSourceLabel(source)}</Label>
							<Input
								id={id}
								inputMode="numeric"
								autoComplete="off"
								placeholder="0"
								value={fields[source.source.id] ?? ""}
								aria-invalid={error}
								aria-describedby={error ? `${id}-error` : undefined}
								onChange={(event) =>
									setFields({
										...fields,
										[source.source.id]: event.target.value,
									})
								}
							/>
							{error && (
								<p id={`${id}-error`} className="text-destructive text-xs">
									{calc.pointsError}
								</p>
							)}
						</div>
					);
				})}
			</section>

			<section className="flex flex-col gap-3" aria-live="polite">
				<SectionTitle>{text.potentialTitle}</SectionTitle>
				{!typed ? (
					<p className="text-board-muted text-sm">{calc.empty}</p>
				) : rows.length === 0 ? (
					<p className="text-board-muted text-sm">{calc.none}</p>
				) : (
					<>
						<p className="text-board-amber text-xs">{text.potentialWarning}</p>
						<p className="text-board-muted text-xs">{calc.noSum}</p>
						<ul className="flex flex-col gap-3">
							{rows.map((row) => (
								<li
									key={row.currency.id}
									className="rounded-lg border border-board-line bg-board-panel px-4 py-3"
								>
									<div className="flex items-center justify-between gap-3">
										<p className="font-board text-[11px] text-board-muted uppercase tracking-widest">
											{row.currency.name}
										</p>
										<TextLink
											href={routing.pathFor(
												locale,
												PATHS.currency(row.currency.id),
											)}
										>
											{calc.ratesLink}
										</TextLink>
									</div>
									<div className="mt-2">
										<SplitFlapNumber value={row.total} />
									</div>
									<p className="mt-2 text-board-muted text-xs">
										{row.routes
											.map((route) =>
												calc.from(
													labelOf.get(route.fromProgramId) ?? "",
													formatPoints(route.points, intl),
												),
											)
											.join(" · ")}
									</p>
								</li>
							))}
						</ul>
					</>
				)}
			</section>

			<section className="flex flex-col gap-2">
				<SectionTitle>{calc.howTitle}</SectionTitle>
				<ul className="flex list-disc flex-col gap-1 pl-5 text-board-text text-sm leading-relaxed">
					{calc.how.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</section>

			<FaqList title={text.catalogue.faqTitle} items={calc.faq} />

			<p className="text-board-muted text-sm">
				{calc.signIn}{" "}
				<TextLink href={`${routing.pathFor(locale, "/")}#${SIGN_IN_ANCHOR}`}>
					{text.signInWithGoogle}
				</TextLink>
			</p>
		</PublicPage>
	);
}
