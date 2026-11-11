import { convert } from "../../shared/conversion.ts";
import { useI18n } from "../i18n/I18n.tsx";
import { airlinesOf } from "../lib/airlines.ts";
import { EXAMPLE_POINTS, type Route } from "../lib/catalogue.ts";
import { pointsText, ratioLine } from "../lib/content.ts";
import { formatDate, formatPoints } from "../lib/format.ts";
import { ProgramLogo } from "./board/ProgramLogo.tsx";

/**
 * The routes of a page of the catalogue. Each route gives the ratio, the
 * minimum, the step, a calculation of an example and the date of the
 * examination of the official page.
 *
 * The list is a list of definitions, not a table: a table of six columns goes
 * outside the screen of a telephone. Paragraph 5.4 of `docs/architecture.md`.
 *
 * The result of the example is a calculation, not a balance, and the page says
 * it above the list.
 */
export function RouteList({
	routes,
	currencyName,
	label,
}: {
	routes: readonly Route[];
	currencyName: string;
	/** The name of the route: the source, the target or the two. */
	label: (route: Route) => string;
}) {
	const i18n = useI18n();
	const { t: text, intl } = i18n;
	return (
		<ul className="flex flex-col gap-4">
			{routes.map((route) => {
				const airlines = airlinesOf(route.target.id).filter(
					(name) => name !== route.target.name,
				);
				return (
					<li
						key={`${route.source.id}-${route.target.id}`}
						className="rounded-lg border border-board-line bg-board-panel px-4 py-3"
					>
						<p className="flex items-center gap-2 font-medium text-board-text text-sm">
							<span className="text-board-text">
								<ProgramLogo programId={route.target.id} />
							</span>
							{label(route)}
						</p>
						{airlines.length > 0 && (
							<p className="mt-1 text-board-muted text-xs">
								{airlines.join(", ")}
							</p>
						)}
						<dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
							<dt className="text-board-muted">{text.catalogue.ratio}</dt>
							<dd className="text-board-text">
								{ratioLine(route, currencyName, i18n)}
							</dd>
							<dt className="text-board-muted">{text.catalogue.minimum}</dt>
							<dd className="text-board-text">
								{pointsText(route.rule.minTransfer, i18n)}
							</dd>
							<dt className="text-board-muted">{text.catalogue.increment}</dt>
							<dd className="text-board-text">
								{pointsText(route.rule.increment, i18n)}
							</dd>
							<dt className="text-board-muted">
								{text.catalogue.example(formatPoints(EXAMPLE_POINTS, intl))}
							</dt>
							<dd className="text-board-amber">
								{formatPoints(convert(EXAMPLE_POINTS, route.rule), intl)}{" "}
								{currencyName}
							</dd>
							<dt className="text-board-muted">{text.catalogue.verifiedOn}</dt>
							<dd className="text-board-text">
								{formatDate(route.rule.validFrom, intl)}
							</dd>
						</dl>
					</li>
				);
			})}
		</ul>
	);
}
