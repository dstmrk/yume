import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn.ts";
import { toFlapCells } from "../../lib/flaps.ts";
import { formatPoints } from "../../lib/format.ts";

/**
 * One cell of the board.
 *
 * A board of Solari has one flap for each digit. Thus each number on a flap
 * surface uses this component: a number on one large flap is not a board.
 *
 * The variant `potential` is the amber of a value that the system calculates.
 * The variant `balance` is a value that the user wrote. The two variants have
 * different colours, because the amber marks a calculation. Refer to paragraph
 * 5.2 of `docs/architecture.md`.
 *
 * The separator of the thousands is not a flap: it holds no digit. Therefore it
 * receives the font of the board, but no face and no width of a flap.
 */
const flapCell = cva("flap-drop", {
	variants: {
		variant: {
			potential: "px-1.5 py-2 text-3xl text-board-amber",
			balance: "px-1 py-1 text-base text-board-text",
		},
		kind: {
			digit: "flap",
			separator: "px-px font-board",
		},
	},
	defaultVariants: {
		variant: "potential",
	},
});

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
export function SplitFlapNumber({
	value,
	variant,
}: {
	value: number;
	/** The component gives `kind` to each cell. The point of use gives no kind. */
	variant?: VariantProps<typeof flapCell>["variant"];
}) {
	return (
		<span className="inline-flex items-stretch gap-0.5">
			<span className="sr-only">{formatPoints(value)}</span>
			<span
				aria-hidden="true"
				className="flap-board inline-flex items-stretch gap-0.5"
			>
				{toFlapCells(value).map((cell) => (
					<span
						key={cell.position}
						style={{ "--flap-index": cell.position } as React.CSSProperties}
						className={cn(flapCell({ variant, kind: cell.kind }))}
					>
						{cell.char}
					</span>
				))}
			</span>
		</span>
	);
}
