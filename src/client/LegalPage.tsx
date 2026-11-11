import { AppTitle } from "./components/board/AppTitle.tsx";
import { useI18n } from "./i18n/I18n.tsx";
import { CONTACT_EMAIL } from "./lib/site.ts";

/** The documents of the dictionary with the shape of a legal page. */
export type LegalDocument = "privacy" | "tos" | "connector" | "support";

/**
 * A page of a document: `/privacy`, `/tos`, `/connector` or `/support`.
 *
 * `/connector` is the public documentation of the MCP server, not a legal
 * document. It has the same shape: sections of paragraphs and lists, and the
 * address of the contact. Paragraph 4.7.4 of `docs/architecture.md`.
 *
 * Google asks for the address of the two pages before it publishes the
 * sign-in for each account, and the GDPR asks for the policy before the
 * registration. The text is in the dictionary of the language, and the two
 * documents have one shape. The page is a standard surface, not a surface of
 * the board: a person reads it, and it shows no value. `AppTitle` holds the
 * one `h1` of the page, thus the title of the document is an `h2`.
 */
export function LegalPage({ document }: { document: LegalDocument }) {
	const { t: text } = useI18n();
	const legal = text[document];

	return (
		<>
			<AppTitle />
			<article className="flex flex-col gap-6 text-board-text text-sm leading-relaxed">
				<header className="flex flex-col gap-1">
					<h2 className="font-semibold text-lg">{legal.title}</h2>
					<p className="text-board-muted text-xs">{legal.subtitle}</p>
					<p className="text-board-muted text-xs">{legal.updated}</p>
				</header>

				{legal.sections.map((section) => (
					<section key={section.title} className="flex flex-col gap-2">
						<h3 className="font-semibold">{section.title}</h3>
						{section.paragraphs.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
						{section.items.length > 0 && (
							<ul className="flex list-disc flex-col gap-1 pl-5">
								{section.items.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						)}
						{section.contact && (
							<p>
								{legal.contactLead}{" "}
								<a
									href={`mailto:${CONTACT_EMAIL}`}
									className="underline underline-offset-2"
								>
									{CONTACT_EMAIL}
								</a>
								.
							</p>
						)}
					</section>
				))}
			</article>
		</>
	);
}
