import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "./index.ts";
import {
	balanceSnapshot,
	currency,
	invitation,
	program,
	transferRule,
	userAccount,
} from "./schema.ts";

/** An account of the user with its most recent snapshot. */
export type AccountWithBalance = {
	accountId: string;
	programId: string;
	nickname: string | null;
	/** It is null when the account has no snapshot. */
	points: number | null;
	observedAt: string | null;
};

/**
 * Gives each account of the user with its current balance.
 *
 * The current balance is the most recent snapshot of the account. Two snapshots
 * with the same date keep the row with the larger id, thus the result of two
 * calls is the same.
 */
export function currentBalances(db: Db, userId: string): AccountWithBalance[] {
	return db
		.select({
			accountId: userAccount.id,
			programId: userAccount.programId,
			nickname: userAccount.nickname,
			points: balanceSnapshot.points,
			observedAt: balanceSnapshot.observedAt,
		})
		.from(userAccount)
		.leftJoin(
			balanceSnapshot,
			eq(
				balanceSnapshot.id,
				sql`(select ${balanceSnapshot.id} from ${balanceSnapshot}
					where ${balanceSnapshot.accountId} = ${userAccount.id}
					order by ${balanceSnapshot.observedAt} desc, ${balanceSnapshot.id} desc
					limit 1)`,
			),
		)
		.where(eq(userAccount.userId, userId))
		.orderBy(asc(userAccount.id))
		.all();
}

/**
 * Finds one account of the user.
 *
 * The result is undefined when the account does not exist, and also when the
 * account belongs to an other user. A route must call this function before it
 * writes a snapshot.
 */
export function findAccount(db: Db, accountId: string, userId: string) {
	return db
		.select()
		.from(userAccount)
		.where(and(eq(userAccount.id, accountId), eq(userAccount.userId, userId)))
		.get();
}

export function allCurrencies(db: Db) {
	return db.select().from(currency).orderBy(asc(currency.id)).all();
}

export function allPrograms(db: Db) {
	return db.select().from(program).orderBy(asc(program.id)).all();
}

export function allTransferRules(db: Db) {
	return db
		.select()
		.from(transferRule)
		.orderBy(asc(transferRule.fromProgramId), asc(transferRule.toProgramId))
		.all();
}

/** Finds the invitation with the code. It gives undefined for an unknown code. */
export function findInvitation(db: Db, code: string) {
	return db.select().from(invitation).where(eq(invitation.code, code)).get();
}

/**
 * Marks the invitation as used by the user.
 *
 * The condition holds `used_at is null`. Therefore two sign-ups with the same
 * code cannot both mark the invitation, and the result gives the number of the
 * rows that changed. It gives true when this call marked the invitation.
 *
 * The name of this function does not start with `use`: Biome reads such a name
 * as a hook of React and it gives an error at an early return.
 */
export function markInvitationUsed(
	db: Db,
	input: { code: string; userId: string; at: string },
): boolean {
	const result = db
		.update(invitation)
		.set({ usedAt: input.at, usedByUserId: input.userId })
		.where(and(eq(invitation.code, input.code), isNull(invitation.usedAt)))
		.run();
	return result.changes === 1;
}

/** Adds an account of the user. It gives the id of the new account. */
export function createAccount(
	db: Db,
	input: {
		userId: string;
		programId: string;
		nickname?: string | null;
		membershipRef?: string | null;
	},
): string {
	const id = crypto.randomUUID();
	db.insert(userAccount)
		.values({
			id,
			userId: input.userId,
			programId: input.programId,
			nickname: input.nickname ?? null,
			membershipRef: input.membershipRef ?? null,
		})
		.run();
	return id;
}

/**
 * Adds a snapshot of the balance. It gives the id of the new snapshot.
 *
 * The database keeps each snapshot. It keeps no record of the changes.
 */
export function addSnapshot(
	db: Db,
	input: {
		accountId: string;
		points: number;
		observedAt: string;
		note?: string | null;
	},
): string {
	const id = crypto.randomUUID();
	db.insert(balanceSnapshot)
		.values({
			id,
			accountId: input.accountId,
			points: input.points,
			observedAt: input.observedAt,
			note: input.note ?? null,
		})
		.run();
	return id;
}
