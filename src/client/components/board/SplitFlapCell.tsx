import type { CSSProperties } from "react";
import { cn } from "../../lib/cn.ts";
import { toFlapTurn } from "../../lib/flaps.ts";

/**
 * One position of the board, with the cards of its drum.
 *
 * A flap of Solari is a card with two halves. The board holds one card for each
 * character of the drum, and the cards fall one after the other until the
 * correct character arrives. Therefore this component gives one element for
 * each half of each card:
 *
 * - The two halves at rest are under the cards. The top half holds the final
 *   character, and the cards above it go away one after the other. The bottom
 *   half holds the empty position, and the cards cover it.
 * - Each card gives a top half with the character that goes away, and a bottom
 *   half with the character that arrives.
 *
 * `zIndex` makes the order of the cards. A card that falls early is above the
 * cards after it, thus each card shows the card below it. A bottom half that
 * arrives late is above the halves before it, thus the last half stays.
 *
 * `--flap-index` gives the place of the flap on the board, and `--flap-step`
 * gives the place of the card in the drum. The file `styles/theme.css` makes
 * the delay with those two values. The logic of the drum is in `lib/flaps.ts`.
 */
export function SplitFlapCell({
	char,
	index,
	moves,
	className,
}: {
	char: string;
	index: number;
	moves: boolean;
	className?: string;
}) {
	const turn = toFlapTurn(char, moves);

	return (
		<span
			className={cn("flap", className)}
			style={{ "--flap-index": index } as CSSProperties}
		>
			{/* The width of the housing comes from the character: the halves and the
			    cards are out of the flow. Departure Mono gives one width to each
			    character, thus each flap of one size holds the same width. */}
			<span className="invisible whitespace-pre">{char}</span>
			<span className="flap-half flap-half-top">
				<span className="flap-glyph top-0">{turn.top}</span>
			</span>
			<span className="flap-half flap-half-bottom">
				<span className="flap-glyph bottom-0">{turn.bottom}</span>
			</span>
			{turn.folds.map((fold) => (
				<span
					key={`top-${fold.step}`}
					className="flap-half flap-half-top flap-fold-top"
					style={
						{
							"--flap-step": fold.step,
							zIndex: turn.folds.length - fold.step,
						} as CSSProperties
					}
				>
					<span className="flap-glyph top-0">{fold.from}</span>
				</span>
			))}
			{turn.folds.map((fold) => (
				<span
					key={`bottom-${fold.step}`}
					className="flap-half flap-half-bottom flap-fold-bottom"
					style={
						{ "--flap-step": fold.step, zIndex: fold.step + 1 } as CSSProperties
					}
				>
					<span className="flap-glyph bottom-0">{fold.to}</span>
				</span>
			))}
		</span>
	);
}
