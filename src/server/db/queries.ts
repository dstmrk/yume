import { and, asc, eq, lt, sql } from "drizzle-orm";
import type { Db } from "./index.ts";
import {
	balanceSnapshot,
	currency,
	favoriteCurrency,
	program,
	session,
	transferRule,
	userAccount,
	verification,
} from "./schema.ts";

/** An account of the user with its most recent snapshot. */
export type AccountWithBalance = {
	accountId: string;
	programId: string;
	/**
	 * The id of the most recent snapshot. The client sends this id to remove
	 * that snapshot. Thus it removes the value that it shows, and no value that
	 * an other device wrote after it.
	 */
	snapshotId: string | null;
	/** It is null when the account has no snapshot. */
	points: number | null;
	observedAt: string | null;
};

/**
 * Gives each account of the user with its current balance.
 *
 * The current balance is the most recent snapshot of the account: the latest
 * `observed_at`, then the latest `created_at`. Thus a correction on the same
 * day replaces the value before it. The id is random and it gives no order of
 * the writes. `rowid` is the last key, for two writes in one millisecond.
 * Paragraph 3.2 of `docs/architecture.md` gives the reason.
 */
export function currentBalances(db: Db, userId: string): AccountWithBalance[] {
	return db
		.select({
			accountId: userAccount.id,
			programId: userAccount.programId,
			snapshotId: balanceSnapshot.id,
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
					order by ${balanceSnapshot.observedAt} desc, ${balanceSnapshot.createdAt} desc, ${balanceSnapshot}.rowid desc
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

/**
 * The quantity of accounts of the user.
 *
 * Two accounts of one programme count as two: the ceiling of
 * `POST /api/accounts` limits the rows, because each row adds a balance to the
 * calculation.
 */
export function countAccounts(db: Db, userId: string): number {
	const row = db
		.select({ count: sql<number>`count(*)` })
		.from(userAccount)
		.where(eq(userAccount.userId, userId))
		.get();
	return row?.count ?? 0;
}

/**
 * Adds an account of the user. It gives the id of the new account.
 *
 * With `snapshot`, the function also writes the first balance. The two rows are
 * one transaction: an error of the snapshot leaves no account. An account with
 * no balance after an error makes the user save again, and that second request
 * makes a second account. Paragraph 5.0.1 of `docs/architecture.md` gives the
 * rule.
 */
export function createAccount(
	db: Db,
	input: {
		userId: string;
		programId: string;
		snapshot?: { points: number; observedAt: string };
	},
): string {
	const id = crypto.randomUUID();
	db.transaction((tx) => {
		tx.insert(userAccount)
			.values({ id, userId: input.userId, programId: input.programId })
			.run();
		if (input.snapshot !== undefined) {
			addSnapshot(tx, { accountId: id, ...input.snapshot });
		}
	});
	return id;
}

/**
 * Removes an account of the user. It gives true when it removes a row.
 *
 * The condition holds the user, thus a request cannot remove the account of an
 * other user. The column `balance_snapshot.account_id` holds
 * `on delete cascade`, therefore this operation also removes the snapshots of
 * the account.
 */
export function deleteAccount(
	db: Db,
	accountId: string,
	userId: string,
): boolean {
	const result = db
		.delete(userAccount)
		.where(and(eq(userAccount.id, accountId), eq(userAccount.userId, userId)))
		.run();
	return result.changes > 0;
}

/**
 * Removes one snapshot of an account. It gives true when it removes a row.
 *
 * The condition holds the account. The route reads the account of the user
 * first, thus a request cannot remove the snapshot of an other user.
 */
export function deleteSnapshot(
	db: Db,
	snapshotId: string,
	accountId: string,
): boolean {
	const result = db
		.delete(balanceSnapshot)
		.where(
			and(
				eq(balanceSnapshot.id, snapshotId),
				eq(balanceSnapshot.accountId, accountId),
			),
		)
		.run();
	return result.changes > 0;
}

/** Gives the id of each currency that the user marked as a favourite. */
export function favoriteCurrencies(db: Db, userId: string): string[] {
	return db
		.select({ currencyId: favoriteCurrency.currencyId })
		.from(favoriteCurrency)
		.where(eq(favoriteCurrency.userId, userId))
		.orderBy(asc(favoriteCurrency.currencyId))
		.all()
		.map((row) => row.currencyId);
}

/**
 * Marks a currency as a favourite of the user.
 *
 * The operation is idempotent: a second mark of the same currency changes no
 * row. Thus two taps on two devices give one row and no error.
 */
export function addFavorite(
	db: Db,
	input: { userId: string; currencyId: string },
): void {
	db.insert(favoriteCurrency)
		.values({ userId: input.userId, currencyId: input.currencyId })
		.onConflictDoNothing()
		.run();
}

/**
 * Removes the mark of a currency. It gives true when it removes a row.
 *
 * The condition holds the user, thus a request changes no mark of an other
 * user.
 */
export function removeFavorite(
	db: Db,
	userId: string,
	currencyId: string,
): boolean {
	const result = db
		.delete(favoriteCurrency)
		.where(
			and(
				eq(favoriteCurrency.userId, userId),
				eq(favoriteCurrency.currencyId, currencyId),
			),
		)
		.run();
	return result.changes > 0;
}

/**
 * Adds a snapshot of the balance. It gives the id of the new snapshot.
 *
 * The database keeps each snapshot. It keeps no record of the changes. The
 * column `created_at` receives the moment of the write, thus this snapshot
 * comes after each snapshot of the same date.
 */
export function addSnapshot(
	db: Pick<Db, "insert">,
	input: {
		accountId: string;
		points: number;
		observedAt: string;
	},
): string {
	const id = crypto.randomUUID();
	db.insert(balanceSnapshot)
		.values({
			id,
			accountId: input.accountId,
			points: input.points,
			observedAt: input.observedAt,
			createdAt: new Date().toISOString(),
		})
		.run();
	return id;
}

/**
 * Removes each expired row of `session` and of `verification`. It gives the
 * quantity of rows that it removes from each table.
 *
 * Better Auth removes an expired session only when the browser sends its
 * cookie. The cookie expires with the session, thus the browser never sends it
 * again, and the row keeps the IP address and the browser. Section 9 of the
 * privacy policy says that those data stay while the session exists. Paragraph
 * 4 of `docs/architecture.md` gives the schedule of this function.
 *
 * A row that expires at `now` stays until the next call.
 */
export function deleteExpired(
	db: Db,
	now: Date,
): { sessions: number; verifications: number } {
	return db.transaction((tx) => ({
		sessions: tx.delete(session).where(lt(session.expiresAt, now)).run()
			.changes,
		verifications: tx
			.delete(verification)
			.where(lt(verification.expiresAt, now))
			.run().changes,
	}));
}
