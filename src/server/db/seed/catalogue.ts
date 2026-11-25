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
 * - Do not change a rule in its place. Write the date of the change in
 *   `validTo` of the old rule. Then add a new rule with `validFrom` on that
 *   date. The test of the catalogue refuses a gap and an overlap.
 * - Read the official page of the country of the rule. Amex Italia and Amex
 *   France give different partners and different ratios.
 * - Ask the user before you change a value here.
 *
 * The field `validFrom` holds the date of the examination of the official page.
 * The rule can be older, but no person examined it before that date.
 *
 * The field `country` holds a country in the ISO 3166-1 alpha-2 format. A rule
 * applies to one country only: Italy or Spain. Each country writes its own
 * rules, also when the ratio is the same. Paragraph 3.3.2 of
 * `docs/architecture.md` gives the reason.
 */

import type {
	Currency,
	HouseholdPool,
	Program,
	TransferRule,
} from "../../../shared/catalogue.ts";

/**
 * The date of the examination of a page. One constant holds one date, because a
 * rule keeps the date of its own source.
 */
const VERIFIED_ON = "2026-08-11";
const VERIFIED_ON_2 = "2026-08-12";
const VERIFIED_ON_3 = "2026-10-06";
const VERIFIED_ON_ES = "2026-11-16";
const VERIFIED_ON_4 = "2026-11-16";
const VERIFIED_ON_HOUSEHOLD = "2026-11-24";

export const currencies: readonly Currency[] = [
	{
		id: "amex-mr",
		code: "MR",
		name: "Membership Rewards",
		kind: "flexible",
	},
	{ id: "revpoints", code: "REVP", name: "RevPoints", kind: "flexible" },
	{
		id: "klarna-cashback",
		code: "KLARNA",
		name: "Klarna Cashback",
		kind: "flexible",
	},
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
	{ id: "suma", code: "SUMA", name: "SUMA", kind: "airline" },
	{ id: "miles-and-more", code: "MM", name: "Miles & More", kind: "airline" },
	{ id: "mileageplus", code: "MP", name: "MileagePlus", kind: "airline" },
	{
		id: "royal-orchid-plus",
		code: "ROP",
		name: "Royal Orchid Plus",
		kind: "airline",
	},
	{ id: "skypass", code: "SKP", name: "SKYPASS", kind: "airline" },
	{
		id: "ana-mileage-club",
		code: "AMC",
		name: "ANA Mileage Club",
		kind: "airline",
	},
	{
		id: "jal-mileage-bank",
		code: "JMB",
		name: "JAL Mileage Bank",
		kind: "airline",
	},
	{ id: "qantas-points", code: "QFF", name: "Qantas Points", kind: "airline" },
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
		id: "klarna",
		currencyId: "klarna-cashback",
		code: "KLARNA",
		name: "Klarna",
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
	// Amex Spain is the only source of Air Europa SUMA.
	{
		id: "air-europa",
		currencyId: "suma",
		code: "UX",
		name: "Air Europa",
		transferable: true,
	},
	// Klarna is the only source of these two programmes.
	{
		id: "united",
		currencyId: "mileageplus",
		code: "UA",
		name: "United",
		transferable: true,
	},
	{
		id: "thai",
		currencyId: "royal-orchid-plus",
		code: "TG",
		name: "Thai",
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
	// Amex Italia, Revolut and Klarna send no points to these four programmes.
	// The catalogue holds them for the users who have this balance. No source
	// can increase it.
	{
		id: "korean-air",
		currencyId: "skypass",
		code: "KE",
		name: "Korean Air",
		transferable: false,
	},
	{
		id: "ana",
		currencyId: "ana-mileage-club",
		code: "NH",
		name: "ANA",
		transferable: false,
	},
	{
		id: "jal",
		currencyId: "jal-mileage-bank",
		code: "JL",
		name: "JAL",
		transferable: false,
	},
	{
		id: "qantas",
		currencyId: "qantas-points",
		code: "QF",
		name: "Qantas",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
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
		country: "IT",
		ratioNum: 1,
		ratioDen: 2,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_2,
		validTo: null,
	},

	// The routes of Klarna. Klarna converts the cashback of a member into the
	// points of a partner. The plan of the member changes the expiry of the
	// cashback, not the ratio.
	//
	// Klarna refuses a request from a machine: each domain gives the status 403.
	// Therefore the user read the list of the partners on 6 October 2026. The
	// page gives each ratio for 100 points of cashback, with two decimals. The
	// catalogue keeps that ratio as two integers over 10 000 points.
	//
	// The page gives no minimum and no step. The user thinks that the step is
	// 100 points, thus the minimum and the step are 100. That value is the safe
	// choice: a smaller step can give a value that is too high.
	//
	// The hotel partners, GHA and Spenn are not in the catalogue.
	//
	// Source: https://www.klarna.com/it/abbonamento/max/
	{
		// "80,02 Avios ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "ba-club",
		country: "IT",
		ratioNum: 8002,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_3,
		validTo: VERIFIED_ON_4,
	},
	{
		// "80,02 Avios ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "iberia-club",
		country: "IT",
		ratioNum: 8002,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_3,
		validTo: VERIFIED_ON_4,
	},
	{
		// "80,02 Avios ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "vueling",
		country: "IT",
		ratioNum: 8002,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_3,
		validTo: VERIFIED_ON_4,
	},
	{
		// "80,02 Avios ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "aer-lingus",
		country: "IT",
		ratioNum: 8002,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_3,
		validTo: VERIFIED_ON_4,
	},
	{
		// "101,43 Avios ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "finnair",
		country: "IT",
		ratioNum: 10143,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_3,
		validTo: VERIFIED_ON_4,
	},
	{
		// "80,02 Miglia Flying Blue ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "flying-blue",
		country: "IT",
		ratioNum: 8002,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_3,
		validTo: VERIFIED_ON_4,
	},
	{
		// "80,02 miglia ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "turkish",
		country: "IT",
		ratioNum: 8002,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_3,
		validTo: VERIFIED_ON_4,
	},
	{
		// "132,24 punti SAS EuroBonus ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "sas",
		country: "IT",
		ratioNum: 13224,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_3,
		validTo: VERIFIED_ON_4,
	},
	{
		// "80,02 Lifemiles ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "avianca",
		country: "IT",
		ratioNum: 8002,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_3,
		validTo: VERIFIED_ON_4,
	},
	{
		// "80,02 miglia ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "united",
		country: "IT",
		ratioNum: 8002,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_3,
		validTo: VERIFIED_ON_4,
	},
	{
		// "101,43 Royal Orchid Plus miles ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "thai",
		country: "IT",
		ratioNum: 10143,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_3,
		validTo: VERIFIED_ON_4,
	},

	// Klarna Italy lowered the ratios. Two agents read the page on 16 November
	// 2026 and gave the same values for ten partners. The rules of 6 October
	// 2026 above are closed on that date. The page still gives no minimum and
	// no step, thus the minimum and the step stay 100.
	//
	// For SAS EuroBonus the two reads gave 130,59 and 130,71. A third read gave
	// 130,71. The user selected 130,71.
	//
	// Source: https://www.klarna.com/it/abbonamento/max/
	{
		// "78,17 Avios ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "ba-club",
		country: "IT",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_4,
		validTo: null,
	},
	{
		// "78,17 Avios ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "iberia-club",
		country: "IT",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_4,
		validTo: null,
	},
	{
		// "78,17 Avios ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "vueling",
		country: "IT",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_4,
		validTo: null,
	},
	{
		// "78,17 Avios ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "aer-lingus",
		country: "IT",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_4,
		validTo: null,
	},
	{
		// "99,09 Avios ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "finnair",
		country: "IT",
		ratioNum: 9909,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_4,
		validTo: null,
	},
	{
		// "78,17 Miglia Flying Blue® ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "flying-blue",
		country: "IT",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_4,
		validTo: null,
	},
	{
		// "78,17 miglia ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "turkish",
		country: "IT",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_4,
		validTo: null,
	},
	{
		// "78,17 Lifemiles ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "avianca",
		country: "IT",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_4,
		validTo: null,
	},
	{
		// "78,17 miglia ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "united",
		country: "IT",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_4,
		validTo: null,
	},
	{
		// "99,09 Royal Orchid Plus miles ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "thai",
		country: "IT",
		ratioNum: 9909,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_4,
		validTo: null,
	},
	{
		// "130,71 punti SAS EuroBonus ogni 100 punti cashback"
		fromProgramId: "klarna",
		toProgramId: "sas",
		country: "IT",
		ratioNum: 13071,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_4,
		validTo: null,
	},

	// The rules of Spain. Two agents read each page on 16 November 2026 and gave
	// the same values. The pull request of the country holds the record.
	//
	// Amex Spain lists six airline partners on
	// https://www.americanexpress.com/es-es/rewards/membership-rewards/travel/all
	// Emirates is not in the list: "la opción de transferir puntos Membership
	// Rewards a Emirates Skywards no estará disponible hasta nuevo aviso". The
	// hotel partners and Más Renfe are not in the catalogue.
	{
		// "1 punto Membership Rewards = 1 Milla Flying Blue", minimum 500 points,
		// step 5
		// Source: https://www.americanexpress.com/es-es/rewards/membership-rewards/partner/Flying-Blue/flying-blue/AF02
		fromProgramId: "amex-mr",
		toProgramId: "flying-blue",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 500,
		increment: 5,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "3 puntos Membership Rewards = 2 SkyMiles®", minimum 3 points, step 3
		// Source: https://www.americanexpress.com/es-es/rewards/membership-rewards/partner/Delta/delta-delta-skymiles/DL02
		fromProgramId: "amex-mr",
		toProgramId: "delta",
		country: "ES",
		ratioNum: 2,
		ratioDen: 3,
		minTransfer: 3,
		increment: 3,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "5 puntos Membership Rewards = 4 puntos EuroBonus", minimum 1000 points,
		// step 500
		// Source: https://www.americanexpress.com/es-es/rewards/membership-rewards/partner/SAS/award-cancelled-/SAS-01
		fromProgramId: "amex-mr",
		toProgramId: "sas",
		country: "ES",
		ratioNum: 4,
		ratioDen: 5,
		minTransfer: 1000,
		increment: 500,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "1 punto Membership Rewards = 1 Avios",
		// "Se requiere un mínimo de 50 puntos Membership Rewards [...] en
		// incrementos de 1 puntos Membership Rewards"
		// Source: https://www.americanexpress.com/es-es/rewards/membership-rewards/partner/CLUB-IBERIA-PLUS/IberiaRT-Plus/IBERT
		fromProgramId: "amex-mr",
		toProgramId: "iberia-club",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 50,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "1 Punto Membership Rewards = 1 Avios",
		// "Se requiere un mínimo de 250 puntos Membership Rewards [...] en
		// incrementos de 1 puntos Membership Rewards"
		// Source: https://www.americanexpress.com/es-es/rewards/membership-rewards/partner/British-Airways-EC/British-Airways-EC/BART-001
		fromProgramId: "amex-mr",
		toProgramId: "ba-club",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 250,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "1 puntos Membership Rewards = 1 Millas SUMA",
		// "Se requiere un mínimo de 1 puntos Membership Rewards [...] en
		// incrementos de 1 puntos Membership Rewards"
		// Source: https://www.americanexpress.com/es-es/rewards/membership-rewards/partner/AIR-EUROPA-SUMA/AIR-EUROPA-SUMA/AIRE-001
		fromProgramId: "amex-mr",
		toProgramId: "air-europa",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},

	// The routes of Revolut Spain.
	//
	// The page of Spain gives no ratio for each partner: "con una proporción de
	// hasta 1:1, según el partner", and "un mínimo de 1 y un máximo de 999,999
	// puntos por transacción". The application holds the full list. Thus the
	// user decided on 16 November 2026 to copy the 17 rules of Italy to Spain
	// for now. Examine these rules again with an account of Revolut Spain.
	//
	// The page of the partners of Spain names nine programmes: Flying Blue,
	// British Airways, Iberia, Aer Lingus, Vueling, Qatar, Finnair, Turkish and
	// TAP. The other eight routes come from the list of Italy only.
	//
	// Source: https://help.revolut.com/es-ES/help/revpoints/airline-miles/questions-airline-miles-faq3/
	// Source: https://help.revolut.com/es-ES/help/revpoints/airline-miles/question-what-are-airline-miles/
	{
		fromProgramId: "revolut",
		toProgramId: "ba-club",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "flying-blue",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "iberia-club",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "aer-lingus",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "finnair",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "qatar",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "vueling",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "sas",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "turkish",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "aegean",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "avianca",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "china-southern",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "etihad",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "icelandair",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "tap",
		country: "ES",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "emirates",
		country: "ES",
		ratioNum: 1,
		ratioDen: 2,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		fromProgramId: "revolut",
		toProgramId: "singapore",
		country: "ES",
		ratioNum: 1,
		ratioDen: 2,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},

	// The routes of Klarna Spain. The page gives each ratio for 100 points of
	// cashback, with two decimals, as the page of Italy. The catalogue keeps
	// that ratio as two integers over 10 000 points. The page also says: "Las
	// tasas de conversión dependen de tu país y moneda".
	//
	// The page gives no minimum and no step. The user confirmed on 16 November
	// 2026 the value of Italy: 100 points, the safe choice.
	//
	// The hotel partners, GHA and Spenn are not in the catalogue.
	//
	// Source: https://www.klarna.com/es/suscripcion/max/
	{
		// "78,17 Avios por cada 100 puntos de cashback"
		fromProgramId: "klarna",
		toProgramId: "iberia-club",
		country: "ES",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "78,17 Avios por cada 100 puntos de cashback"
		fromProgramId: "klarna",
		toProgramId: "vueling",
		country: "ES",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "78,17 Avios por cada 100 puntos de cashback"
		fromProgramId: "klarna",
		toProgramId: "ba-club",
		country: "ES",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "78,17 Avios por cada 100 puntos de cashback"
		fromProgramId: "klarna",
		toProgramId: "aer-lingus",
		country: "ES",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "99,09 Avios por cada 100 puntos de cashback"
		fromProgramId: "klarna",
		toProgramId: "finnair",
		country: "ES",
		ratioNum: 9909,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "78,17 millas Flying Blue® por cada 100 puntos de cashback"
		fromProgramId: "klarna",
		toProgramId: "flying-blue",
		country: "ES",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "78,17 millas por cada 100 puntos de cashback"
		fromProgramId: "klarna",
		toProgramId: "turkish",
		country: "ES",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "78,17 millas por cada 100 puntos de cashback"
		fromProgramId: "klarna",
		toProgramId: "united",
		country: "ES",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "130,59 puntos SAS EuroBonus por cada 100 puntos de cashback"
		fromProgramId: "klarna",
		toProgramId: "sas",
		country: "ES",
		ratioNum: 13059,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "99,09 Royal Orchid Plus miles por cada 100 puntos de cashback"
		fromProgramId: "klarna",
		toProgramId: "thai",
		country: "ES",
		ratioNum: 9909,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
	{
		// "78,17 Lifemiles por cada 100 puntos de cashback"
		fromProgramId: "klarna",
		toProgramId: "avianca",
		country: "ES",
		ratioNum: 7817,
		ratioDen: 10000,
		minTransfer: 100,
		increment: 100,
		validFrom: VERIFIED_ON_ES,
		validTo: null,
	},
];

/**
 * The programmes that let the members of one household pool their miles into
 * one balance. Paragraph 4.10 of `docs/architecture.md` gives the rules.
 *
 * The rules of a transfer rule apply: read the official page of the country,
 * write the link and the text above the row, and close a pool with `validTo`.
 * Do not remove a row. A programme with no row has no pool, and the household
 * then shows no total for its currency.
 */
// The pools below ANA come from one read of the official pages in the
// browser of the user on 2026-11-24. The user accepted one read in place of
// two (2026-11-25).
export const HOUSEHOLD_POOLS: readonly HouseholdPool[] = [
	{
		// "AFA is a service for members who live outside Japan which allows you
		// to combine the miles earned by your family, and to redeem awards"
		// 2 to 8 members, a fee of 1,000 miles, the primary member redeems.
		// Source: https://www.ana.co.jp/en/it/amc/amc-family-account-service/
		programId: "ana",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// The same text as the page of Italy.
		// Source: https://www.ana.co.jp/en/es/amc/amc-family-account-service/
		programId: "ana",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "La creazione del Conto Collettivo è gratuita e offre l'opportunità di
		// condividere gli Avios con massimo sei persone"
		// Conto Collettivo. Free, up to 6 people.
		// Source: https://www.britishairways.com/content/it/it/the-british-airways-club/about-the-club/household-accounts
		programId: "ba-club",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Crearla es gratis y en ella podrá agrupar todos los Avios de hasta seis
		// personas"
		// Cuenta Familiar. Free, up to 6 people.
		// Source: https://www.britishairways.com/content/es/es/the-british-airways-club/about-the-club/household-accounts
		programId: "ba-club",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "The Family account lets you and your loved ones pool all your Avios
		// into one balance."
		// Family account. Up to 7 people. The page loads in English.
		// Source: https://www.iberia.com/it/iberia-club/family-Account/
		programId: "iberia-club",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Combine Avios from up to 7 people into a single balance."
		// Family account. Up to 7 people. The page loads in English.
		// Source: https://www.iberia.com/es/iberia-club/family-Account/
		programId: "iberia-club",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Obtengan Avios como grupo para aumentar su saldo y llegar más rápido a
		// la siguiente recompensa."
		// Family & Friends. Up to 9 members. The page of Italy gives 404.
		// Source: https://www.qatarairways.com/es-es/Privilege-Club/family-and-friends.html
		programId: "qatar",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Il/la responsabile della Flying Blue Family è l’unica persona
		// autorizzata a trasferire Miglia dagli account dei soci della Flying Blue
		// Family."
		// Flying Blue Family. The leader moves the miles of the members into one
		// account, free. The user counts that as a pool (2026-11-25).
		// Source: https://www.flyingblue.com/it/programme/faq?country=IT
		programId: "flying-blue",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "El líder de Flying Blue Familia es la única persona que puede
		// transferir Millas de las cuentas de los socios de Flying Blue Familia."
		// Flying Blue Familia. Same as Italy.
		// Source: https://www.flyingblue.com/es/programme/faq?country=ES
		programId: "flying-blue",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Point sharing allows several EuroBonus members to collect EuroBonus
		// points in one account"
		// Point Sharing. 2 to 8 members. Global page.
		// Source: https://www.flysas.com/en/legal-info/point-sharing
		programId: "sas",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Point sharing allows several EuroBonus members to collect EuroBonus
		// points in one account"
		// Point Sharing. Same global page.
		// Source: https://www.flysas.com/en/legal-info/point-sharing
		programId: "sas",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Riversate in un unico account le Miglia Skywards accumulate sui voli e
		// con i nostri partner"
		// Programma per Famiglie. The page stops the pool from January 2027 with
		// no exact day: validTo is the first day of that month.
		// Source: https://www.emirates.com/it/italian/skywards/my-family/
		programId: "emirates",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: "2027-01-01",
	},
	{
		// "Reúna todas las millas Skywards que obtenga con sus vuelos y con
		// nuestros socios colaboradores en una sola cuenta"
		// Programa Familiar. Same end as Italy.
		// Source: https://www.emirates.com/es/spanish/skywards/my-family/
		programId: "emirates",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: "2027-01-01",
	},
	{
		// "possono raggruppare le loro Miglia in un unico account e riscattarle
		// congiuntamente."
		// Affiliazione per familiari. Classic Plus, Elite and Elite Plus only.
		// Source: https://www.turkishairlines.com/it-it/miles-and-smiles/program-features/family-membership-classic-plus/
		programId: "turkish",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "pueden acumular sus Millas en una sola cuenta y canjearlas
		// conjuntamente."
		// Condición de miembro familiar. Same tiers as Italy.
		// Source: https://www.turkishairlines.com/es-es/miles-and-smiles/program-features/family-membership-classic-plus/
		programId: "turkish",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Tutte le Miglia convertibili accumulate da ciascun membro verranno
		// automaticamente trasferite sul saldo Together"
		// Miles+Bonus Together. Up to 5 members.
		// Source: https://it.aegeanair.com/milesandbonus/together/
		programId: "aegean",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Todas las millas de canje acumuladas por cada usuario se transferirán
		// automáticamente al saldo de Together"
		// Miles+Bonus Together. Same as Italy.
		// Source: https://es.aegeanair.com/milesandbonus/together/
		programId: "aegean",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Possono iscriversi fino a nove persone. Guadagna miglia singolarmente e
		// uniscile per ottenere i premi."
		// Iscrizione al programma Family. Up to 9 people.
		// Source: https://www.etihad.com/it-it/etihadguest/family-membership
		programId: "etihad",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Pueden unirse hasta nueve miembros. Ganad millas por separado y
		// juntadlas para conseguir recompensas."
		// Membresía familiar. Same as Italy.
		// Source: https://www.etihad.com/es-es/etihadguest/family-membership
		programId: "etihad",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "i membri* della famiglia uniscono le proprie Miglia in un unico conto."
		// Conti Familiari. Up to 7 members, free.
		// Source: https://www.aireuropa.com/it/it/aea/suma/il-nostro-programma/conti-familiari.html
		programId: "air-europa",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "los miembros* de la familia combinan sus Millas en una sola cuenta."
		// Cuentas Familiares. Same as Italy.
		// Source: https://www.aireuropa.com/es/es/aea/suma/nuestro-programa/cuentas-familiares.html
		programId: "air-europa",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Miles pooling allows two or more MileagePlus® members to add miles to a
		// single account."
		// Miles pooling. Up to 5 people, free. The page loads in English.
		// Source: https://www.united.com/en/it/mileageplus/miles-pooling
		programId: "united",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "La agrupación de millas permite que dos o más socios de MileagePlus®
		// acumulen sus millas en una sola cuenta."
		// Agrupación de millas. Same as Italy.
		// Source: https://www.united.com/es/es/mileageplus/miles-pooling
		programId: "united",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "Il Mileage Pooling permette a due persone adulte e fino a cinque minori
		// di accumulare miglia insieme in un unico pool."
		// Mileage Pooling. 2 adults and up to 5 children.
		// Source: https://www.miles-and-more.com/it/it/program/at-a-glance/mileage-pooling.html
		programId: "miles-and-more",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "dos adultos y hasta cinco niños pueden combinar sus millas en un fondo
		// común"
		// Mileage Pooling. No es/es site: the Spanish page lists España among the
		// countries.
		// Source: https://www.miles-and-more.com/de/es/program/at-a-glance/mileage-pooling.html
		programId: "miles-and-more",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "you and your family members can pool and use each other’s mileage
		// without undergoing a separate consent process."
		// Family Plan. The pool works at the redemption. Global page.
		// Source: https://www.koreanair.com/contents/skypass/benefits/family-plan/pooling
		programId: "korean-air",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "you and your family members can pool and use each other’s mileage
		// without undergoing a separate consent process."
		// Family Plan. Same global page.
		// Source: https://www.koreanair.com/contents/skypass/benefits/family-plan/pooling
		programId: "korean-air",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "JALFC members can combine their family miles to redeem for awards"
		// JAL Family Club. Primary member outside Japan, up to 8 family members.
		// Source: https://www.jal.co.jp/jp/en/jalmile/jfc/about.html
		programId: "jal",
		country: "IT",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
	{
		// "JALFC members can combine their family miles to redeem for awards"
		// JAL Family Club. Same global page.
		// Source: https://www.jal.co.jp/jp/en/jalmile/jfc/about.html
		programId: "jal",
		country: "ES",
		validFrom: VERIFIED_ON_HOUSEHOLD,
		validTo: null,
	},
];
