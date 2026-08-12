import { toFlapCells } from "../../lib/flaps.ts";
import { formatPoints } from "../../lib/format.ts";

/**
 * A quantity of points with one flap for each digit, as on a departure board.
 *
 * The flaps fall into their place when the page loads, one after the other. A
 * board turns its flaps when new data arrives, and the page load is that
 * moment. A user with `prefers-reduced-motion` sees the value immediately: the
 * rules of the animation are in `styles/theme.css`.
 *
 * A screen reader reads the value one time, from the element that is not
 * visible. The flaps hold `aria-hidden`, because a reader of six separate cells
 * says "five, one, point, four, zero, zero". Refer to paragraph 5.2 of
 * `docs/architecture.md`.
 */
export function SplitFlapNumber({ value }: { value: number }) {
	return (
		<span className="inline-flex items-stretch gap-0.5">
			<span className="sr-only">{formatPoints(value)}</span>
			<span
				aria-hidden="true"
				className="flap-board inline-flex items-stretch gap-0.5"
			>
				{toFlapCells(value).map((cell) => {
					const delay = {
						"--flap-index": cell.position,
					} as React.CSSProperties;
					return cell.kind === "separator" ? (
						<span
							key={cell.position}
							style={delay}
							className="flap-drop px-px py-2 font-board text-3xl text-board-amber"
						>
							{cell.char}
						</span>
					) : (
						<span
							key={cell.position}
							style={delay}
							className="flap flap-drop px-1.5 py-2 text-3xl text-board-amber"
						>
							{cell.char}
						</span>
					);
				})}
			</span>
		</span>
	);
}
