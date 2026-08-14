import { text } from "../../text.ts";
import { SplitFlapWord } from "./SplitFlapWord.tsx";

/**
 * The name of the application, with one flap for each letter.
 *
 * The dashboard and the access hold this title at the left: it is the masthead
 * of the application. The public page holds its own title, larger and at the
 * centre, because that title is the first surface that a visitor reads.
 *
 * The name is on the board, thus it holds the flaps of the board. The square
 * mark with the letter Y stays for a surface that asks for one square image:
 * the icon of the tab and the icon of the home screen.
 */
export function AppTitle() {
	return (
		<h1>
			<SplitFlapWord word={text.appName} size="md" />
		</h1>
	);
}
