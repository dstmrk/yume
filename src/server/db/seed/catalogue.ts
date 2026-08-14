/**
 * The catalogue of currencies, programmes and transfer rules.
 *
 * This file is the source of truth for the application data. Appendix 8 of
 * `docs/architecture.md` is only a summary.
 *
 * Rules for a change of this file:
 *
 * - Read the official page. Do not write a ratio from memory.
 * - Write the link of that page in a comment above the rule.
 * - Do not change a rule in its place. Write the date in `validTo` of the old
 *   rule. Then add a new rule with a new `validFrom`.
 * - Ask the user before you change a value here.
 *
 * The field `validFrom` holds the date of the examination of the official page.
 * The rule can be older, but no person examined it before that date.
 */

import type {
	Currency,
	Program,
	TransferRule,
} from "../../../shared/catalogue.ts";

/**
 * The date of the examination of a page. One constant holds one date, because a
 * rule keeps the date of its own source.
 */
const VERIFIED_ON = "2026-08-11";
const VERIFIED_ON_2 = "2026-08-12";

export const currencies: readonly Currency[] = [
	{
		id: "amex-mr",
		code: "MR",
		name: "Membership Rewards",
		kind: "flexible",
	},
	{ id: "revpoints", code: "REVP", name: "RevPoints", kind: "flexible" },
	{ id: "avios", code: "AVIOS", name: "Avios", kind: "airline" },
	{
		id: "flying-blue",
		code: "FB",
		name: "Flying Blue",
		kind: "airline",
	},
	{ id: "eurobonus", code: "EB", name: "EuroBonus", kind: "airline" },
	{ id: "asia-miles", code: "ASIA", name: "Asia Miles", kind: "airline" },
	{ id: "skymiles", code: "SKY", name: "SkyMiles", kind: "airline" },
	{ id: "krisflyer", code: "KF", name: "KrisFlyer", kind: "airline" },
	{ id: "skywards", code: "SKWD", name: "Skywards", kind: "airline" },
	{ id: "miles-and-smiles", code: "MS", name: "Miles&Smiles", kind: "airline" },
	{ id: "miles-and-bonus", code: "MB", name: "Miles+Bonus", kind: "airline" },
	{ id: "lifemiles", code: "LM", name: "LifeMiles", kind: "airline" },
	{ id: "sky-pearl", code: "SP", name: "Sky Pearl", kind: "airline" },
	{ id: "etihad-guest", code: "EG", name: "Etihad Guest", kind: "airline" },
	{ id: "saga-points", code: "SAGA", name: "Saga Points", kind: "airline" },
	{ id: "miles-and-go", code: "MG", name: "Miles&Go", kind: "airline" },
	{ id: "miles-and-more", code: "MM", name: "Miles & More", kind: "airline" },
];

/**
 * The field `name` is short, because the interface shows it on a telephone.
 * `American Express Membership Rewards` takes three lines on a small screen.
 * The field `code` holds the identity for a person who needs it.
 *
 * The name of a source holds the issuer only: `Amex` and `Revolut`. Each issuer
 * has one programme in the catalogue, therefore the name of the currency adds
 * no information. The two names are also parallel: one name with the currency
 * and one name without it read as an error.
 */
export const programs: readonly Program[] = [
	{
		id: "amex-mr",
		currencyId: "amex-mr",
		code: "AMEX_MR",
		name: "Amex",
		transferable: false,
	},
	{
		id: "revolut",
		currencyId: "revpoints",
		code: "REVOLUT",
		name: "Revolut",
		transferable: false,
	},
	{
		id: "ba-club",
		currencyId: "avios",
		code: "BA",
		name: "British Airways",
		transferable: true,
	},
	{
		id: "iberia-club",
		currencyId: "avios",
		code: "IB",
		name: "Iberia",
		transferable: true,
	},
	{
		id: "flying-blue",
		currencyId: "flying-blue",
		code: "FB",
		name: "Flying Blue",
		transferable: true,
	},
	{
		id: "sas",
		currencyId: "eurobonus",
		code: "SK",
		name: "SAS",
		transferable: true,
	},
	{
		id: "cathay",
		currencyId: "asia-miles",
		code: "CX",
		name: "Cathay",
		transferable: true,
	},
	{
		id: "delta",
		currencyId: "skymiles",
		code: "DL",
		name: "Delta",
		transferable: true,
	},
	{
		id: "singapore",
		currencyId: "krisflyer",
		code: "SQ",
		name: "Singapore",
		transferable: true,
	},
	// The six programmes of the Avios family. A member moves Avios between them
	// at no cost. Therefore the dashboard shows one card, not six.
	{
		id: "aer-lingus",
		currencyId: "avios",
		code: "EI",
		name: "Aer Lingus",
		transferable: true,
	},
	{
		id: "finnair",
		currencyId: "avios",
		code: "AY",
		name: "Finnair",
		transferable: true,
	},
	{
		id: "qatar",
		currencyId: "avios",
		code: "QR",
		name: "Qatar Airways",
		transferable: true,
	},
	{
		id: "vueling",
		currencyId: "avios",
		code: "VY",
		name: "Vueling",
		transferable: true,
	},
	{
		id: "emirates",
		currencyId: "skywards",
		code: "EK",
		name: "Emirates",
		transferable: true,
	},
	{
		id: "turkish",
		currencyId: "miles-and-smiles",
		code: "TK",
		name: "Turkish",
		transferable: true,
	},
	{
		id: "aegean",
		currencyId: "miles-and-bonus",
		code: "A3",
		name: "Aegean",
		transferable: true,
	},
	{
		id: "avianca",
		currencyId: "lifemiles",
		code: "AV",
		name: "Avianca",
		transferable: true,
	},
	{
		id: "china-southern",
		currencyId: "sky-pearl",
		code: "CZ",
		name: "China Southern",
		transferable: true,
	},
	{
		id: "etihad",
		currencyId: "etihad-guest",
		code: "EY",
		name: "Etihad",
		transferable: true,
	},
	{
		id: "icelandair",
		currencyId: "saga-points",
		code: "FI",
		name: "Icelandair",
		transferable: true,
	},
	{
		id: "tap",
		currencyId: "miles-and-go",
		code: "TP",
		name: "TAP",
		transferable: true,
	},
	// Miles & More is the programme of ITA Airways from 1 April 2026. Amex Italia
	// and Revolut send no points to it. The catalogue holds this programme,
	// because many Italian users have this balance. For these users, the answer
	// is clear: no source can increase it.
	{
		id: "miles-and-more",
		currencyId: "miles-and-more",
		code: "LH",
		name: "Miles & More",
		transferable: false,
	},
];

export const transferRules: readonly TransferRule[] = [
	{
		// "3 punti Membership Rewards = 2 Miglia Flying Blue",
		// "Trasferimento minimo richiesto 750 Punti",
		// "il trasferimento deve essere effettuato in blocchi o multipli di 3 punti"
		// Source: https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/Flying-Blue/flying-blue/AF02
		fromProgramId: "amex-mr",
		toProgramId: "flying-blue",
		ratioNum: 2,
		ratioDen: 3,
		minTransfer: 750,
		increment: 3,
		validFrom: VERIFIED_ON,
		validTo: null,
	},
	{
		// "5 punti Membership Rewards = 4 Avios", minimum "800 Punti",
		// "il trasferimento deve essere effettuato in blocchi o multipli di 400 punti"
		// Source: https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/British-Airways/award-cancelled-/BA-0001
		fromProgramId: "amex-mr",
		toProgramId: "ba-club",
		ratioNum: 4,
		ratioDen: 5,
		minTransfer: 800,
		increment: 400,
		validFrom: VERIFIED_ON,
		validTo: null,
	},
	{
		// "5 Punti Membership Rewards = 4 Avios", minimum 500 points,
		// "I punti devono essere trasferiti in blocchi da 500"
		// Source: https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/Iberia/Iberia-Plus/IBER-022
		fromProgramId: "amex-mr",
		toProgramId: "iberia-club",
		ratioNum: 4,
		ratioDen: 5,
		minTransfer: 500,
		increment: 500,
		validFrom: VERIFIED_ON,
		validTo: null,
	},
	{
		// "5 punti Membership Rewards = 4 EuroBonus punti",
		// "Trasferimento minimo richiesto 500 Punti",
		// "il trasferimento deve essere effettuato in blocchi o multipli di 500 punti"
		// Source: https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/SAS/award-cancelled-/SAS-01
		fromProgramId: "amex-mr",
		toProgramId: "sas",
		ratioNum: 4,
		ratioDen: 5,
		minTransfer: 500,
		increment: 500,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		// "5 punti Membership Rewards = 4 Cathay",
		// "Trasferimento minimo richiesto 1000 Punti",
		// "il trasferimento deve essere effettuato in blocchi o multipli di 500 punti"
		// Source: https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/Cathay-Pacific/asia-miles/CATH-01
		fromProgramId: "amex-mr",
		toProgramId: "cathay",
		ratioNum: 4,
		ratioDen: 5,
		minTransfer: 1000,
		increment: 500,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		// "3 punti Membership Rewards = 2 SkyMiles®",
		// "Trasferimento minimo richiesto 3 Punti",
		// "il trasferimento deve essere effettuato in blocchi o multipli di 3 punti"
		// Source: https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/Delta/delta-delta-skymiles/DL02
		fromProgramId: "amex-mr",
		toProgramId: "delta",
		ratioNum: 2,
		ratioDen: 3,
		minTransfer: 3,
		increment: 3,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		// "3 punti Membership Rewards = 2 Miglia KrisFlyer",
		// "Trasferimento minimo richiesto 1500 Punti",
		// "il trasferimento deve essere effettuato in blocchi o multipli di 300 punti"
		//
		// The step is 300, but the ratio needs a multiple of 3. Amex gives 200
		// miles for 300 points, thus the division is exact.
		// Source: https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/Singapore/singapore-krisflyer/SING-01
		fromProgramId: "amex-mr",
		toProgramId: "singapore",
		ratioNum: 2,
		ratioDen: 3,
		minTransfer: 1500,
		increment: 300,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		// 5 punti Membership Rewards = 2 Miglia Skywards. The minimum is 500
		// points, in blocks of 500.
		//
		// Amex Italia asks for an authentication on this page from 1 July 2026,
		// thus a machine cannot read it. The user read the page on 12 August 2026
		// and confirmed the ratio, the minimum and the block.
		//
		// The page gives two ratios: 5 : 4 for a Centurion card and 5 : 2 for each
		// other card. Yume holds no card of the user, therefore the catalogue keeps
		// the ratio of the other cards. A member with a Centurion card reads a
		// value that is below the real value.
		// Source: https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/Emirates/emirates-skywards/EK-02
		fromProgramId: "amex-mr",
		toProgramId: "emirates",
		ratioNum: 2,
		ratioDen: 5,
		minTransfer: 500,
		increment: 500,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		// British Airways gives the ratio: "convert Revpoints into Avios at a
		// conversion rate of 1:1". Revolut refuses a request from a machine, thus
		// the source is the page of the airline.
		// Source: https://www.britishairways.com/content/en/es/the-british-airways-club/avios/collecting-avios/lifestyle
		fromProgramId: "revolut",
		toProgramId: "ba-club",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON,
		validTo: null,
	},
	{
		// The ratio is 1 : 1, with the conditions of the route to Avios. Revolut
		// refuses a request from a machine. Therefore the user read this ratio in
		// the application on 11 August 2026 and confirmed it.
		//
		// Source: https://help.revolut.com/it-IT/help/revpoints/airline-miles/questions-airline-miles-faq3/
		fromProgramId: "revolut",
		toProgramId: "flying-blue",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON,
		validTo: null,
	},

	// The other 15 routes of Revolut.
	//
	// Revolut refuses a request from a machine: `help.revolut.com` and
	// `revolut.com` both give the status 403. Therefore the user read the list of
	// the partners in the application on 12 August 2026. The user confirmed the
	// ratio 1 : 1 of each programme, and the ratio 2 : 1 of Emirates and of
	// Singapore. The page of the airline is the source when that page gives the
	// ratio.
	//
	// The application accepts any quantity, thus the minimum and the step are 1.
	//
	// Source: https://help.revolut.com/it-IT/help/revpoints/airline-miles/questions-airline-miles-faq3/
	{
		fromProgramId: "revolut",
		toProgramId: "iberia-club",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "aer-lingus",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "finnair",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		// Qatar Airways gives the ratio: "Collect 1 Avios for every 1 RevPoint
		// that you choose to convert".
		// Source: https://www.qatarairways.com/en/Privilege-Club/offers/revolut-convert.html
		fromProgramId: "revolut",
		toProgramId: "qatar",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "vueling",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "sas",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "turkish",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "aegean",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "avianca",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "china-southern",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "etihad",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "icelandair",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "tap",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		// 2 RevPoints give 1 mile.
		fromProgramId: "revolut",
		toProgramId: "emirates",
		ratioNum: 1,
		ratioDen: 2,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
	{
		// 2 RevPoints give 1 mile.
		fromProgramId: "revolut",
		toProgramId: "singapore",
		ratioNum: 1,
		ratioDen: 2,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},
];
