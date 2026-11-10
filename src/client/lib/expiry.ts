/**
 * The expiry lots of the form of a new balance.
 *
 * A lot is a quantity of points that expires at a date. The lots are not
 * necessary, and they can hold a part of the balance only. Paragraph 3.2.1 of
 * `docs/architecture.md` gives the model.
 */

import { type ExpiryLot, isoDateSchema } from "../../shared/api.ts";
import { parsePoints } from "./balance.ts";
import { formatPoints } from "./format.ts";

/** One row of the form, with the text that the user writes. */
export type LotDraft = { readonly points: string; readonly expiresOn: string };

/** The reason of the refusal of the rows. The client shows one message. */
export type LotError =
	| "incomplete"
	| "points"
	| "beforeDate"
	| "duplicate"
	| "aboveBalance";

export type ReadLots =
	| { readonly ok: true; readonly lots: ExpiryLot[] }
	| { readonly ok: false; readonly error: LotError };

/**
 * Reads the rows of the form into the lots of the request.
 *
 * A row with two empty fields is not a lot. The function examines the same
 * rules as `addSnapshotSchema` of `src/shared/api.ts`. Thus the form shows a
 * message and sends no request that the server refuses.
 */
export function readLots(
	drafts: readonly LotDraft[],
	balance: number,
	observedAt: string,
	intl: string,
): ReadLots {
	const lots: ExpiryLot[] = [];
	for (const draft of drafts) {
		const text = draft.points.trim();
		if (text === "" && draft.expiresOn === "") {
			continue;
		}
		if (text === "" || !isoDateSchema.safeParse(draft.expiresOn).success) {
			return { ok: false, error: "incomplete" };
		}
		const points = parsePoints(text, intl);
		if (points === null || points < 1) {
			return { ok: false, error: "points" };
		}
		if (draft.expiresOn < observedAt) {
			return { ok: false, error: "beforeDate" };
		}
		lots.push({ points, expiresOn: draft.expiresOn });
	}
	if (new Set(lots.map((lot) => lot.expiresOn)).size !== lots.length) {
		return { ok: false, error: "duplicate" };
	}
	if (lots.reduce((sum, lot) => sum + lot.points, 0) > balance) {
		return { ok: false, error: "aboveBalance" };
	}
	lots.sort((a, b) => (a.expiresOn < b.expiresOn ? -1 : 1));
	return { ok: true, lots };
}

/**
 * Gives the rows of the form from the lots of the current balance.
 *
 * The user then corrects the lots and does not write them again. A lot that
 * expires before today is not in the new balance, thus the form omits it.
 */
export function draftsOf(
	lots: readonly ExpiryLot[],
	today: string,
	intl: string,
): LotDraft[] {
	return lots
		.filter((lot) => !isExpired(lot.expiresOn, today))
		.map((lot) => ({
			points: formatPoints(lot.points, intl),
			expiresOn: lot.expiresOn,
		}));
}

/**
 * Gives true when the date of a lot is before today.
 *
 * Yume does not change the balance: the user reads the balance on the site of
 * the programme. The dashboard then asks for a new balance.
 */
export function isExpired(expiresOn: string, today: string): boolean {
	return expiresOn < today;
}
