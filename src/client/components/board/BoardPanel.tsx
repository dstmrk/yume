import type { ReactNode } from "react";

/**
 * A panel of the departure board: a title above a dark surface.
 *
 * The title uses the font of the board, because it is short. A long sentence
 * uses the standard font of the system. Refer to paragraph 5.2 of
 * `docs/architecture.md`.
 *
 * The property `action` holds one control at the right of the title. The card
 * of a currency puts the heart of the favourites there.
 *
 * The property `note` holds one line under the title. The card of a currency
 * puts its airlines there, with a button for the other names.
 */
export function BoardPanel({
	title,
	note,
	action,
	children,
}: {
	title: string;
	note?: ReactNode;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="overflow-hidden rounded-lg border border-board-line bg-board-panel">
			<header className="border-board-line border-b px-4 py-2">
				<div className="flex items-center justify-between gap-3">
					<h2 className="font-board text-[11px] text-board-muted uppercase tracking-widest">
						{title}
					</h2>
					{action}
				</div>
				{note !== undefined && (
					<p className="mt-1 text-board-muted text-xs">{note}</p>
				)}
			</header>
			<div className="px-4 py-3">{children}</div>
		</section>
	);
}
