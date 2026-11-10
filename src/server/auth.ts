/**
 * The instance of Better Auth.
 *
 * Better Auth keeps the sessions in SQLite with the Drizzle adapter. Thus one
 * schema and one pipeline of migrations control all the tables. Paragraph 4 of
 * `docs/architecture.md` gives the decisions.
 *
 * Google is the only provider. Yume holds no password and sends no email. The
 * first sign-in of a Google account makes the user, thus the registration is
 * open. Paragraph 4.1 of `docs/architecture.md` gives the reasons.
 *
 * This file holds no Italian text. The client reads the field `code` of an
 * error and shows the message. Refer to the section Language rules in
 * `CLAUDE.md`.
 */

import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
import type { Db } from "./db/index.ts";
import * as schema from "./db/schema.ts";

/**
 * The hosts of the machine itself.
 *
 * A browser accepts a cookie with the attribute `secure` from these hosts on a
 * plain HTTP connection. Thus the development of the client needs no
 * certificate.
 */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Examines if the cookies of the session need the attribute `secure`.
 *
 * Better Auth reads the protocol of `baseURL`, and it gives that attribute to
 * an origin with `https` only. Therefore an installation on
 * `http://nas.local:3000` sends the session of each user in clear text on the
 * network of the home, and no message tells that to the administrator.
 *
 * Yume gives that attribute to each origin that is not the machine itself. A
 * browser then removes the cookie on a plain HTTP connection, and the sign-in
 * is not possible. Paragraph 7 of `docs/architecture.md` gives the three tools
 * for the TLS.
 *
 * A value that this function cannot read gives true: a defect in the variable
 * of the environment must not remove the protection.
 */
export function needsSecureCookies(baseURL: string): boolean {
	try {
		return !LOOPBACK.has(new URL(baseURL).hostname);
	} catch {
		return true;
	}
}

/**
 * The columns of the table `account` that hold a token of Google or its
 * expiry.
 *
 * Yume reads no token: Better Auth owns the session, and Google only proves
 * the email address at the sign-in. Better Auth writes the tokens at each
 * sign-in in clear text, thus a hook of the database writes null in their
 * place. The GDPR asks for the minimum of data (art. 5(1)(c)). The `sub` of
 * Google stays in `accountId`: the next sign-in finds the user with it.
 */
const NO_TOKENS = {
	accessToken: null,
	refreshToken: null,
	idToken: null,
	accessTokenExpiresAt: null,
	refreshTokenExpiresAt: null,
};

/**
 * The scopes of the MCP server. `balances` gives the four tools, and
 * `offline_access` gives the refresh token. The server gives no scope `profile`
 * and no scope `email`: paragraph 4.1 keeps no name and no photo, and an agent
 * needs no address to read the balances. Paragraph 4.7.2 of
 * `docs/architecture.md` gives the decision.
 */
export const MCP_SCOPES = ["balances", "offline_access"] as const;

/**
 * The URL of the MCP server: the path `/mcp` of the origin.
 *
 * The person writes this URL in the client. The field `resource` of the
 * metadata must be equal to it, and the audience of each token holds it.
 */
export function mcpResource(baseURL: string): string {
	return new URL("/mcp", baseURL).href;
}

/**
 * Examines if the origin can hold the MCP server.
 *
 * The plugin `mcp` refuses a resource on plain HTTP, except on the machine
 * itself, and it stops the process at the start. An installation on
 * `http://nas.local:3000` then starts with no MCP server. The sign-in with
 * Google is also not possible on that origin: paragraph 4.2 of
 * `docs/architecture.md`. A value that this function cannot read gives false.
 */
export function canServeMcp(baseURL: string): boolean {
	try {
		const url = new URL(baseURL);
		return url.protocol === "https:" || LOOPBACK.has(url.hostname);
	} catch {
		return false;
	}
}

export type AuthOptions = {
	/** The key of the signature of the cookies and of the tokens. */
	secret: string;
	/** The origin of the application, for example `https://yume.example.com`. */
	baseURL: string;
	/** The other origins that can send a request. The client of Vite is one. */
	trustedOrigins?: string[];
	/** The OAuth client of Google. Each installation has its own client. */
	google: { clientId: string; clientSecret: string };
	/**
	 * The transport that reads the Client ID Metadata Document of a client. The
	 * default is the transport of `@better-auth/cimd/node`. A test gives its
	 * own transport, because no test reaches the network.
	 */
	fetchClientMetadataResource?: MetadataFetch;
};

type MetadataFetch = Parameters<typeof cimd>[0]["fetchClientMetadataResource"];

/**
 * The plugins of the MCP server. Paragraph 4.7.2 of `docs/architecture.md`
 * gives the flow.
 */
function mcpPlugins(baseURL: string, fetchMetadata: MetadataFetch) {
	return [
		/** It signs the access tokens. It keeps its keys in the table `jwks`. */
		jwt(),
		/**
		 * The authorisation server of the MCP server. The plugin sends a
		 * person with no session to `/login`, and then to `/consent`.
		 *
		 * The token endpoint gives no `client_credentials`: a token with no
		 * user reads the data of no person, and Claude does not use it.
		 */
		mcp({
			resource: mcpResource(baseURL),
			loginPage: "/login",
			consentPage: "/consent",
			scopes: [...MCP_SCOPES],
			grantTypes: ["authorization_code", "refresh_token"],
		}),
		/**
		 * The registration of a client with its Client ID Metadata Document.
		 * Dynamic Client Registration stays off: it makes one new client for
		 * each new connection.
		 *
		 * The transport of the package resolves the name one time, refuses an
		 * address that is not public, keeps that address for the connection
		 * and follows no redirect. Thus a client cannot make the server read
		 * an address of the home network.
		 */
		cimd({
			fetchClientMetadataResource: fetchMetadata,
			metadataProfile: "mcp-2026-07-28",
		}),
	];
}

export function createAuth(db: Db, options: AuthOptions) {
	return betterAuth({
		database: drizzleAdapter(db, { provider: "sqlite", schema }),
		secret: options.secret,
		baseURL: options.baseURL,
		basePath: "/api/auth",
		trustedOrigins: options.trustedOrigins,
		socialProviders: {
			google: {
				clientId: options.google.clientId,
				clientSecret: options.google.clientSecret,
				/**
				 * Yume asks for the email address only. The scope `profile`
				 * gives the name and the photo, and Yume shows neither: the GDPR
				 * asks for the minimum of data (art. 5(1)(c)).
				 */
				disableDefaultScope: true,
				scope: ["openid", "email"],
				/**
				 * Without this option, Better Auth sends
				 * `include_granted_scopes=true`. Google then adds each scope that
				 * the person gave to the same client in the past. A version of
				 * Yume before 2026-11-09 asked for `profile`, thus the token of an
				 * early user holds the name and the photo again.
				 */
				includeGrantedScopes: false,
				/**
				 * A guard for a future change of the scopes: the table `user`
				 * keeps no name and no photo. The name is an empty text, because
				 * the column is not null in the model of Better Auth.
				 */
				mapProfileToUser: () => ({ name: "", image: undefined }),
			},
		},

		databaseHooks: {
			account: {
				create: {
					before: async (data) => ({ data: { ...data, ...NO_TOKENS } }),
				},
				update: {
					before: async (data) => ({ data: { ...data, ...NO_TOKENS } }),
				},
			},
		},

		plugins: canServeMcp(options.baseURL)
			? mcpPlugins(
					options.baseURL,
					options.fetchClientMetadataResource ?? fetchClientMetadataResource,
				)
			: [],

		/**
		 * The cookie of the session holds the attribute `secure` on each origin
		 * of the network. Without this option, Better Auth gives that attribute
		 * to an origin with `https` only.
		 */
		advanced: { useSecureCookies: needsSecureCookies(options.baseURL) },
	});
}

export type Auth = ReturnType<typeof createAuth>;
