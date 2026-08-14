import { cn } from "../../lib/cn.ts";

/**
 * The letter Y of Departure Mono, as a path.
 *
 * The same path is in `public/icon.svg`, the file of the icon. Departure Mono
 * is a pixel font: the glyph is five rectangles on a grid, and it never
 * changes. The box is 512 units, as in that file, thus the mark of the
 * interface and the icon of the tab hold the same proportion.
 *
 * The path holds no text element. Thus the mark needs no font file at the load
 * of the page, and the letter of the board is present immediately.
 */
const Y_PATH =
	"M156 96V216H196V96ZM316 96V216H356V96ZM236 256V416H276V256ZM196 216V256H236V216ZM276 216V256H316V216Z";

/**
 * The mark of Yume: one flap of the departure board with the letter Y.
 *
 * The surface holds the utility `flap` of `styles/theme.css`. Thus the mark
 * takes the gradient, the seam and the radius of a real flap of the board, and
 * this file holds no colour.
 *
 * The mark is decoration: the name of the application is in the text near it.
 * Thus the element holds `aria-hidden` and a reader says the name one time.
 */
export function BrandMark({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"flap inline-flex shrink-0 items-center justify-center text-board-amber",
				className,
			)}
		>
			<svg aria-hidden="true" viewBox="0 0 512 512" className="size-full">
				<path fill="currentColor" d={Y_PATH} />
			</svg>
		</span>
	);
}
