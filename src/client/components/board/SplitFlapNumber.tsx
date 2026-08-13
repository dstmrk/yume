import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn.ts";
import { toFlapCells } from "../../lib/flaps.ts";
import { formatPoints } from "../../lib/format.ts";

/**
 * One flap of the board.
 *
 * A board of Solari holds one flap for each position, and each flap has the
 * same size. The separator of the thousands holds a position, thus it is also a
 * flap. Then the line between the two halves crosses the full number.
 *
 * The size is a multiple of 11 pixels. Departure Mono is a pixel font, and the
 * author gives that grid for an exact result. Refer to paragraph 5.3 of
 * `docs/architecture.md`.
 *
 * The size comes from an arbitrary value, not from a token of the theme. A
 * class `text-flap-lg` and the class `text-board-amber` have the same shape,
 * thus `tailwind-merge` reads the two as a colour and removes the size. A class
 * `text-[33px]` holds a length, thus `tailwind-merge` reads it as a size.
 *
 * The variant `potential` is the amber of a value that the system calculates,
 * and its flaps fall at the load of the page. The variant `balance` is a value
 * that the user wrote: it holds the colour of the text and it does not move.
 * The amber marks a calculation. Refer to paragraph 5.2 of
 * `docs/architecture.md`.
 */
const flapCell = cva("flap", {
	variants: {
		variant: {
			potential: "flap-drop px-1.5 py-2 text-[33px] text-board-amber",
			balance: "px-1 py-1 text-[22px] text-board-text",
		},
	},
	defaultVariants: {
		variant: "potential",
	},
});

/**
 * A quantity of points with one flap for each digit, as on a departure board.
 *
 * The flaps of the potential fall into their place when the page loads, one
 * after the other. A board turns its flaps when new data arrives, and the page
 * load is that moment. The list of the accounts holds many numbers, thus its
 * flaps do not move: the movement of all those flaps is noise. A user with
 * `prefers-reduced-motion` sees each value immediately: the rules of the
 * animation are in `styles/theme.css`.
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
						className={cn(flapCell({ variant }))}
					>
						{cell.char}
					</span>
				))}
			</span>
		</span>
	);
}
