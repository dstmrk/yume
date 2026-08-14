import { cva, type VariantProps } from "class-variance-authority";
import { flapSize, toFlapCells } from "../../lib/flaps.ts";
import { formatPoints } from "../../lib/format.ts";
import { SplitFlapCell } from "./SplitFlapCell.tsx";

/**
 * One flap of the board.
 *
 * A board of Solari holds one flap for each position, and each flap has the
 * same size. The separator of the thousands holds a position, thus it is also a
 * flap. Then the line of the axis crosses the full number.
 *
 * The size is a multiple of 11 pixels. Departure Mono is a pixel font, and the
 * author gives that grid for an exact result. A balance holds the medium size.
 * A potential holds the large size, but a value of seven digits is wider than
 * the panel: `flapSize` then gives the medium size. Refer to paragraph 5.3 of
 * `docs/architecture.md`.
 *
 * The size comes from an arbitrary value, not from a token of the theme. A
 * class `text-flap-lg` and the class `text-board-amber` have the same shape,
 * thus `tailwind-merge` reads the two as a colour and removes the size. A class
 * `text-[33px]` holds a length, thus `tailwind-merge` reads it as a size.
 *
 * The height of the housing is also a multiple of 11 pixels. `SplitFlapCell`
 * makes the two halves at one half of that height, thus the value is fixed and
 * not the height of a line.
 *
 * The variant `potential` is the amber of a value that the system calculates,
 * and its flaps turn at the load of the page. The variant `balance` is a value
 * that the user wrote: it holds the colour of the text and it does not move.
 * The amber marks a calculation. Refer to paragraph 5.2 of
 * `docs/architecture.md`.
 */
const flapCell = cva("", {
	variants: {
		variant: {
			potential: "text-board-amber",
			balance: "text-board-text",
		},
		size: {
			lg: "px-1.5 text-[33px] [--flap-h:55px]",
			md: "px-1 text-[22px] [--flap-h:33px]",
		},
	},
	defaultVariants: {
		variant: "potential",
		size: "lg",
	},
});

/**
 * A quantity of points with one flap for each digit, as on a departure board.
 *
 * The flaps of the potential turn when the page loads, one after the other. A
 * board turns its flaps when new data arrives, and the page load is that
 * moment. Each flap turns through the drum of the digits until the correct
 * digit arrives, as a real Solari. The list of the accounts holds many numbers,
 * thus its flaps do not move: the movement of all those flaps is noise. A user
 * with `prefers-reduced-motion` sees each value immediately: the rules of the
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
	// The component gives the size. A balance is in a line of a list, thus it
	// always holds the medium size.
	const size = variant === "balance" ? "md" : flapSize(value);

	return (
		<span className="inline-flex items-stretch gap-0.5">
			<span className="sr-only">{formatPoints(value)}</span>
			<span aria-hidden="true" className="inline-flex items-stretch gap-0.5">
				{toFlapCells(value).map((cell) => (
					<SplitFlapCell
						key={cell.position}
						char={cell.char}
						index={cell.position}
						moves={variant !== "balance"}
						className={flapCell({ variant, size })}
					/>
				))}
			</span>
		</span>
	);
}
