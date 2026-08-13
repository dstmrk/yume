import { Link } from "@tanstack/react-router";
import { text } from "./text.ts";

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

			<Link
				to="/login"
				className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			>
				{text.signIn}
			</Link>

			<p className="text-board-muted text-xs">{text.inviteOnly}</p>
		</div>
	);
}
