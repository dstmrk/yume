import { toFlapCells } from "../../lib/flaps.ts";
import { formatPoints } from "../../lib/format.ts";

/**
 * A quantity of points with one flap for each digit, as on a departure board.
 *
 * A screen reader reads the value one time, from the element that is not
 * visible. The flaps hold `aria-hidden`, because a reader of six separate cells
 * says "five, one, point, four, zero, zero". Refer to paragraph 5.2 of
 * `docs/architecture.md`.
 *
 * The flaps do not turn now. The session that adds the forms adds the
 * animation, because only then does a value change in the page.
 */
export function SplitFlapNumber({ value }: { value: number }) {
	return (
		<span className="inline-flex items-stretch gap-0.5">
			<span className="sr-only">{formatPoints(value)}</span>
			<span aria-hidden="true" className="inline-flex items-stretch gap-0.5">
				{toFlapCells(value).map((cell) =>
					cell.kind === "separator" ? (
						<span
							key={cell.position}
							className="px-px py-2 font-board text-3xl text-board-amber"
						>
							{cell.char}
						</span>
					) : (
						<span
							key={cell.position}
							className="flap px-1.5 py-2 text-3xl text-board-amber"
						>
							{cell.char}
						</span>
					),
				)}
			</span>
		</span>
	);
}
