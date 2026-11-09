import { describe, expect, it } from "vitest";
import { it as text } from "../i18n/it.ts";
import { authMessage } from "./auth.ts";

describe("authMessage", () => {
	it("gives the message of an invitation that no row has", () => {
		expect(authMessage("INVITE_CODE_UNKNOWN", text)).toBe(
			text.inviteUnknownError,
		);
	});

	it("gives the message of an invitation that is used", () => {
		expect(authMessage("INVITE_CODE_USED", text)).toBe(text.inviteUsedError);
	});

	it("gives the message of a sign-in that is not correct", () => {
		expect(authMessage("INVALID_EMAIL_OR_PASSWORD", text)).toBe(
			text.signInError,
		);
	});

	it("gives the message of an address that an other user has", () => {
		expect(authMessage("USER_ALREADY_EXISTS", text)).toBe(text.emailInUseError);
	});

	// Better Auth gives many codes. The user reads one message for each code
	// that this application knows, and one general message for the others.
	it("gives the general message for a code that this file does not know", () => {
		expect(authMessage("SOME_OTHER_CODE", text)).toBe(text.authError);
	});

	it("gives the general message with no code", () => {
		expect(authMessage(undefined, text)).toBe(text.authError);
	});
});
