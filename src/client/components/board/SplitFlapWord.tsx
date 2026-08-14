import { cva, type VariantProps } from "class-variance-authority";
import { toWordCells } from "../../lib/flaps.ts";
import { SplitFlapCell } from "./SplitFlapCell.tsx";

/**
 * One flap of the board with one letter.
 *
 * The flap holds the same housing and the same cards of `SplitFlapNumber`,
 * because both use `SplitFlapCell`. Thus a letter and a digit hold the same
 * gradient, the same axis and the same radius.
 *
 * The size is a multiple of 11 pixels, and it comes from an arbitrary value.
 * A token with the shape of a colour loses against `text-board-amber`, because
 * `tailwind-merge` reads the two as a colour. Refer to `SplitFlapNumber`.
 *
 * The name of the application holds the amber, as before the flaps.
 */
const wordCell = cva("text-board-amber", {
	variants: {
		size: {
			lg: "px-1.5 text-[33px] [--flap-h:55px]",
			md: "px-1 text-[22px] [--flap-h:33px]",
		},
	},
	defaultVariants: {
		size: "md",
	},
});

/**
 * A word with one flap for each letter, as on a departure board.
 *
 * The flaps turn at the load, through the drum of the letters. A board of
 * Solari shows its name in the same way: the board starts at the empty position
 * and it turns until each letter arrives. Refer to paragraph 5.6 of
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
					<SplitFlapCell
						key={cell.position}
						char={cell.char}
						index={cell.position}
						moves={true}
						className={wordCell({ size })}
					/>
				))}
			</span>
		</span>
	);
}
