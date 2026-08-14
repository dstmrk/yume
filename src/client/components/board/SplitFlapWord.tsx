import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn.ts";
import { toWordCells } from "../../lib/flaps.ts";

/**
 * One flap of the board with one letter.
 *
 * The surface holds the utility `flap` of `styles/theme.css`, as the flaps of
 * `SplitFlapNumber`. Thus a letter and a digit hold the same gradient, the same
 * seam and the same radius.
 *
 * The size is a multiple of 11 pixels, and it comes from an arbitrary value.
 * A token with the shape of a colour loses against `text-board-amber`, because
 * `tailwind-merge` reads the two as a colour. Refer to `SplitFlapNumber`.
 *
 * The name of the application holds the amber, as before the flaps.
 */
const wordCell = cva("flap text-board-amber", {
	variants: {
		size: {
			lg: "px-1.5 py-2 text-[33px]",
			md: "px-1 py-1 text-[22px]",
		},
	},
	defaultVariants: {
		size: "md",
	},
});

/**
 * A word with one flap for each letter, as on a departure board.
 *
 * The flaps do not fall at the load. A flap turns when new data arrives, and a
 * name is not data: it is the same word at each load. Refer to paragraph 5.6 of
 * `docs/architecture.md`.
 *
 * A screen reader reads the word one time, from the element that is not
 * visible, and in its normal form: a reader of four separate cells says "Y, U,
 * M, E". Refer to paragraph 5.2 of `docs/architecture.md`.
 */
export function SplitFlapWord({
	word,
	size,
}: {
	word: string;
	size?: VariantProps<typeof wordCell>["size"];
}) {
	return (
		<span className="inline-flex items-stretch gap-0.5">
			<span className="sr-only">{word}</span>
			<span aria-hidden="true" className="inline-flex items-stretch gap-0.5">
				{toWordCells(word).map((cell) => (
					<span key={cell.position} className={cn(wordCell({ size }))}>
						{cell.char}
					</span>
				))}
			</span>
		</span>
	);
}
