import type { ReactNode } from "react";

/**
 * The column of the application.
 *
 * It holds the width of the board on a telephone, and it takes more space above
 * 768 pixels. One design serves the two screens: the breakpoint changes the
 * width and no element. Paragraph 5.4 of `docs/architecture.md` gives the rule.
 *
 * The root route of `router.tsx` and the pre-render of `prerender.tsx` both use
 * this component. The two must give the same elements: the browser paints the
 * page of the pre-render before React starts, and a different container then
 * moves each element at the moment that React arrives.
 */
export function AppShell({ children }: { children: ReactNode }) {
	return (
		<main className="mx-auto flex w-full max-w-board flex-col gap-6 px-4 pt-safe pb-safe md:max-w-3xl">
			{children}
		</main>
	);
}
