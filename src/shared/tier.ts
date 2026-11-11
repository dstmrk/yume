/**
 * The level of the account of a user. Paragraph 4.6 of
 * `docs/architecture.md` gives the decision.
 *
 * The database keeps no level. It keeps two sources, and this function gives
 * the level from them:
 *
 * - `supporterUntil`: the end of the supporter account. Only the payment
 *   writes it.
 * - `unlimited`: a flag that the administrator writes by hand. It gives each
 *   function of the supporter account with no payment.
 *
 * The payment thus cannot remove an unlimited account. This function is pure:
 * the caller gives the clock.
 */

import type { Currency, CurrencyKind, Program } from "./catalogue.ts";

export type AccountTier = "free" | "supporter" | "unlimited";

/** The fields of the table `user` that give the level. */
export type TierSource = {
	readonly supporterUntil: Date | null;
	readonly unlimited: boolean;
};

/**
 * Gives the level of the account at the instant `now`.
 *
 * The supporter account stops at `supporterUntil`: at that exact instant the
 * level is free.
 */
export function accountTier(source: TierSource, now: Date): AccountTier {
	if (source.unlimited) return "unlimited";
	if (
		source.supporterUntil !== null &&
		now.getTime() < source.supporterUntil.getTime()
	) {
		return "supporter";
	}
	return "free";
}

/**
 * The sources that the free account holds with no limit. The affiliate links
 * of Yume go to these two sources, thus a limit stops the users that those
 * links bring. This list is a rule of the payment, not a fact of the
 * programme. Thus the catalogue does not hold it. Paragraph 4.6.
 */
export const FREE_SOURCES: ReadonlySet<string> = new Set([
	"amex-mr",
	"revolut",
]);

/** The quantity of airline programmes of the free account. */
export const FREE_AIRLINE_PROGRAMS = 2;

/** The level of the account and the state of the limits of the instance. */
export type Entitlement = {
	/** The value of `FREE_ACCOUNT_LIMITS`. False on a self-hosted installation. */
	readonly limits: boolean;
	readonly tier: AccountTier;
};

/** The parts of the catalogue that the limits read. */
export type TierCatalogue = {
	readonly programs: readonly Program[];
	readonly currencies: readonly Currency[];
};

/**
 * Examines if the user can add an account in a programme.
 *
 * The function examines a new account only. The end of a supporter account
 * removes nothing: an account above the limit stays, and its balance stays in
 * the potential miles. A programme that is not in the catalogue gives false.
 *
 * The limit counts the programmes, not the currencies: the British Airways
 * Club and Iberia Club use two places. A second account in a programme that
 * the user holds uses no new place.
 */
export function canAddAccount(input: {
	readonly entitlement: Entitlement;
	readonly programId: string;
	/** The programme of each account of the user. A programme can repeat. */
	readonly accountProgramIds: readonly string[];
	readonly catalogue: TierCatalogue;
}): boolean {
	const { entitlement, programId, accountProgramIds, catalogue } = input;
	const kinds = new Map(
		catalogue.currencies.map((currency) => [currency.id, currency.kind]),
	);
	const kindOf = (id: string): CurrencyKind | undefined => {
		const program = catalogue.programs.find((item) => item.id === id);
		return program && kinds.get(program.currencyId);
	};

	const kind = kindOf(programId);
	if (kind === undefined) return false;
	if (!entitlement.limits || entitlement.tier !== "free") return true;
	if (FREE_SOURCES.has(programId)) return true;
	if (kind !== "airline") return false;

	const airlines = new Set(
		accountProgramIds.filter((id) => kindOf(id) === "airline"),
	);
	return airlines.has(programId) || airlines.size < FREE_AIRLINE_PROGRAMS;
}

/**
 * Examines if the user can write the expiry lots of a new snapshot. The lots of
 * the current balance stay on the dashboard in each case. Paragraph 3.2.1.
 */
export function canWriteExpiryLots(entitlement: Entitlement): boolean {
	return !entitlement.limits || entitlement.tier !== "free";
}

/**
 * Examines if the user can call the tools of the MCP server. The sign-in and
 * the list of the tools stay open to each user: a tool gives the error, and
 * the agent shows it. Paragraph 4.7.2 of `docs/architecture.md`.
 */
export function canUseMcp(entitlement: Entitlement): boolean {
	return !entitlement.limits || entitlement.tier !== "free";
}

/**
 * Reads the variable `FREE_ACCOUNT_LIMITS`. No value gives false: a
 * self-hosted installation keeps each function.
 *
 * Each value other than `true` and `false` gives an error. A defect in the
 * variable of the official instance otherwise opens each function to each
 * user, and no message tells that to the administrator.
 */
export function parseFreeAccountLimits(value: string | undefined): boolean {
	if (value === undefined || value === "" || value === "false") return false;
	if (value === "true") return true;
	throw new Error(
		`FREE_ACCOUNT_LIMITS holds ${JSON.stringify(value)}. Write true or false.`,
	);
}
