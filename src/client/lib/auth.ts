/**
 * The message of an error of the authentication.
 *
 * The server holds no Italian text: it gives the field `code` of the error.
 * This file gives the message. Refer to the section Language rules in
 * `CLAUDE.md`.
 */

import { text } from "../text.ts";

/** The message of each code that this application knows. */
const messages: Record<string, string> = {
	INVITE_CODE_REQUIRED: text.inviteRequiredError,
	INVITE_CODE_UNKNOWN: text.inviteUnknownError,
	INVITE_CODE_EXPIRED: text.inviteExpiredError,
	INVITE_CODE_USED: text.inviteUsedError,
	INVALID_EMAIL_OR_PASSWORD: text.signInError,
	USER_ALREADY_EXISTS: text.emailInUseError,
	PASSWORD_TOO_SHORT: text.passwordShortError,
};

/** Gives the message of the code. An unknown code gives a general message. */
export function authMessage(code: string | undefined): string {
	return (code === undefined ? undefined : messages[code]) ?? text.authError;
}
