import { Link } from "@tanstack/react-router";
import { BoardPanel } from "./components/board/BoardPanel.tsx";
import { SplitFlapNumber } from "./components/board/SplitFlapNumber.tsx";
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
 * The link of the access is not the component `Button`: that component is a
 * `button` element, and it does not export its classes. A navigation needs an
 * `a` element, thus the link holds the same classes.
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
				<Link
					to="/login"
					className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				>
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
