import {
	and,
	asc,
	desc,
	eq,
	inArray,
	isNotNull,
	lt,
	or,
	sql,
} from "drizzle-orm";
import type { AccountRow, Connection, ExpiryLot } from "../../shared/api.ts";
import type { TierSource } from "../../shared/tier.ts";
import type { Db } from "./index.ts";
import {
	balanceSnapshot,
	currency,
	expiryLot,
	favoriteCurrency,
	oauthAccessToken,
	oauthClient,
	oauthConsent,
	oauthRefreshToken,
	program,
	session,
	stripeEvent,
	transferRule,
	user,
	userAccount,
	verification,
} from "./schema.ts";

/**
 * Gives each account of the user with its current balance.
 *
 * The current balance is the most recent snapshot of the account: the latest
 * `observed_at`, then the latest `created_at`. Thus a correction on the same
 * day replaces the value before it. The id is random and it gives no order of
 * the writes. `rowid` is the last key, for two writes in one millisecond.
 * Paragraph 3.2 of `docs/architecture.md` gives the reason.
 */
export function currentBalances(db: Db, userId: string): AccountRow[] {
	const rows = db
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

	const lots = lotsOf(
		db,
		rows.flatMap((row) => (row.snapshotId === null ? [] : [row.snapshotId])),
	);
	return rows.map((row) => ({
		...row,
		lots:
			(row.snapshotId === null ? undefined : lots.get(row.snapshotId)) ?? [],
	}));
}

/**
 * Gives the expiry lots of each snapshot, in the order of the date.
 *
 * The user holds a maximum of `MAX_ACCOUNTS_PER_USER` accounts, thus the list
 * of the ids stays below the limit of the parameters of SQLite.
 */
function lotsOf(db: Db, snapshotIds: string[]): Map<string, ExpiryLot[]> {
	const result = new Map<string, ExpiryLot[]>();
	if (snapshotIds.length === 0) {
		return result;
	}
	const rows = db
		.select()
		.from(expiryLot)
		.where(inArray(expiryLot.snapshotId, snapshotIds))
		.orderBy(asc(expiryLot.expiresOn))
		.all();
	for (const row of rows) {
		const list = result.get(row.snapshotId) ?? [];
		list.push({ points: row.points, expiresOn: row.expiresOn });
		result.set(row.snapshotId, list);
	}
	return result;
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
		snapshot?: { points: number; observedAt: string; lots?: ExpiryLot[] };
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
 * The snapshot and its expiry lots are one transaction: a lot that the
 * database refuses leaves no snapshot. The function does not examine the sum
 * of the lots: `addSnapshotSchema` of `src/shared/api.ts` does that.
 *
 * The database keeps each snapshot. It keeps no record of the changes. The
 * column `created_at` receives the moment of the write, thus this snapshot
 * comes after each snapshot of the same date.
 */
export function addSnapshot(
	db: Pick<Db, "transaction">,
	input: {
		accountId: string;
		points: number;
		observedAt: string;
		lots?: ExpiryLot[];
	},
): string {
	const id = crypto.randomUUID();
	const lots = input.lots ?? [];
	db.transaction((tx) => {
		tx.insert(balanceSnapshot)
			.values({
				id,
				accountId: input.accountId,
				points: input.points,
				observedAt: input.observedAt,
				createdAt: new Date().toISOString(),
			})
			.run();
		if (lots.length > 0) {
			tx.insert(expiryLot)
				.values(lots.map((lot) => ({ snapshotId: id, ...lot })))
				.run();
		}
	});
	return id;
}

/**
 * The time that the id of an event of Stripe stays. Stripe tries an event
 * again for 3 days at most, thus 30 days give a large margin.
 */
export const STRIPE_EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Removes each expired row of `session` and of `verification`, and each id of
 * an event of Stripe after `STRIPE_EVENT_RETENTION_MS`. It gives the quantity
 * of rows that it removes from each table.
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
): {
	sessions: number;
	verifications: number;
	accessTokens: number;
	refreshTokens: number;
	stripeEvents: number;
} {
	const eventsBefore = new Date(
		now.getTime() - STRIPE_EVENT_RETENTION_MS,
	).toISOString();
	return db.transaction((tx) => ({
		sessions: tx.delete(session).where(lt(session.expiresAt, now)).run()
			.changes,
		verifications: tx
			.delete(verification)
			.where(lt(verification.expiresAt, now))
			.run().changes,
		// The tokens of the MCP server. A revoked refresh token is of no use: a
		// new token replaced it. Paragraph 4.7.2 of `docs/architecture.md`.
		accessTokens: tx
			.delete(oauthAccessToken)
			.where(lt(oauthAccessToken.expiresAt, now))
			.run().changes,
		refreshTokens: tx
			.delete(oauthRefreshToken)
			.where(
				or(
					lt(oauthRefreshToken.expiresAt, now),
					isNotNull(oauthRefreshToken.revoked),
				),
			)
			.run().changes,
		// The ids of the events of Stripe. Paragraph 4.6.1 of
		// `docs/architecture.md`.
		stripeEvents: tx
			.delete(stripeEvent)
			.where(lt(stripeEvent.receivedAt, eventsBefore))
			.run().changes,
	}));
}

/**
 * The host of the first redirect URI of a client. The column holds a JSON
 * array. A value that this function cannot read gives an empty text.
 */
function redirectHost(redirectUris: string): string {
	try {
		const uris: unknown = JSON.parse(redirectUris);
		const first = Array.isArray(uris) ? uris[0] : undefined;
		return typeof first === "string" ? new URL(first).hostname : "";
	} catch {
		return "";
	}
}

/**
 * The assistants that a user authorised on the MCP server, the newest first.
 * Each row is one consent. Issue #97.
 */
export function listConnections(db: Db, userId: string): Connection[] {
	return db
		.select({
			clientId: oauthConsent.clientId,
			name: oauthClient.name,
			redirectUris: oauthClient.redirectUris,
			createdAt: oauthConsent.createdAt,
		})
		.from(oauthConsent)
		.innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
		.where(eq(oauthConsent.userId, userId))
		.orderBy(desc(oauthConsent.createdAt))
		.all()
		.map((row) => ({
			clientId: row.clientId,
			name: row.name === null || row.name === "" ? row.clientId : row.name,
			host: redirectHost(row.redirectUris),
			connectedAt: (row.createdAt ?? new Date(0)).toISOString(),
		}));
}

/**
 * Removes the consent and each token of one client of one user. It gives true
 * if a consent existed.
 *
 * The plugin removes the consent only, and a refresh token then makes new
 * access tokens. Each condition holds the user and the client: with CIMD,
 * each user of Claude has the same client. Issue #97.
 */
export function revokeConnection(
	db: Db,
	userId: string,
	clientId: string,
): boolean {
	return db.transaction((tx) => {
		tx.delete(oauthAccessToken)
			.where(
				and(
					eq(oauthAccessToken.userId, userId),
					eq(oauthAccessToken.clientId, clientId),
				),
			)
			.run();
		tx.delete(oauthRefreshToken)
			.where(
				and(
					eq(oauthRefreshToken.userId, userId),
					eq(oauthRefreshToken.clientId, clientId),
				),
			)
			.run();
		return (
			tx
				.delete(oauthConsent)
				.where(
					and(
						eq(oauthConsent.userId, userId),
						eq(oauthConsent.clientId, clientId),
					),
				)
				.run().changes > 0
		);
	});
}

/**
 * Examines if the user still holds a consent for the client. `/mcp` reads it
 * at each request: a JWT stays valid after a revocation until its expiry.
 */
export function hasConnection(
	db: Db,
	userId: string,
	clientId: string,
): boolean {
	return (
		db
			.select({ id: oauthConsent.id })
			.from(oauthConsent)
			.where(
				and(
					eq(oauthConsent.userId, userId),
					eq(oauthConsent.clientId, clientId),
				),
			)
			.get() !== undefined
	);
}

/** A row of the list of the users, for the administrator. */
export type UserRow = {
	id: string;
	email: string;
	createdAt: Date;
	supporterUntil: Date | null;
	unlimited: boolean;
};

/**
 * Gives each user, the newest user first.
 *
 * The list holds no account, no balance and no programme: the administrator does not need
 * them, and the GDPR asks for the minimum of data (art. 5(1)(c)). The id is the
 * second key, thus two users of the same instant keep one order. Paragraph 4.8
 * of `docs/architecture.md` gives the rule.
 */
export function listUsers(db: Db): UserRow[] {
	return db
		.select({
			id: user.id,
			email: user.email,
			createdAt: user.createdAt,
			supporterUntil: user.supporterUntil,
			unlimited: user.unlimited,
		})
		.from(user)
		.orderBy(desc(user.createdAt), asc(user.id))
		.all();
}

/**
 * Writes the flag `unlimited` of a user. It gives false if the user does not
 * exist.
 *
 * The function does not write `supporter_until`: only the payment writes that
 * column. Paragraph 4.6 of `docs/architecture.md` gives the two writers.
 */
export function setUnlimited(
	db: Db,
	userId: string,
	unlimited: boolean,
): boolean {
	const result = db
		.update(user)
		.set({ unlimited, updatedAt: new Date() })
		.where(eq(user.id, userId))
		.run();
	return result.changes > 0;
}

/**
 * The two columns of the user that give the level of the account. A user that
 * does not exist gives the values of a free account.
 */
export function tierSourceOf(db: Db, userId: string): TierSource {
	const row = db
		.select({ supporterUntil: user.supporterUntil, unlimited: user.unlimited })
		.from(user)
		.where(eq(user.id, userId))
		.get();
	return row ?? { supporterUntil: null, unlimited: false };
}

/**
 * The programme of each account of the user. A programme can repeat: the user
 * can hold two accounts of one programme.
 */
export function accountProgramIds(db: Db, userId: string): string[] {
	return db
		.select({ programId: userAccount.programId })
		.from(userAccount)
		.where(eq(userAccount.userId, userId))
		.all()
		.map((row) => row.programId);
}
