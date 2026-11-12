import { routing } from "../../../shared/locale.ts";
import { useI18n } from "../../i18n/I18n.tsx";

/**
 * The address of the repository. The licence is MIT, and a person can install
 * Yume on a server of that person.
 */
const SOURCE_URL = "https://github.com/dstmrk/yume";

/**
 * The foot of each surface.
 *
 * Yume names American Express, Revolut, Klarna and each airline programme of
 * the catalogue. Therefore each surface must say that Yume belongs to none of
 * them.
 * Paragraph 5.5.4 of `docs/architecture.md` gives that decision.
 *
 * `AppShell` holds this component, thus the public page, the dashboard and the
 * form of the access all give the same text. The dashboard needs it most: a
 * person reads the names of the programmes there.
 *
 * The element is an `a` and not a `Link` of the router: the address is outside
 * the application, and the pre-render of `prerender.tsx` holds no router.
 */
export function SiteFooter() {
	const { t: text, locale } = useI18n();
	return (
		<footer className="mt-10 border-board-line border-t pt-4 pb-2 text-board-muted text-xs leading-relaxed">
			<p>{text.footerDisclaimer}</p>
			<p className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
				{/* The legal pages, in the language of the page. */}
				<a
					href={routing.pathFor(locale, "/privacy")}
					className="underline underline-offset-2 hover:text-board-text"
				>
					{text.footerPrivacy}
				</a>
				<a
					href={routing.pathFor(locale, "/tos")}
					className="underline underline-offset-2 hover:text-board-text"
				>
					{text.footerTos}
				</a>
				<a
					href={routing.pathFor(locale, "/connector")}
					className="underline underline-offset-2 hover:text-board-text"
				>
					{text.footerConnector}
				</a>
				<a
					href={routing.pathFor(locale, "/support")}
					className="underline underline-offset-2 hover:text-board-text"
				>
					{text.footerSupport}
				</a>
				<a
					href={SOURCE_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="underline underline-offset-2 hover:text-board-text"
				>
					{text.footerSource}
				</a>
			</p>
			{/* The publisher and the VAT number, on each surface of each
			    installation, as the legal pages. Paragraph 5.5.4. */}
			<p className="mt-3">{text.footerPublisher}</p>
		</footer>
	);
}
