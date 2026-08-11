/**
 * The catalogue of currencies, programmes and transfer rules.
 *
 * This file is the source of truth for the application data. Appendix 8 of
 * `docs/architecture.md` is only a summary.
 *
 * Rules for a change of this file:
 *
 * - Read the official page. Do not write a ratio from memory.
 * - Write the link of that page in `sourceUrl`.
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
} from "../../../shared/catalogue.js";

/** The date of the examination of each page of this file. */
const VERIFIED_ON = "2026-08-11";

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
		name: "Miglia Flying Blue",
		kind: "airline",
	},
];

export const programs: readonly Program[] = [
	{
		id: "amex-mr",
		currencyId: "amex-mr",
		code: "AMEX_MR",
		name: "American Express Membership Rewards",
		transferable: false,
	},
	{
		id: "revolut",
		currencyId: "revpoints",
		code: "REVOLUT",
		name: "Revolut RevPoints",
		transferable: false,
	},
	{
		id: "ba-club",
		currencyId: "avios",
		code: "BA",
		name: "The British Airways Club",
		transferable: true,
	},
	{
		id: "iberia-club",
		currencyId: "avios",
		code: "IB",
		name: "Iberia Club",
		transferable: true,
	},
	{
		id: "flying-blue",
		currencyId: "flying-blue",
		code: "FB",
		name: "Flying Blue",
		transferable: true,
	},
];

export const transferRules: readonly TransferRule[] = [
	{
		// "3 punti Membership Rewards = 2 Miglia Flying Blue",
		// "Trasferimento minimo richiesto 750 Punti",
		// "il trasferimento deve essere effettuato in blocchi o multipli di 3 punti"
		fromProgramId: "amex-mr",
		toProgramId: "flying-blue",
		ratioNum: 2,
		ratioDen: 3,
		minTransfer: 750,
		increment: 3,
		validFrom: VERIFIED_ON,
		validTo: null,
		sourceUrl:
			"https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/Flying-Blue/flying-blue/AF02",
	},
	{
		// "5 punti Membership Rewards = 4 Avios", minimum "800 Punti",
		// "il trasferimento deve essere effettuato in blocchi o multipli di 400 punti"
		fromProgramId: "amex-mr",
		toProgramId: "ba-club",
		ratioNum: 4,
		ratioDen: 5,
		minTransfer: 800,
		increment: 400,
		validFrom: VERIFIED_ON,
		validTo: null,
		sourceUrl:
			"https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/British-Airways/award-cancelled-/BA-0001",
	},
	{
		// "5 Punti Membership Rewards = 4 Avios", minimum 500 points,
		// "I punti devono essere trasferiti in blocchi da 500"
		fromProgramId: "amex-mr",
		toProgramId: "iberia-club",
		ratioNum: 4,
		ratioDen: 5,
		minTransfer: 500,
		increment: 500,
		validFrom: VERIFIED_ON,
		validTo: null,
		sourceUrl:
			"https://www.americanexpress.com/it-it/rewards/membership-rewards/partner/Iberia/Iberia-Plus/IBER-022",
	},
	{
		// British Airways gives the ratio: "convert Revpoints into Avios at a
		// conversion rate of 1:1". Revolut refuses a request from a machine, thus
		// the source is the page of the airline.
		fromProgramId: "revolut",
		toProgramId: "ba-club",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON,
		validTo: null,
		sourceUrl:
			"https://www.britishairways.com/content/en/es/the-british-airways-club/avios/collecting-avios/lifestyle",
	},
	{
		// The ratio is 1 : 1, with the conditions of the route to Avios. Revolut
		// refuses a request from a machine. Therefore the user read this ratio in
		// the application on 11 August 2026 and confirmed it.
		fromProgramId: "revolut",
		toProgramId: "flying-blue",
		ratioNum: 1,
		ratioDen: 1,
		minTransfer: 1,
		increment: 1,
		validFrom: VERIFIED_ON,
		validTo: null,
		sourceUrl:
			"https://help.revolut.com/it-IT/help/revpoints/airline-miles/questions-airline-miles-faq3/",
	},
];
