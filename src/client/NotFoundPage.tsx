import { Link } from "@tanstack/react-router";
import { SplitFlapNumber } from "./components/board/SplitFlapNumber.tsx";
import { buttonVariants } from "./components/ui/button.tsx";
import { cn } from "./lib/cn.ts";
import { text } from "./text.ts";

/**
 * The code of a page that the site does not hold.
 *
 * The value is a number, thus the drum of the flaps holds each character of it.
 * The drum holds the digits and no letter, therefore a word gives no such
 * surface. Refer to paragraph 5.6 of `docs/architecture.md`.
 */
const NOT_FOUND_CODE = 404;

/**
 * The page of a path that the client does not hold.
 *
 * The router gives this page to a path with no route, and the server gives the
 * status 404 to that same path. `isClientPath` of `src/shared/routes.ts` holds
 * the list of the paths. Paragraph 5.5.3 of `docs/architecture.md` gives the
 * rules.
 *
 * The flaps of the code turn at the load, as the flaps of a potential value.
 * The amber marks a value that the system gives, and the code of the answer is
 * such a value: the person wrote no part of it. The page holds one sentence and
 * one link, because a person who arrives here wants the correct page and not an
 * explanation.
 */
export function NotFoundPage() {
	// The page holds one surface, thus that surface holds the centre of the
	// screen. The other pages start at the top, because their content arrives
	// below the first surface.
	return (
		<div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
			<SplitFlapNumber value={NOT_FOUND_CODE} />
			<p className="text-board-text text-sm">{text.notFound}</p>
			<Link to="/" className={cn(buttonVariants(), "w-full")}>
				{text.notFoundLink}
			</Link>
		</div>
	);
}
