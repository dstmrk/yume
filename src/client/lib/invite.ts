/**
 * The code of invitation that the link holds.
 *
 * The server writes the link of the setup in the log, and a user sends the link
 * of an invitation. The route `/signup` reads the parameter `code` with this
 * function, and the form starts with that value.
 */

/**
 * Gives the link of the sign-up with the code.
 *
 * The user sends this link to a person. The origin comes from the page, thus
 * the link holds the address of the installation.
 */
export function inviteLink(origin: string, code: string): string {
	return `${origin}/signup?code=${encodeURIComponent(code)}`;
}

/** Gives the code of the parameter `code`, or undefined. */
export function inviteCodeOf(
	search: Record<string, unknown>,
): string | undefined {
	const code = search.code;
	if (typeof code !== "string") {
		return undefined;
	}
	const clean = code.trim();
	return clean === "" ? undefined : clean;
}
