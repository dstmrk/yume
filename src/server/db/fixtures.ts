/**
 * The rows that a test needs before it writes user data.
 *
 * The column `user_account.user_id` refers to `user.id`. Therefore a test that
 * makes an account must make the user first. The application does not use this
 * file: Better Auth writes the table `user` at the first sign-in.
 *
 * This file holds no logic, thus it has no test file.
 */

import { makeSignature } from "better-auth/crypto";
import type { Auth } from "../auth.ts";
import type { Db } from "./index.ts";
import {
	oauthAccessToken,
	oauthClient,
	oauthConsent,
	oauthRefreshToken,
	user,
} from "./schema.ts";

/** Writes a user with the given id. It gives the same id. */
export function insertUser(db: Db, id: string): string {
	const now = new Date();
	db.insert(user)
		.values({
			id,
			name: id,
			email: `${id}@example.com`,
			emailVerified: false,
			createdAt: now,
			updatedAt: now,
		})
		.run();
	return id;
}

/**
 * Makes a session for a user and gives the cookie of the request.
 *
 * The sign-in goes through Google, and a test of a route has no Google. Thus
 * this function writes the session with the adapter of Better Auth, and it
 * signs the token with the key of the instance, as the callback does.
 */
export async function sessionCookie(
	auth: Auth,
	userId: string,
): Promise<string> {
	const context = await auth.$context;
	const session = await context.internalAdapter.createSession(userId);
	const signature = await makeSignature(session.token, context.secret);
	return `${context.authCookies.sessionToken.name}=${session.token}.${signature}`;
}

/**
 * Writes a client of OAuth, as the plugin `cimd` writes it from the Client ID
 * Metadata Document. The column `redirect_uris` holds a JSON array.
 */
export function insertOAuthClient(
	db: Db,
	clientId: string,
	fields: { name?: string | null; redirectUris?: string } = {},
): string {
	db.insert(oauthClient)
		.values({
			id: `row-${clientId}`,
			clientId,
			name: fields.name === undefined ? "Claude" : fields.name,
			redirectUris:
				fields.redirectUris ??
				JSON.stringify(["https://claude.ai/api/mcp/auth_callback"]),
		})
		.run();
	return clientId;
}

/**
 * Writes the consent of a user for a client, with one refresh token and one
 * access token. `id` makes the ids of the three rows. The times are seconds:
 * the columns hold no milliseconds.
 */
export function insertConnection(
	db: Db,
	input: {
		id: string;
		userId: string;
		clientId: string;
		createdAt?: Date;
		expiresAt?: Date;
	},
): void {
	const createdAt = input.createdAt ?? new Date("2026-11-01T10:00:00Z");
	const expiresAt = input.expiresAt ?? new Date("2099-01-01T00:00:00Z");
	const scopes = JSON.stringify(["balances", "offline_access"]);
	db.insert(oauthConsent)
		.values({
			id: `consent-${input.id}`,
			clientId: input.clientId,
			userId: input.userId,
			scopes,
			createdAt,
			updatedAt: createdAt,
		})
		.run();
	db.insert(oauthRefreshToken)
		.values({
			id: `refresh-${input.id}`,
			token: `hash-refresh-${input.id}`,
			clientId: input.clientId,
			userId: input.userId,
			scopes,
			expiresAt,
			createdAt,
		})
		.run();
	db.insert(oauthAccessToken)
		.values({
			id: `access-${input.id}`,
			token: `hash-access-${input.id}`,
			clientId: input.clientId,
			userId: input.userId,
			scopes,
			expiresAt,
			createdAt,
		})
		.run();
}
