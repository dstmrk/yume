import { text } from "../../text.ts";

/**
 * The heart of a card. The user marks a currency of interest.
 *
 * The button holds `aria-pressed`, thus the label stays the same in the two
 * states. The heart itself is not visible for a reader of the screen: the state
 * arrives from that attribute.
 *
 * The area of the tap is 44 pixels. The margin that is negative keeps the
 * height of the header of the panel.
 */
export function FavoriteHeart({
	favorite,
	onToggle,
}: {
	favorite: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={favorite}
			aria-label={text.favorite}
			onClick={onToggle}
			className="-my-3.5 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center"
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				className={
					favorite ? "h-5 w-5 text-board-amber" : "h-5 w-5 text-board-muted"
				}
				fill={favorite ? "currentColor" : "none"}
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
			</svg>
		</button>
	);
}
