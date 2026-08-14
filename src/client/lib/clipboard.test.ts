import { describe, expect, it } from "vitest";
import { copyText } from "./clipboard.ts";

/** A clipboard that keeps the text of the last call. */
function goodClipboard() {
	const written: string[] = [];
	const clipboard = {
		writeText: async (text: string) => {
			written.push(text);
		},
	} as unknown as Clipboard;
	return { clipboard, written };
}

/** A clipboard that refuses the operation, as a browser with no permission. */
const badClipboard = {
	writeText: async () => {
		throw new Error("the browser refuses the operation");
	},
} as unknown as Clipboard;

describe("copyText", () => {
	it("gives true and writes the text", async () => {
		const { clipboard, written } = goodClipboard();
		expect(await copyText(clipboard, "un-link")).toBe(true);
		expect(written).toEqual(["un-link"]);
	});

	// The property is not available on a page with no TLS. The button must then
	// show no message of success.
	it("gives false when the browser has no clipboard", async () => {
		expect(await copyText(undefined, "un-link")).toBe(false);
	});

	it("gives false when the browser refuses the operation", async () => {
		expect(await copyText(badClipboard, "un-link")).toBe(false);
	});
});
