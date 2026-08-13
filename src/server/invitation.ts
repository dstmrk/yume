/**
 * The examination of an invitation.
 *
 * Registration is possible only with an invitation. Paragraph 4 of
 * `docs/architecture.md` gives the rule. This function is pure and does no I/O,
 * thus a test gives each state without a database.
 */

/**
 * The characters of a code.
 *
 * The alphabet holds no `I`, no `O`, no `0` and no `1`: a person reads a code
 * from a message and writes it in the form. The quantity is 32, thus one byte
 * gives 8 values for each character and no character is more frequent.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Gives a code with one character for each byte. */
export function makeCode(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

/** The state of a code at a moment. Only `valid` gives access to the sign-up. */
export type InvitationState = "valid" | "unknown" | "expired" | "used";

/**
 * Gives the state of an invitation at the moment `at`.
 *
 * The two dates are text in the ISO 8601 format. A date with no time is also
 * correct. A date that the function cannot read gives `expired`: a defect in
 * the data must not give access to the application.
 *
 * An invitation with a date of use stays `used`, also after the date of the
 * end. The user then reads the message of the correct cause.
 */
export function invitationState(
	invitation: { expiresAt: string; usedAt: string | null } | undefined,
	at: string,
): InvitationState {
	if (invitation === undefined) {
		return "unknown";
	}
	if (invitation.usedAt !== null) {
		return "used";
	}

	const end = Date.parse(invitation.expiresAt);
	const moment = Date.parse(at);
	if (Number.isNaN(end) || Number.isNaN(moment) || end <= moment) {
		return "expired";
	}
	return "valid";
}
