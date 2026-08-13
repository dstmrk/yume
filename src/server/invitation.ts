/**
 * The examination of an invitation.
 *
 * Registration is possible only with an invitation. Paragraph 4 of
 * `docs/architecture.md` gives the rule. This function is pure and does no I/O,
 * thus a test gives each state without a database.
 */

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
