/**
 * The shapes of the requests of the API.
 *
 * The client and the server use the same schemas. The schemas hold no text for
 * the user: the client writes the Italian text. Refer to the section Language
 * rules in `CLAUDE.md`.
 */

import { z } from "zod";
import {
	COUNTRIES,
	type Country,
	type Currency,
	type Program,
} from "./catalogue.ts";
import type { HouseholdPotential } from "./household.ts";
import { LOCALES } from "./locale.ts";
import type { PotentialMiles } from "./potential.ts";
import type { AccountTier } from "./tier.ts";

/**
 * A date in the ISO 8601 format, for example `2026-08-11`.
 *
 * `Date.parse` is not sufficient: V8 accepts a day up to 31 in each month, and
 * `2026-02-30` gives 2 March. Thus the schema makes the date in UTC from its
 * three parts and compares the result with those parts.
 */
export const isoDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine((value) => {
		// The regular expression gives three parts.
		const [year, month, day] = value.split("-").map(Number) as [
			number,
			number,
			number,
		];
		const date = new Date(Date.UTC(year, month - 1, day));
		return (
			date.getUTCFullYear() === year &&
			date.getUTCMonth() === month - 1 &&
			date.getUTCDate() === day
		);
	});

/**
 * The maximum quantity of expiry lots of one snapshot.
 *
 * A programme shows some dates of expiry, not one date for each month of ten
 * years. The limit keeps the body below `MAX_BODY_BYTES` of the server.
 */
export const MAX_EXPIRY_LOTS = 50;

/**
 * A quantity of points of a balance that expires at a date.
 *
 * The point is the smallest unit, but the database keeps one row for one date,
 * not one row for one point. Paragraph 3.2.1 of `docs/architecture.md` gives
 * the model.
 */
export const expiryLotSchema = z.object({
	points: z.number().int().min(1),
	expiresOn: isoDateSchema,
});

/**
 * A snapshot of the balance, with its expiry lots.
 *
 * The lots are not necessary, and they can hold a part of the balance only.
 * The schema refuses these lots:
 *
 * - lots with a sum above the balance;
 * - two lots with the same date;
 * - a lot that expires before the date of the balance. That lot is not in the
 *   balance.
 */
export const addSnapshotSchema = z
	.object({
		/** Points are integers and no balance is below 0. */
		points: z.number().int().min(0),
		observedAt: isoDateSchema,
		lots: z.array(expiryLotSchema).max(MAX_EXPIRY_LOTS).optional(),
	})
	.superRefine((snapshot, context) => {
		const lots = snapshot.lots ?? [];
		const sum = lots.reduce((total, lot) => total + lot.points, 0);
		if (sum > snapshot.points) {
			context.addIssue({
				code: "custom",
				path: ["lots"],
				message: "The lots are above the balance.",
			});
		}
		if (new Set(lots.map((lot) => lot.expiresOn)).size !== lots.length) {
			context.addIssue({
				code: "custom",
				path: ["lots"],
				message: "Two lots hold the same date.",
			});
		}
		if (lots.some((lot) => lot.expiresOn < snapshot.observedAt)) {
			context.addIssue({
				code: "custom",
				path: ["lots"],
				message: "A lot expires before the date of the balance.",
			});
		}
	});

/**
 * A new account. `snapshot` is the first balance, and it is not necessary.
 *
 * The server writes the account and the snapshot in one transaction. Thus one
 * error gives no row, and a second request gives no second account.
 */
export const createAccountSchema = z.object({
	programId: z.string().min(1),
	snapshot: addSnapshotSchema.optional(),
});

/**
 * The maximum quantity of people of a household: the owner, the members of
 * Yume, the manual members and the open invitations. Paragraph 4.10 of
 * `docs/architecture.md`.
 */
export const MAX_HOUSEHOLD_PEOPLE = 8;

/**
 * The name of a member that the owner writes. Yume keeps no name of a Google
 * account, thus the household shows this name. Paragraph 4.10.
 */
const memberNameSchema = z.string().trim().min(1).max(40);

/**
 * An invitation to a household. The email is the Google address of the
 * person. The schema removes the spaces and writes the address in lower case,
 * because the comparison with the address of the user is exact.
 */
export const householdInviteSchema = z.strictObject({
	email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
	name: memberNameSchema,
});

/** A manual member of a household: a person with no account of Yume. */
export const manualMemberSchema = z.strictObject({
	name: memberNameSchema,
});

/** The error of a request for a second household of one user. */
export const ALREADY_IN_HOUSEHOLD = "already_in_household";

/** The error of an invitation of a person of an other country. */
export const COUNTRY_MISMATCH = "country_mismatch";

/** The error of a household with `MAX_HOUSEHOLD_PEOPLE` people. */
export const HOUSEHOLD_FULL = "household_full";

/** The error of an invitation of an address that is in the household. */
export const ALREADY_MEMBER = "already_member";

/** The error of an owner who leaves the household: the owner removes it. */
export const OWNER_CANNOT_LEAVE = "owner_cannot_leave";

/**
 * The error of `POST /api/accounts` when the user holds the maximum quantity of
 * accounts. The client reads it and shows its own message.
 */
export const TOO_MANY_ACCOUNTS = "too_many_accounts";

/**
 * The error of a request that the free account cannot do, with the status 403:
 * an account above the limits, or the expiry lots of a snapshot. The client
 * knows the form of the request and shows its own message. Paragraph 4.6 of
 * `docs/architecture.md` gives the limits.
 */
export const SUPPORTER_REQUIRED = "supporter_required";

/**
 * The error of a request that needs the country of the user, before the user
 * selects it. The dashboard then asks for the country. Paragraph 3.3.2 of
 * `docs/architecture.md` gives the rule.
 */
export const COUNTRY_REQUIRED = "country_required";

/** The error of a request that changes the country of the user. */
export const COUNTRY_FIXED = "country_fixed";

/**
 * The body of `PUT /api/me/country`. The list holds the countries of the
 * catalogue only.
 */
export const setCountrySchema = z.strictObject({ country: z.enum(COUNTRIES) });

export type SetCountryInput = z.infer<typeof setCountrySchema>;

/**
 * The body of `PUT /api/admin/users/:id/unlimited`.
 *
 * The schema is strict: the administrator writes the flag only. The payment
 * writes `supporterUntil`. Paragraph 4.6 of `docs/architecture.md` gives the
 * two writers.
 */
export const setUnlimitedSchema = z.strictObject({ unlimited: z.boolean() });

/**
 * The body of `POST /api/billing/checkout` and of `POST /api/billing/portal`.
 *
 * The client gives the language of the page. The server then writes the
 * address of the return to the dashboard of that language. The schema is
 * strict: the client cannot give the return address. Paragraph 4.6.1 of
 * `docs/architecture.md`.
 */
export const billingRequestSchema = z.strictObject({ locale: z.enum(LOCALES) });

/**
 * The error of `POST /api/billing/checkout` when the user holds a
 * subscription that Stripe can charge, with the status 409. A second checkout
 * makes a second subscription, and Stripe charges the two.
 */
export const ALREADY_SUBSCRIBED = "already_subscribed";

/**
 * The error of `POST /api/billing/portal` for a user with no customer of
 * Stripe, with the status 404.
 */
export const NO_CUSTOMER = "no_customer";

/**
 * The error of the two routes of the payment when Stripe does not answer,
 * with the status 503. The user can try again.
 */
export const PAYMENT_UNAVAILABLE = "payment_unavailable";

/**
 * The error of the removal of the account of the reviewers. Paragraph 4.1.1
 * of `docs/architecture.md`: the administrator removes it with the script.
 */
export const REVIEWER_ACCOUNT = "reviewer_account";

export type BillingRequest = z.infer<typeof billingRequestSchema>;

/** The answer of the two routes of the payment: the address of Stripe. */
export type BillingRedirectResponse = { url: string };
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type HouseholdInviteInput = z.infer<typeof householdInviteSchema>;
export type ManualMemberInput = z.infer<typeof manualMemberSchema>;
export type AddSnapshotInput = z.infer<typeof addSnapshotSchema>;
export type ExpiryLot = z.infer<typeof expiryLotSchema>;

/**
 * The shapes of the answers of the API. The server gives these types to its
 * routes, and the client reads them. Thus the two sides cannot become
 * different.
 */

/** One account of the user with its current balance. */
export type AccountRow = {
	accountId: string;
	programId: string;
	/**
	 * The id of the most recent snapshot. The client sends this id to remove the
	 * balance that it shows, and no balance that an other device wrote after it.
	 * It is null when the account has no snapshot.
	 */
	snapshotId: string | null;
	/** It is null when the account has no snapshot. */
	points: number | null;
	observedAt: string | null;
	/**
	 * The expiry lots of the most recent snapshot, in the order of the date. The
	 * list is empty when the account has no snapshot.
	 */
	lots: ExpiryLot[];
};

export type CatalogueResponse = {
	currencies: Currency[];
	programs: Program[];
};

export type AccountsResponse = {
	accounts: AccountRow[];
};

/**
 * The currencies that the user marks as a favourite.
 *
 * The dashboard shows the cards of these currencies first. The list holds a
 * currency and not a programme: one card shows one currency.
 */
export type FavoritesResponse = {
	currencyIds: string[];
};

export type PotentialResponse = {
	/** The date of the calculation. A rule has versions. */
	at: string;
	potential: PotentialMiles[];
};

/**
 * The user of the session. `admin` is true for the address of `ADMIN_EMAIL`
 * only. The client shows the link of the page of the administrator with it.
 *
 * `limits` and `tier` give the entitlement of the user. The client disables
 * the options of the forms with `canAddAccount` and `canWriteExpiryLots`. The
 * server examines each request again: the client is not the protection.
 */
export type MeResponse = {
	admin: boolean;
	/** The value of `FREE_ACCOUNT_LIMITS`. */
	limits: boolean;
	tier: AccountTier;
	/** The state of the payment, or null on an instance with no payment. */
	billing: BillingState | null;
	/** The country of the transfer rules, or null before the choice. */
	country: Country | null;
};

/**
 * The state of the payment of the supporter account. Paragraph 4.6.1 of
 * `docs/architecture.md`.
 */
export type BillingState = {
	/**
	 * The status of the last subscription in Stripe, for example `active` or
	 * `past_due`. Null before the first subscription.
	 */
	status: string | null;
	/** True when the subscription stops at `supporterUntil`. */
	cancels: boolean;
	/** The end of the period that the user paid, in the ISO 8601 format, or null. */
	supporterUntil: string | null;
	/** True when the user has a customer of Stripe: the portal is available. */
	portal: boolean;
};

/**
 * One user of the instance, for the administrator. The row holds no account,
 * no balance and no programme. Paragraph 4.8 of `docs/architecture.md` gives the rule.
 */
export type AdminUser = {
	id: string;
	email: string;
	/** The instant of the first sign-in, in the ISO 8601 format. */
	createdAt: string;
	/** The level at the clock of the server. */
	tier: AccountTier;
	/** The end of the supporter account, in the ISO 8601 format, or null. */
	supporterUntil: string | null;
	unlimited: boolean;
};

export type AdminUsersResponse = {
	/** The newest user first. */
	users: AdminUser[];
};

/**
 * An assistant that the user authorised on the MCP server, for example Claude.
 * Issue #97 and paragraph 4.7.2 of `docs/architecture.md`.
 */
export type Connection = {
	/** The URL of the Client ID Metadata Document of the client. */
	clientId: string;
	/** The name of the client, or its `clientId` with no name. */
	name: string;
	/** The host of the first redirect URI, or an empty text. */
	host: string;
	/** The moment of the consent, in the ISO 8601 format. */
	connectedAt: string;
};

export type ConnectionsResponse = { connections: Connection[] };

/** One member of a household, with the current balance of each account. */
export type HouseholdMember = {
	id: string;
	/**
	 * The name that the owner wrote. It is null for the owner: the client
	 * shows the label of the owner.
	 */
	name: string | null;
	kind: "user" | "manual";
	owner: boolean;
	/** True for the member of the session. */
	self: boolean;
	accounts: AccountRow[];
};

/** An open invitation to a household, for the person of the session. */
export type HouseholdInvitation = {
	householdId: string;
	/** The Google address of the owner. The person reads who invites. */
	ownerEmail: string;
};

/**
 * The household of the user of the session. Paragraph 4.10 of
 * `docs/architecture.md` gives the decisions.
 */
export type HouseholdResponse = {
	household: {
		id: string;
		/** True when the user of the session is the owner. */
		owner: boolean;
		/**
		 * True when the owner can invite a person, add a manual member and add
		 * an account. It reads the level of the owner.
		 */
		canManage: boolean;
		/** The open invitations. Only the owner reads them. */
		invites: { email: string; name: string }[];
		members: HouseholdMember[];
		/** The date of the calculation. */
		at: string;
		/** One row for each airline currency. */
		potential: HouseholdPotential[];
	} | null;
	/** The invitations of the user. The list is empty in a household. */
	invitations: HouseholdInvitation[];
};
