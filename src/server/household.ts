/**
 * The household: the members, the invitations and the potential miles of the
 * group. Paragraph 4.10 of `docs/architecture.md` gives the decisions.
 *
 * Each operation examines the request first, the role second and the level of
 * the owner last, as paragraph 4.6 gives. Each error has the status and the
 * code of the API, thus a route only writes the answer.
 *
 * The functions read the clock from a parameter.
 */

import { and, asc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import {
	ALREADY_IN_HOUSEHOLD,
	ALREADY_MEMBER,
	COUNTRY_MISMATCH,
	COUNTRY_REQUIRED,
	createAccountSchema,
	HOUSEHOLD_FULL,
	type HouseholdMember,
	type HouseholdResponse,
	householdInviteSchema,
	MAX_HOUSEHOLD_PEOPLE,
	manualMemberSchema,
	OWNER_CANNOT_LEAVE,
	SUPPORTER_REQUIRED,
	TOO_MANY_ACCOUNTS,
} from "../shared/api.ts";
import { householdPotential } from "../shared/household.ts";
import { canManageHousehold } from "../shared/tier.ts";
import type { Db } from "./db/index.ts";
import {
	allCurrencies,
	allHouseholdPools,
	allPrograms,
	allTransferRules,
	countMemberAccounts,
	countryOf,
	createAccount,
	currentBalances,
	memberBalances,
} from "./db/queries.ts";
import {
	household,
	householdInvite,
	householdMember,
	user,
} from "./db/schema.ts";
import { entitlementOf, latestObservedAt, today } from "./operations.ts";

/**
 * The maximum quantity of accounts of one manual member. It is the ceiling of
 * `MAX_ACCOUNTS_PER_USER` of `app.ts`, for the same reason: the calculation
 * reads each account in one synchronous loop.
 */
export const MAX_ACCOUNTS_PER_MEMBER = 100;

type Status = 400 | 403 | 404 | 409;

/** An error of an operation, with the status and the code of the API. */
export type HouseholdFailure = {
	ok: false;
	status: Status;
	error: string;
	issues?: z.core.$ZodIssue[];
};

export type HouseholdResult<T = undefined> =
	| { ok: true; value: T }
	| HouseholdFailure;

const fail = (status: Status, error: string): HouseholdFailure => ({
	ok: false,
	status,
	error,
});

const invalid = (issues: z.core.$ZodIssue[]): HouseholdFailure => ({
	ok: false,
	status: 400,
	error: "invalid_body",
	issues,
});

const unknownHousehold = () => fail(404, "unknown_household");

/** The row of the user in a household, with the owner of that household. */
function membershipOf(db: Db, userId: string) {
	return db
		.select({
			memberId: householdMember.id,
			householdId: household.id,
			ownerId: household.ownerId,
		})
		.from(householdMember)
		.innerJoin(household, eq(household.id, householdMember.householdId))
		.where(eq(householdMember.userId, userId))
		.get();
}

/** The household of the owner `userId`, or undefined for each other user. */
function ownedHousehold(db: Db, userId: string) {
	const found = membershipOf(db, userId);
	return found?.ownerId === userId ? found : undefined;
}

/** The people of the household: the members and the open invitations. */
function peopleOf(db: Db, householdId: string): number {
	const members = db
		.select({ count: sql<number>`count(*)` })
		.from(householdMember)
		.where(eq(householdMember.householdId, householdId))
		.get();
	const invites = db
		.select({ count: sql<number>`count(*)` })
		.from(householdInvite)
		.where(eq(householdInvite.householdId, householdId))
		.get();
	return (members?.count ?? 0) + (invites?.count ?? 0);
}

/** Examines the level of the owner of the household. */
function ownerCanManage(
	db: Db,
	ownerId: string,
	limits: boolean,
	now: Date,
): boolean {
	return canManageHousehold(entitlementOf(db, ownerId, limits, now));
}

function emailOf(db: Db, userId: string): string {
	const row = db
		.select({ email: user.email })
		.from(user)
		.where(eq(user.id, userId))
		.get();
	return (row?.email ?? "").toLowerCase();
}

/**
 * Gives the household of the user, with the potential miles of each airline
 * currency, or the open invitations of a user with no household.
 */
export function householdOf(
	db: Db,
	userId: string,
	limits: boolean,
	now: Date,
): HouseholdResponse {
	const membership = membershipOf(db, userId);
	if (membership === undefined) {
		const invitations = db
			.select({ householdId: household.id, ownerName: user.name })
			.from(householdInvite)
			.innerJoin(household, eq(household.id, householdInvite.householdId))
			.innerJoin(user, eq(user.id, household.ownerId))
			.where(eq(householdInvite.email, emailOf(db, userId)))
			.orderBy(asc(householdInvite.createdAt))
			.all();
		return { household: null, invitations };
	}

	const { householdId, ownerId } = membership;
	const isOwner = ownerId === userId;
	const rows = db
		.select({
			id: householdMember.id,
			userId: householdMember.userId,
			manualName: householdMember.name,
			userName: user.name,
		})
		.from(householdMember)
		.leftJoin(user, eq(user.id, householdMember.userId))
		.where(eq(householdMember.householdId, householdId))
		.orderBy(asc(householdMember.createdAt), asc(householdMember.id))
		.all();

	const members: HouseholdMember[] = rows
		.map((row) => ({
			id: row.id,
			name: row.userName ?? row.manualName ?? "",
			kind: row.userId === null ? ("manual" as const) : ("user" as const),
			owner: row.userId === ownerId,
			self: row.userId === userId,
			accounts:
				row.userId === null
					? memberBalances(db, ownerId, row.id)
					: currentBalances(db, row.userId),
		}))
		// The owner comes first. The other members keep the order of the writes.
		.sort((a, b) => Number(b.owner) - Number(a.owner));

	const at = today(now);
	const country = countryOf(db, ownerId);
	const programs = allPrograms(db);
	const rules = allTransferRules(db);
	const pools = allHouseholdPools(db);
	const balances = members.map((member) => ({
		memberId: member.id,
		balances: member.accounts.flatMap((row) =>
			row.points === null
				? []
				: [{ programId: row.programId, points: row.points }],
		),
	}));
	const potential =
		country === null
			? []
			: allCurrencies(db)
					.filter((currency) => currency.kind === "airline")
					.map((currency) =>
						householdPotential({
							currencyId: currency.id,
							members: balances,
							programs,
							rules,
							pools,
							country,
							at,
						}),
					);

	const invites = isOwner
		? db
				.select({ email: householdInvite.email })
				.from(householdInvite)
				.where(eq(householdInvite.householdId, householdId))
				.orderBy(asc(householdInvite.createdAt), asc(householdInvite.email))
				.all()
				.map((row) => row.email)
		: [];

	return {
		household: {
			id: householdId,
			owner: isOwner,
			canManage: isOwner && ownerCanManage(db, ownerId, limits, now),
			invites,
			members,
			at,
			potential,
		},
		invitations: [],
	};
}

/** Makes a household with the user as the owner. */
export function createHousehold(
	db: Db,
	userId: string,
	limits: boolean,
	now: Date,
): HouseholdResult<{ id: string }> {
	if (membershipOf(db, userId) !== undefined) {
		return fail(409, ALREADY_IN_HOUSEHOLD);
	}
	if (countryOf(db, userId) === null) {
		return fail(409, COUNTRY_REQUIRED);
	}
	if (!ownerCanManage(db, userId, limits, now)) {
		return fail(403, SUPPORTER_REQUIRED);
	}
	const id = crypto.randomUUID();
	const createdAt = now.toISOString();
	db.transaction((tx) => {
		tx.insert(household).values({ id, ownerId: userId, createdAt }).run();
		tx.insert(householdMember)
			.values({ id: crypto.randomUUID(), householdId: id, userId, createdAt })
			.run();
	});
	return { ok: true, value: { id } };
}

/**
 * Removes the household of the owner. The foreign keys remove the members, the
 * invitations and the accounts of the manual members. The members of Yume
 * keep their own accounts.
 */
export function removeHousehold(db: Db, userId: string): HouseholdResult {
	const owned = ownedHousehold(db, userId);
	if (owned === undefined) {
		return unknownHousehold();
	}
	db.delete(household).where(eq(household.id, owned.householdId)).run();
	return { ok: true, value: undefined };
}

/** Invites a Google address to the household of the owner. */
export function invite(
	db: Db,
	userId: string,
	body: unknown,
	limits: boolean,
	now: Date,
): HouseholdResult {
	const owned = ownedHousehold(db, userId);
	if (owned === undefined) {
		return unknownHousehold();
	}
	const parsed = householdInviteSchema.safeParse(body);
	if (!parsed.success) {
		return invalid(parsed.error.issues);
	}
	const { email } = parsed.data;
	const member = db
		.select({ id: householdMember.id })
		.from(householdMember)
		.innerJoin(user, eq(user.id, householdMember.userId))
		.where(
			and(
				eq(householdMember.householdId, owned.householdId),
				eq(sql`lower(${user.email})`, email),
			),
		)
		.get();
	if (member !== undefined) {
		return fail(409, ALREADY_MEMBER);
	}
	const open = db
		.select({ email: householdInvite.email })
		.from(householdInvite)
		.where(
			and(
				eq(householdInvite.householdId, owned.householdId),
				eq(householdInvite.email, email),
			),
		)
		.get();
	// A second invitation of the same address changes no row.
	if (open !== undefined) {
		return { ok: true, value: undefined };
	}
	if (peopleOf(db, owned.householdId) >= MAX_HOUSEHOLD_PEOPLE) {
		return fail(409, HOUSEHOLD_FULL);
	}
	if (!ownerCanManage(db, userId, limits, now)) {
		return fail(403, SUPPORTER_REQUIRED);
	}
	db.insert(householdInvite)
		.values({
			householdId: owned.householdId,
			email,
			createdAt: now.toISOString(),
		})
		.run();
	return { ok: true, value: undefined };
}

/** Removes an open invitation of the household of the owner. */
export function cancelInvite(
	db: Db,
	userId: string,
	email: string,
): HouseholdResult {
	const owned = ownedHousehold(db, userId);
	if (owned === undefined) {
		return unknownHousehold();
	}
	db.delete(householdInvite)
		.where(
			and(
				eq(householdInvite.householdId, owned.householdId),
				eq(householdInvite.email, email.trim().toLowerCase()),
			),
		)
		.run();
	return { ok: true, value: undefined };
}

/**
 * Accepts an invitation for the Google address of the user. The acceptance is
 * the consent to the share of the balances. The other invitations of the
 * address go away: a user is in one household at most.
 *
 * The level of the owner does not apply here: the owner wrote the invitation
 * as a supporter, and the end of a supporter account removes nothing.
 */
export function acceptInvitation(
	db: Db,
	userId: string,
	householdId: string,
	now: Date,
): HouseholdResult {
	const email = emailOf(db, userId);
	const found = db
		.select({ ownerId: household.ownerId })
		.from(householdInvite)
		.innerJoin(household, eq(household.id, householdInvite.householdId))
		.where(
			and(
				eq(householdInvite.householdId, householdId),
				eq(householdInvite.email, email),
			),
		)
		.get();
	if (found === undefined) {
		return fail(404, "unknown_invitation");
	}
	if (membershipOf(db, userId) !== undefined) {
		return fail(409, ALREADY_IN_HOUSEHOLD);
	}
	const country = countryOf(db, userId);
	if (country === null) {
		return fail(409, COUNTRY_REQUIRED);
	}
	if (country !== countryOf(db, found.ownerId)) {
		return fail(409, COUNTRY_MISMATCH);
	}
	// The open invitation is one of the people, thus the count holds the place
	// of this person. Only the members count here.
	const members = db
		.select({ count: sql<number>`count(*)` })
		.from(householdMember)
		.where(eq(householdMember.householdId, householdId))
		.get();
	if ((members?.count ?? 0) >= MAX_HOUSEHOLD_PEOPLE) {
		return fail(409, HOUSEHOLD_FULL);
	}
	db.transaction((tx) => {
		tx.insert(householdMember)
			.values({
				id: crypto.randomUUID(),
				householdId,
				userId,
				createdAt: now.toISOString(),
			})
			.run();
		tx.delete(householdInvite).where(eq(householdInvite.email, email)).run();
	});
	return { ok: true, value: undefined };
}

/** Refuses an invitation for the Google address of the user. */
export function refuseInvitation(
	db: Db,
	userId: string,
	householdId: string,
): HouseholdResult {
	db.delete(householdInvite)
		.where(
			and(
				eq(householdInvite.householdId, householdId),
				eq(householdInvite.email, emailOf(db, userId)),
			),
		)
		.run();
	return { ok: true, value: undefined };
}

/** Adds a manual member to the household of the owner. */
export function addManualMember(
	db: Db,
	userId: string,
	body: unknown,
	limits: boolean,
	now: Date,
): HouseholdResult<{ id: string }> {
	const owned = ownedHousehold(db, userId);
	if (owned === undefined) {
		return unknownHousehold();
	}
	const parsed = manualMemberSchema.safeParse(body);
	if (!parsed.success) {
		return invalid(parsed.error.issues);
	}
	if (peopleOf(db, owned.householdId) >= MAX_HOUSEHOLD_PEOPLE) {
		return fail(409, HOUSEHOLD_FULL);
	}
	if (!ownerCanManage(db, userId, limits, now)) {
		return fail(403, SUPPORTER_REQUIRED);
	}
	const id = crypto.randomUUID();
	db.insert(householdMember)
		.values({
			id,
			householdId: owned.householdId,
			name: parsed.data.name,
			createdAt: now.toISOString(),
		})
		.run();
	return { ok: true, value: { id } };
}

/**
 * Removes a member. The owner removes each other member. A member of Yume
 * removes the own row: that member leaves the household and keeps the own
 * accounts. A manual member goes with the accounts of that member.
 */
export function removeMember(
	db: Db,
	userId: string,
	memberId: string,
): HouseholdResult {
	const membership = membershipOf(db, userId);
	const target =
		membership &&
		db
			.select({ userId: householdMember.userId })
			.from(householdMember)
			.where(
				and(
					eq(householdMember.id, memberId),
					eq(householdMember.householdId, membership.householdId),
				),
			)
			.get();
	if (membership === undefined || target === undefined) {
		return fail(404, "unknown_member");
	}
	const isOwner = membership.ownerId === userId;
	if (!isOwner && target.userId !== userId) {
		return fail(404, "unknown_member");
	}
	if (target.userId === membership.ownerId) {
		return fail(409, OWNER_CANNOT_LEAVE);
	}
	db.delete(householdMember).where(eq(householdMember.id, memberId)).run();
	return { ok: true, value: undefined };
}

/**
 * Adds an account to a manual member of the household of the owner, with the
 * first balance when the body holds it. The limits of the free account do not
 * apply: the owner of a new account of a manual member is a supporter.
 */
export function addMemberAccount(
	db: Db,
	userId: string,
	memberId: string,
	body: unknown,
	limits: boolean,
	now: Date,
): HouseholdResult<{ id: string }> {
	const owned = ownedHousehold(db, userId);
	const member =
		owned &&
		db
			.select({ id: householdMember.id })
			.from(householdMember)
			.where(
				and(
					eq(householdMember.id, memberId),
					eq(householdMember.householdId, owned.householdId),
					sql`${householdMember.userId} is null`,
				),
			)
			.get();
	if (member === undefined) {
		return fail(404, "unknown_member");
	}
	const parsed = createAccountSchema.safeParse(body);
	if (!parsed.success) {
		return invalid(parsed.error.issues);
	}
	if (
		!allPrograms(db).some((program) => program.id === parsed.data.programId)
	) {
		return fail(404, "unknown_program");
	}
	const observedAt = parsed.data.snapshot?.observedAt;
	if (observedAt !== undefined && observedAt > latestObservedAt(now)) {
		return fail(400, "future_date");
	}
	if (!ownerCanManage(db, userId, limits, now)) {
		return fail(403, SUPPORTER_REQUIRED);
	}
	if (countMemberAccounts(db, memberId) >= MAX_ACCOUNTS_PER_MEMBER) {
		return fail(409, TOO_MANY_ACCOUNTS);
	}
	const id = createAccount(db, { userId, memberId, ...parsed.data });
	return { ok: true, value: { id } };
}
