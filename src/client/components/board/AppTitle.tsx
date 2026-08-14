import { text } from "../../text.ts";
import { BrandMark } from "./BrandMark.tsx";

/**
 * The name of the application, in the font of the board, after the mark.
 *
 * The dashboard and the access hold this title at the left: it is the masthead
 * of the application. The public page holds its own title, larger and at the
 * centre, because that title is the first surface that a visitor reads.
 *
 * The mark holds the size of the text, thus the two hold the same line.
 */
export function AppTitle() {
	return (
		<h1 className="flex items-center gap-2 font-board text-[22px] text-board-amber tracking-widest">
			<BrandMark className="size-[22px]" />
			{text.appName.toUpperCase()}
		</h1>
	);
}
