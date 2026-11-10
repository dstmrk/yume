/**
 * The operations that a route of the API and a tool of the MCP server share.
 *
 * A route and a tool must give the same result for the same request. Thus each
 * examination of a request is here, in one place, and the route and the tool
 * only change the result into their answer. Paragraph 4.7.3 of
 * `docs/architecture.md` gives the rule.
 *
 * The functions read the clock from a parameter. A test then gives a fixed
 * date, and the result does not change at midnight.
 */

import type { z } from "zod";
import { addSnapshotSchema, type PotentialResponse } from "../shared/api.ts";
import { DEFAULT_COUNTRY } from "../shared/catalogue.ts";
import { potentialMiles } from "../shared/potential.ts";
import type { Db } from "./db/index.ts";
import {
	addSnapshot,
	allCurrencies,
	allPrograms,
	allTransferRules,
	currentBalances,
	findAccount,
} from "./db/queries.ts";

/**
 * The date of `now`, in the ISO 8601 format.
 *
 * The date comes from the clock in UTC. Rome is one hour or two hours in front
 * of UTC. Therefore a rule that starts today enters the calculation some hours
 * late. No ratio changes at night, thus this difference is acceptable.
 */
export function today(now: Date): string {
	return now.toISOString().slice(0, 10);
}

/**
 * The latest date of a snapshot: the day after `now` in UTC.
 *
 * The current balance is the snapshot with the latest date. A snapshot of 2062
 * in place of 2026 then hides each later update for 36 years. The one day is
 * for the user in front of UTC: at 00:30 in Rome, UTC holds the day before.
 * An ISO 8601 date gives the order of the dates in a comparison of the text.
 */
export function latestObservedAt(now: Date): string {
	const date = new Date(now);
	date.setUTCDate(date.getUTCDate() + 1);
	return date.toISOString().slice(0, 10);
}

/** The result of `recordSnapshot`. Each error has the code of the API. */
export type SnapshotResult =
	| { ok: true; id: string }
	| { ok: false; error: "unknown_account" }
	| { ok: false; error: "invalid_body"; issues: z.core.$ZodIssue[] }
	| { ok: false; error: "future_date" };

/**
 * Adds a snapshot to an account of the user.
 *
 * The function examines the account first, then the body. An account of an
 * other user thus gives `unknown_account` with each body, and no answer says
 * that the account exists.
 */
export function recordSnapshot(
	db: Db,
	request: { userId: string; accountId: string; body: unknown; now: Date },
): SnapshotResult {
	const { userId, accountId, body, now } = request;
	if (findAccount(db, accountId, userId) === undefined) {
		return { ok: false, error: "unknown_account" };
	}
	const snapshot = addSnapshotSchema.safeParse(body);
	if (!snapshot.success) {
		return { ok: false, error: "invalid_body", issues: snapshot.error.issues };
	}
	if (snapshot.data.observedAt > latestObservedAt(now)) {
		return { ok: false, error: "future_date" };
	}
	return { ok: true, id: addSnapshot(db, { accountId, ...snapshot.data }) };
}

/**
 * The potential miles of each airline currency, at the date `at`.
 *
 * A flexible currency is a source, thus it has no potential. The caller must
 * not add the values of two currencies: the user cannot send the same points
 * to two currencies.
 *
 * The calculation uses the rules of `DEFAULT_COUNTRY`. The user selects no
 * country now. Paragraph 3.3.2 of `docs/architecture.md` gives the reason.
 */
export function potentialOf(
	db: Db,
	userId: string,
	at: string,
): PotentialResponse {
	const programs = allPrograms(db);
	const rules = allTransferRules(db);
	const balances = currentBalances(db, userId)
		.filter((row) => row.points !== null)
		.map((row) => ({ programId: row.programId, points: row.points ?? 0 }));

	const potential = allCurrencies(db)
		.filter((currency) => currency.kind === "airline")
		.map((currency) =>
			potentialMiles({
				currencyId: currency.id,
				balances,
				programs,
				rules,
				country: DEFAULT_COUNTRY,
				at,
			}),
		);

	return { at, potential };
}
