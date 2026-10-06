import { text } from "../../text.ts";

/**
 * The address of the repository. The licence is MIT, and a person can install
 * Yume on a server of that person.
 */
const SOURCE_URL = "https://github.com/dstmrk/yume";

/**
 * The foot of each surface.
 *
 * Yume names American Express, Revolut and each airline programme of the
 * catalogue. Therefore each surface must say that Yume belongs to none of them.
 * Paragraph 5.5.5 of `docs/architecture.md` gives that decision.
 *
 * `AppShell` holds this component, thus the public page, the dashboard and the
 * form of the access all give the same text. The dashboard needs it most: a
 * person reads the names of the programmes there.
 *
 * The element is an `a` and not a `Link` of the router: the address is outside
 * the application, and the pre-render of `prerender.tsx` holds no router.
 */
export function SiteFooter() {
	return (
		<footer className="mt-10 border-board-line border-t pt-4 pb-2 text-board-muted text-xs leading-relaxed">
			<p>{text.footerDisclaimer}</p>
			<p className="mt-3">
				<a
					href={SOURCE_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="underline underline-offset-2 hover:text-board-text"
				>
					{text.footerSource}
				</a>
			</p>
		</footer>
	);
}
