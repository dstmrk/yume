/**
 * The instance of Better Auth.
 *
 * Better Auth keeps the sessions in SQLite with the Drizzle adapter. Thus one
 * schema and one pipeline of migrations control all the tables. Paragraph 4 of
 * `docs/architecture.md` gives the decisions.
 *
 * Email verification is OFF: the application needs no SMTP server. Therefore a
 * user with a forgotten password needs the administrator.
 *
 * This file holds no Italian text. The client reads the field `code` of an
 * error and shows the message. Refer to the section Language rules in
 * `CLAUDE.md`.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { InvitationState } from "../shared/api.ts";
import type { Db } from "./db/index.ts";
import {
	countUsers,
	findInvitation,
	markInvitationUsed,
} from "./db/queries.ts";
import * as schema from "./db/schema.ts";
import { invitationState } from "./invitation.ts";

/** The path of the sign-up with an email address and a password. */
const SIGN_UP = "/sign-up/email";

/** The code of the error of a code that no invitation has. */
const UNKNOWN = "INVITE_CODE_UNKNOWN";

/** The code of the error for each state of an invitation that is not valid. */
const errorCode: Record<Exclude<InvitationState, "valid">, string> = {
	expired: "INVITE_CODE_EXPIRED",
	used: "INVITE_CODE_USED",
};

/** Reads the field `inviteCode` of a body that has an unknown shape. */
function readInviteCode(body: unknown): string | undefined {
	if (typeof body !== "object" || body === null) {
		return undefined;
	}
	const code = (body as { inviteCode?: unknown }).inviteCode;
	return typeof code === "string" && code.length > 0 ? code : undefined;
}

export type AuthOptions = {
	/** The key of the signature of the cookies and of the tokens. */
	secret: string;
	/** The origin of the application, for example `https://yume.example.com`. */
	baseURL: string;
	/** The other origins that can send a request. The client of Vite is one. */
	trustedOrigins?: string[];
	/**
	 * The code of the first user. The server makes this code at the start and it
	 * writes the code in the log, only while the database holds no user. The
	 * sign-up accepts the code in the same condition. Thus the first user comes
	 * from the interface and no code stays in the image.
	 */
	setupCode?: string;
};

export function createAuth(db: Db, options: AuthOptions) {
	return betterAuth({
		database: drizzleAdapter(db, { provider: "sqlite", schema }),
		secret: options.secret,
		baseURL: options.baseURL,
		basePath: "/api/auth",
		trustedOrigins: options.trustedOrigins,
		emailAndPassword: { enabled: true },

		hooks: {
			/**
			 * A sign-up from the network needs an invitation that is valid, or
			 * the code of the setup for the first user.
			 *
			 * A call of `auth.api` holds no `request`. That code runs on the
			 * machine of the server and it already has the database, thus it
			 * needs no invitation.
			 */
			before: createAuthMiddleware(async (ctx) => {
				if (ctx.path !== SIGN_UP || ctx.request === undefined) {
					return;
				}

				const code = readInviteCode(ctx.body);
				if (code === undefined) {
					throw new APIError("BAD_REQUEST", {
						code: "INVITE_CODE_REQUIRED",
						message: "This application needs an invitation code.",
					});
				}

				/**
				 * The first user. No person can write an invitation before this
				 * user, thus the code of the setup gives the access one time. The
				 * server writes that code in the log at the start.
				 *
				 * The condition reads the database at each request. Therefore the
				 * code dies with the first user, also in the same process.
				 */
				if (countUsers(db) === 0) {
					if (options.setupCode === undefined || code !== options.setupCode) {
						throw new APIError("BAD_REQUEST", {
							code: UNKNOWN,
							message: "The code of the setup is not correct.",
						});
					}
					return;
				}

				const found = findInvitation(db, code);
				if (found === undefined) {
					throw new APIError("BAD_REQUEST", {
						code: UNKNOWN,
						message: "The invitation code is unknown.",
					});
				}

				const state = invitationState(found, new Date().toISOString());
				if (state !== "valid") {
					throw new APIError("BAD_REQUEST", {
						code: errorCode[state],
						message: `The invitation code is ${state}.`,
					});
				}
			}),
		},

		databaseHooks: {
			user: {
				create: {
					/**
					 * Marks the invitation of the new user.
					 *
					 * The hook `before` examined the code. This hook needs the id of
					 * the user, thus it writes the row after the creation. If the
					 * sign-up stops between the two hooks, the code stays free.
					 *
					 * The code of the setup has no row: no user wrote it.
					 */
					after: async (created, context) => {
						const code = readInviteCode(context?.body);
						if (code === undefined || code === options.setupCode) {
							return;
						}
						const marked = markInvitationUsed(db, {
							code,
							userId: created.id,
							at: new Date().toISOString(),
						});
						if (!marked) {
							console.error(
								`The invitation ${code} was used between the two hooks.`,
							);
						}
					},
				},
			},
		},
	});
}

export type Auth = ReturnType<typeof createAuth>;
