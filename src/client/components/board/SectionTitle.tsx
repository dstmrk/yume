import type { ReactNode } from "react";

/**
 * The title of a section of a public page, in the style of the labels of the
 * board. The public page holds the same classes in its own elements.
 */
export function SectionTitle({ children }: { children: ReactNode }) {
	return (
		<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
			{children}
		</h2>
	);
}
