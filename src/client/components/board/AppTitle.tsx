import { text } from "../../text.ts";

/**
 * The name of the application, in the font of the board.
 *
 * The dashboard and the access hold this title at the left: it is the masthead
 * of the application. The public page holds its own title, larger and at the
 * centre, because that title is the first surface that a visitor reads.
 */
export function AppTitle() {
	return (
		<h1 className="font-board text-[22px] text-board-amber tracking-widest">
			{text.appName.toUpperCase()}
		</h1>
	);
}
