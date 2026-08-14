import { Link } from "@tanstack/react-router";
import { BoardPanel } from "./components/board/BoardPanel.tsx";
import { SplitFlapNumber } from "./components/board/SplitFlapNumber.tsx";
import { buttonVariants } from "./components/ui/button.tsx";
import { text } from "./text.ts";

/**
 * The value of the board of the example.
 *
 * The number is an example, and the page says it. The page shows no ratio and
 * no name of a programme: a ratio needs a source, and the catalogue of
 * `src/server/db/seed/` is the only source. Refer to the rule 5 of the data in
 * `CLAUDE.md`.
 */
const EXAMPLE_POINTS = 128_400;

/**
 * The public page of the application. A visitor with no session reads it.
 *
 * Yume gives an account only with an invitation, thus this page sells nothing.
 * It gives the context that the form of the access does not give: what Yume
 * calculates, and the two limits of that calculation. Refer to paragraph 5.5.1
 * of `docs/architecture.md`.
 *
 * The link of the access holds `buttonVariants` of `components/ui/button.tsx`.
 * A navigation needs an `a` element, and the `Link` of the router gives it.
 * Thus the link has the appearance of the standard button.
 */
export function HomePage() {
	return (
		<div className="flex flex-col gap-6">
			<p className="text-board-text text-sm">{text.homeTagline}</p>

			<BoardPanel title={text.potentialTitle} note={text.homeExample}>
				<SplitFlapNumber value={EXAMPLE_POINTS} />
			</BoardPanel>

			<dl className="flex flex-col gap-4">
				<Point title={text.homeHowTitle} body={text.homeHow} />
				<Point title={text.homeLimitsTitle} body={text.homeLimits} />
				<Point title={text.homeScopeTitle} body={text.homeScope} />
			</dl>

			<div className="flex flex-col gap-2">
				<Link to="/login" className={buttonVariants()}>
					{text.signIn}
				</Link>
				<p className="text-board-muted text-xs">{text.inviteOnly}</p>
			</div>
		</div>
	);
}

/** One short point of the page: a title of the board and one sentence. */
function Point({ title, body }: { title: string; body: string }) {
	return (
		<div>
			<dt className="font-board text-[11px] text-board-muted uppercase tracking-widest">
				{title}
			</dt>
			<dd className="mt-1 text-sm">{body}</dd>
		</div>
	);
}
