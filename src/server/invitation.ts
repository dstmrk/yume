/**
 * The rules of an invitation.
 *
 * Registration is possible only with an invitation. Paragraph 4 of
 * `docs/architecture.md` gives the rules. These functions do no I/O, thus a
 * test gives each state without a database.
 */

import type { InvitationState } from "../shared/api.ts";

/**
 * The characters of a code.
 *
 * The alphabet holds no `I`, no `O`, no `0` and no `1`: a person reads a code
 * from a message and writes it in the form. The quantity is 32, thus one byte
 * gives 8 values for each character and no character is more frequent.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** The quantity of characters of a code. */
const CODE_LENGTH = 10;

/** The quantity of invitations of one user. */
export const INVITATION_LIMIT = 2;

/** The time of validity of an invitation, in hours. */
const VALID_HOURS = 24;

/** Gives a code with one character for each byte. */
export function makeCode(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

/** Gives a new code from the generator of random values of the system. */
export function newCode(): string {
	return makeCode(crypto.getRandomValues(new Uint8Array(CODE_LENGTH)));
}

/**
 * Gives the moment of the end of an invitation that starts at `at`.
 *
 * The time is the same for each invitation. A short time keeps the risk of a
 * code in a message small, and an expired code gives its slot back.
 */
export function endOfValidity(at: string): string {
	return new Date(Date.parse(at) + VALID_HOURS * 60 * 60 * 1000).toISOString();
}

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
	invitation: { expiresAt: string; usedAt: string | null },
	at: string,
): InvitationState {
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

/**
 * Gives the quantity of slots that the invitations of one user hold.
 *
 * A user has `INVITATION_LIMIT` slots. An invitation that a person used holds
 * its slot forever, thus one user brings a maximum of two users. An invitation
 * that expired with no use gives its slot back.
 */
export function heldSlots(
	invitations: readonly { expiresAt: string; usedAt: string | null }[],
	at: string,
): number {
	return invitations.filter((one) => invitationState(one, at) !== "expired")
		.length;
}
