import type { ReactNode } from "react";
import { routing } from "../shared/locale.ts";
import { SplitFlapWord } from "./components/board/SplitFlapWord.tsx";
import { buttonVariants } from "./components/ui/button.tsx";
import { useI18n } from "./i18n/I18n.tsx";
import { cn } from "./lib/cn.ts";
import { formatDate } from "./lib/format.ts";
import type { Crumb } from "./lib/jsonLd.ts";

/** The anchor of the button of Google on the public page. */
export const SIGN_IN_ANCHOR = "accedi";

/**
 * The frame of a page of the catalogue, of the calculator and of a guide.
 *
 * The masthead holds the name, with a link to the public page, and the link
 * to the access. Then the path of the page, the `h1` and the answer. The `h1`
 * is the question of the person, as on the public page: the name alone gives no
 * subject to a search engine. Paragraph 5.5.5 of `docs/architecture.md`.
 *
 * The page holds no element of the router: the build writes it with
 * `renderToStaticMarkup`. Each link is an element `a`.
 */
export function PublicPage({
	crumbs,
	title,
	lead,
	updated,
	updatedLabel,
	children,
}: {
	/** The path from the public page, with no prefix of the language. */
	crumbs: readonly Crumb[];
	title: string;
	lead: ReactNode;
	/** The date of the content, or undefined for a page with no date. */
	updated?: string;
	updatedLabel?: string;
	children: ReactNode;
}) {
	const { t: text, locale, intl } = useI18n();
	const home = routing.pathFor(locale, "/");
	const last = crumbs.length - 1;
	return (
		<div className="flex flex-col gap-8">
			<header className="flex items-center justify-between gap-4 border-board-line border-b pb-4">
				<a href={home} aria-label={text.appName} className="flex items-center">
					<SplitFlapWord word={text.appName} size="md" />
				</a>
				<a
					href={`${home}#${SIGN_IN_ANCHOR}`}
					className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
				>
					{text.signIn}
				</a>
			</header>

			<nav aria-label={text.catalogue.breadcrumb}>
				<ol className="flex flex-wrap gap-x-2 text-board-muted text-xs">
					{crumbs.map((crumb, index) => (
						<li key={crumb.path} className="flex gap-x-2">
							{index === last ? (
								<span aria-current="page">{crumb.name}</span>
							) : (
								<>
									<a
										href={routing.pathFor(locale, crumb.path)}
										className="underline underline-offset-2 hover:text-board-text"
									>
										{crumb.name}
									</a>
									<span aria-hidden="true">›</span>
								</>
							)}
						</li>
					))}
				</ol>
			</nav>

			<div className="flex flex-col gap-3">
				<h1 className="font-board text-[22px] text-board-text uppercase leading-tight tracking-widest">
					{title}
				</h1>
				<p className="text-board-text text-sm leading-relaxed">{lead}</p>
				{updated !== undefined && updatedLabel !== undefined && (
					<p className="text-board-muted text-xs">
						{updatedLabel} {formatDate(updated, intl)}
					</p>
				)}
			</div>

			{children}
		</div>
	);
}
