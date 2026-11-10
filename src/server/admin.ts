/**
 * The administrator of the official instance.
 *
 * The variable `ADMIN_EMAIL` holds the email address of one person. The
 * database holds no role: a defect that writes the table `user` then cannot
 * make an administrator. With no value, the installation has no administrator.
 * Paragraph 4.8 of `docs/architecture.md` gives the decision.
 */

/** The fields of the user of the session that this function reads. */
export type AdminCandidate = {
	readonly email: string;
	readonly emailVerified: boolean;
};

/**
 * Examines if the user of the session is the administrator.
 *
 * The comparison ignores the case and the spaces at the two ends. The address
 * must be verified: Google verifies it, and a future provider can give an
 * address that no one verified.
 */
export function isAdmin(
	user: AdminCandidate,
	adminEmail: string | undefined,
): boolean {
	const expected = adminEmail?.trim().toLowerCase() ?? "";
	if (expected === "" || !user.emailVerified) {
		return false;
	}
	return user.email.trim().toLowerCase() === expected;
}
