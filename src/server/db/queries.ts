import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "./index.ts";
import {
	balanceSnapshot,
	currency,
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
