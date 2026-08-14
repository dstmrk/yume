/**
 * The copy of a text with the clipboard of the browser.
 *
 * The panel of the invitations copies the link of a code. The caller gives the
 * clipboard as a parameter, thus a test gives an object of the test and the
 * project needs no `jsdom`. Refer to the section Rules for the user interface
 * in `CLAUDE.md`.
 */

/**
 * Copies a text. It gives true when the browser copied that text.
 *
 * The property `navigator.clipboard` is not available on a page with no TLS,
 * and the method also refuses the operation without a gesture of the person.
 * The button must then show no message of success: the field holds the full
 * link, and the person selects it.
 */
export async function copyText(
	clipboard: Clipboard | undefined,
	text: string,
): Promise<boolean> {
	if (clipboard === undefined) {
		return false;
	}
	try {
		await clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
