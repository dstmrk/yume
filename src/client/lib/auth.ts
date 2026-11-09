/**
 * The message of an error of the authentication.
 *
 * The server holds no Italian text: it gives the field `code` of the error.
 * This file gives the message. Refer to the section Language rules in
 * `CLAUDE.md`.
 */

import type { Messages } from "../i18n/messages.ts";

/** The key of the text of each code that this application knows. */
const messages: Record<string, keyof Messages> = {
	INVITE_CODE_REQUIRED: "inviteRequiredError",
	INVITE_CODE_UNKNOWN: "inviteUnknownError",
	INVITE_CODE_EXPIRED: "inviteExpiredError",
	INVITE_CODE_USED: "inviteUsedError",
	INVALID_EMAIL_OR_PASSWORD: "signInError",
	USER_ALREADY_EXISTS: "emailInUseError",
	PASSWORD_TOO_SHORT: "passwordShortError",
};

/**
 * Gives the message of the code in the language of `t`. An unknown code gives
 * a general message.
 */
export function authMessage(code: string | undefined, t: Messages): string {
	const key = code === undefined ? undefined : messages[code];
	const message = key === undefined ? undefined : t[key];
	return typeof message === "string" ? message : t.authError;
}
