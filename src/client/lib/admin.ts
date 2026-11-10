/**
 * The logic of the page of the administrator. Paragraph 4.8 of
 * `docs/architecture.md` gives the rules.
 */

/** The window of the new users: 30 days of 24 hours. */
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The quantity of users and the quantity of new users of the last 30 days.
 *
 * A date that the function cannot read counts in the total only. A clock of the
 * server in front of the clock of the device gives a recent user.
 */
export function adminSummary(
	users: readonly { createdAt: string }[],
	now: Date,
): { total: number; recent: number } {
	const since = now.getTime() - RECENT_MS;
	const recent = users.filter((user) => {
		const at = Date.parse(user.createdAt);
		return !Number.isNaN(at) && at >= since;
	}).length;
	return { total: users.length, recent };
}

/**
 * The day in UTC of an instant of the ISO 8601 format, for `formatDate`.
 *
 * A value that the function cannot read gives the same text: a defect in the
 * data shows a value and stops no page.
 */
export function dayOf(instant: string): string {
	const at = Date.parse(instant);
	return Number.isNaN(at) ? instant : new Date(at).toISOString().slice(0, 10);
}
