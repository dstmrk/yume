import type { ReactNode } from "react";

/**
 * A panel of the departure board: a title above a dark surface.
 *
 * The title uses the font of the board, because it is short. A long sentence
 * uses the standard font of the system. Refer to paragraph 5.2 of
 * `docs/architecture.md`.
 */
export function BoardPanel({
	title,
	note,
	children,
}: {
	title: string;
	note?: string;
	children: ReactNode;
}) {
	return (
		<section className="overflow-hidden rounded-lg border border-board-line bg-board-panel">
			<header className="border-board-line border-b px-4 py-2">
				<h2 className="font-board text-board-muted text-xs uppercase tracking-widest">
					{title}
				</h2>
				{note !== undefined && (
					<p className="mt-1 text-board-muted text-xs">{note}</p>
				)}
			</header>
			<div className="px-4 py-3">{children}</div>
		</section>
	);
}
