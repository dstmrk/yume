/**
 * The logic of the page of the administrator. Paragraph 4.8 of
 * `docs/architecture.md` gives the rules.
 */

import type { AccountTier } from "../../shared/tier.ts";

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

/** The filter of the level: one level, or each level. */
export type TierFilter = "all" | AccountTier;

/**
 * Keeps the users that match the text and the level.
 *
 * The text is a part of the email. The function ignores the case and the
 * spaces at the two ends. An empty text keeps each user.
 */
export function filterUsers<T extends { email: string; tier: AccountTier }>(
	users: readonly T[],
	query: string,
	tier: TierFilter,
): T[] {
	const text = query.trim().toLowerCase();
	return users.filter(
		(user) =>
			(tier === "all" || user.tier === tier) &&
			user.email.toLowerCase().includes(text),
	);
}

/** The quantity of rows of one page of the table. */
export const PAGE_SIZE = 20;

/**
 * Gives one page of a list, and the quantity of pages.
 *
 * A page outside the list gives the nearest page: a filter or a change of a
 * level can make the list shorter than the current page. An empty list has one
 * empty page.
 */
export function pageOf<T>(
	items: readonly T[],
	page: number,
	size: number = PAGE_SIZE,
): { items: T[]; page: number; pages: number } {
	const pages = Math.max(1, Math.ceil(items.length / size));
	const current = Math.min(Math.max(1, page), pages);
	const start = (current - 1) * size;
	return { items: items.slice(start, start + size), page: current, pages };
}
