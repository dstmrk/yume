import type { ReactNode } from "react";
import { SiteFooter } from "./components/board/SiteFooter.tsx";

/**
 * The column of the application.
 *
 * It holds the width of the board on a telephone, and it takes more space above
 * 768 pixels. One design serves the two screens: the breakpoint changes the
 * width and no element. Paragraph 5.4 of `docs/architecture.md` gives the rule.
 *
 * The column holds the `main` of the page and the foot. The foot is outside the
 * `main`, because it belongs to the site and not to the page. It gives the
 * warning of the affiliation on each surface: the dashboard also names each
 * programme of the catalogue. Refer to `components/board/SiteFooter.tsx`.
 *
 * The column holds the full height of the screen, and the `main` grows. Thus
 * the foot stays at the end of a page that is shorter than the screen.
 *
 * The root route of `router.tsx` and the pre-render of `prerender.tsx` both use
 * this component. The two must give the same elements: the browser paints the
 * page of the pre-render before React starts, and a different container then
 * moves each element at the moment that React arrives.
 */
export function AppShell({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-board flex-col px-4 pt-safe pb-safe md:max-w-3xl">
			<main className="flex flex-1 flex-col gap-6">{children}</main>
			<SiteFooter />
		</div>
	);
}
