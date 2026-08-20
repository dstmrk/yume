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

/**
 * The kind of the award chart of a programme.
 *
 * A `region` programme publishes a table of pairs of regions. A `distance`
 * programme publishes bands of distance, thus the calculation also needs the
 * position of each airport. A `dynamic` programme publishes no chart: the price
 * follows the demand of each day.
 *
 * Paragraph 3.1.1 of `docs/monetisation.md` gives the three kinds.
 */
export type ChartKind = "region" | "distance" | "dynamic";

/** A loyalty programme. The user has an account with a programme. */
export type Program = {
	readonly id: string;
	readonly currencyId: string;
	readonly code: string;
	readonly name: string;
	/** It is false when no source can send points to this programme. */
	readonly transferable: boolean;
	/**
	 * The kind of the award chart. It is null while no person read the official
	 * page of the programme.
	 *
	 * Null is not `dynamic`. The value `dynamic` is the result of an
	 * examination, and null is the absence of that examination. Thus no surface
	 * shows a state that no person can defend.
	 *
	 * The catalogue writes the value of each programme, also the null. The field
	 * is optional for a programme of a test, because the calculation of the
	 * potential miles reads no chart.
	 */
	readonly chartKind?: ChartKind | null;
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

/** The cabin of an award. */
export type Cabin = "economy" | "premium" | "business" | "first";

/**
 * The season of an award.
 *
 * The value `all` belongs to a programme with no calendar of the seasons. The
 * table `award_season` holds `peak` and `off-peak` only. Paragraph 3.1.2 of
 * `docs/monetisation.md` gives the rule.
 */
export type Season = "peak" | "off-peak" | "all";

/**
 * An award of a programme: the miles and the taxes for one route.
 *
 * The award refers to a programme, not to a currency. Six programmes use Avios,
 * and each one publishes its own chart.
 *
 * The zones hold the names of the chart of that programme. Thus the two values
 * have a meaning with `programId` only.
 *
 * An award is historical data, as a transfer rule. To change a quantity of
 * miles, write the date in `validTo` of the old award. Then add a new award.
 * A programme with the chart of the kind `dynamic` holds no award.
 */
export type Award = {
	readonly programId: string;
	readonly fromZone: string;
	readonly toZone: string;
	readonly cabin: Cabin;
	readonly season: Season;
	/** The miles of the award. It is more than 0. */
	readonly miles: number;
	/** The taxes and the charges, in cents. Refer to the rule of the integers. */
	readonly taxesCents: number;
	readonly validFrom: IsoDate;
	/** The last date of the award. It is null for an active award. */
	readonly validTo: IsoDate | null;
};

/** The current balance of one account of the user. */
export type AccountBalance = {
	readonly programId: string;
	readonly points: number;
};
