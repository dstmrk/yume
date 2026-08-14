/**
 * The shapes of the catalogue.
 *
 * The catalogue holds application data, not user data. The seed file in
 * `src/server/db/seed/` holds the values. This file holds the types, because
 * the client and the server both use them.
 */

/**
 * A date in the ISO 8601 format, for example `2026-08-11`.
 *
 * All the dates use the same format. Thus a comparison of two strings gives the
 * same result as a comparison of two dates.
 */
export type IsoDate = string;

/**
 * A country in the ISO 3166-1 alpha-2 format, for example `IT`.
 *
 * A transfer rule applies to one country. Amex Italia and Amex France give
 * different partners and different ratios for the same pair of programmes.
 */
export type CountryCode = string;

/**
 * The country of the rules that the application uses.
 *
 * The catalogue holds the rules of Italy only, and no surface selects a
 * country. A second country in the catalogue needs a country of the user.
 */
export const DEFAULT_COUNTRY: CountryCode = "IT";

/**
 * The kind of a currency.
 *
 * A `flexible` currency is a source. Amex Membership Rewards and Revolut
 * RevPoints are flexible currencies.
 */
export type CurrencyKind = "airline" | "flexible" | "hotel" | "rail";

/**
 * A currency of points or of miles.
 *
 * More than one programme can use one currency. Six programmes use Avios. The
 * calculation of the potential uses the currency, not the programme. If it uses
 * the programme, it counts the same balance six times.
 */
export type Currency = {
	readonly id: string;
	readonly code: string;
	readonly name: string;
	readonly kind: CurrencyKind;
};

/** A loyalty programme. The user has an account with a programme. */
export type Program = {
	readonly id: string;
	readonly currencyId: string;
	readonly code: string;
	readonly name: string;
	/** It is false when no source can send points to this programme. */
	readonly transferable: boolean;
};

/**
 * A rule for a transfer from one programme to one other programme.
 *
 * The ratio is two integers. `ratioNum` is the quantity of target points and
 * `ratioDen` is the quantity of source points. Amex gives 4 Avios for 5
 * Membership Rewards points. Thus `ratioNum` is 4 and `ratioDen` is 5.
 *
 * The rule refers to two programmes, because the minimum quantity and the step
 * belong to the pair of programmes. Paragraph 3.3.1 of `docs/architecture.md`
 * gives the reason.
 *
 * The rule also refers to one country. Paragraph 3.3.2 gives the reason.
 *
 * A rule is historical data. To change a ratio, write the date in `validTo` of
 * the old rule. Then add a new rule.
 */
export type TransferRule = {
	readonly fromProgramId: string;
	readonly toProgramId: string;
	/**
	 * The country of the rule. Each rule holds a country: a rule without a
	 * country does not exist.
	 */
	readonly country: CountryCode;
	/** The quantity of target points. It is more than 0. */
	readonly ratioNum: number;
	/** The quantity of source points. It is more than 0. */
	readonly ratioDen: number;
	/** The smallest transfer that the programme accepts. */
	readonly minTransfer: number;
	/** The step of the transfer. It is 1 or more. */
	readonly increment: number;
	readonly validFrom: IsoDate;
	/** The last date of the rule. It is null for an active rule. */
	readonly validTo: IsoDate | null;
};

/** The current balance of one account of the user. */
export type AccountBalance = {
	readonly programId: string;
	readonly points: number;
};
