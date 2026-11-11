/**
 * The tables of the database.
 *
 * The tables `currency`, `program` and `transfer_rule` hold application data.
 * The seed script writes them from `src/server/db/seed/catalogue.ts`.
 *
 * The tables `user_account` and `balance_snapshot` hold user data.
 *
 * The tables `stripe_customer` and `stripe_event` hold the payment of the
 * supporter account: paragraph 4.6.1 of `docs/architecture.md`.
 *
 * The tables `user`, `session`, `account` and `verification` belong to Better
 * Auth. Paragraph 4 of `docs/architecture.md` gives the reason for one schema.
 * The table `jwks` and the tables `oauth_*` belong to its plugins of the MCP
 * server: paragraph 4.7.2.
 *
 * All the points are integers. All the dates are text in the ISO 8601 format.
 * Paragraph 3.3 of `docs/architecture.md` gives the reason. The tables of
 * Better Auth are the exception: that library reads and writes a `Date`, thus
 * those columns hold an integer of seconds.
 */

import { sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

/**
 * The user. Better Auth controls this table.
 *
 * The name of each property is the name of the field of Better Auth. The
 * Drizzle adapter finds a field with that name. The name of the column is free,
 * thus it keeps the form of the other tables of this file.
 */
export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	/**
	 * The end of the supporter account. Only the webhook of Stripe writes it,
	 * in `src/server/billing.ts`. Better Auth
	 * does not know these two columns, and the default values fill them at the
	 * sign-in. `accountTier` of `src/shared/tier.ts` reads them.
	 */
	supporterUntil: integer("supporter_until", { mode: "timestamp" }),
	/** The administrator writes this flag by hand. Paragraph 4.6. */
	unlimited: integer("unlimited", { mode: "boolean" }).notNull().default(false),
});

/** A session of a user. Better Auth controls this table. */
export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

/**
 * The credentials of a user. Better Auth controls this table.
 *
 * This table is not `user_account`. Better Auth keeps the account of Google
 * here, one row for each provider of the user. The column `password` stays
 * empty: Google is the only provider, but the model of Better Auth holds that
 * field. `user_account` holds the account of the user with a loyalty
 * programme.
 */
export const account = sqliteTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", {
		mode: "timestamp",
	}),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", {
		mode: "timestamp",
	}),
	scope: text("scope"),
	password: text("password"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/** A token with a limit of time. Better Auth controls this table. */
export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * The keys that sign the access tokens of the MCP server. The plugin `jwt` of
 * Better Auth controls this table. The plugin keeps the private key encrypted
 * with `BETTER_AUTH_SECRET`. Paragraph 4.7.2 of `docs/architecture.md`.
 */
export const jwks = sqliteTable("jwks", {
	id: text("id").primaryKey(),
	publicKey: text("public_key").notNull(),
	privateKey: text("private_key").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }),
	alg: text("alg"),
	crv: text("crv"),
});

/*
 * The seven tables below belong to the plugin `mcp` of Better Auth, the
 * authorisation server of the MCP server. Paragraph 4.7.2 of
 * `docs/architecture.md` gives the flow.
 *
 * A field of the type `string[]` or `json` is text: the Drizzle adapter writes
 * JSON in SQLite. Each reference to `user` removes the row with the user: the
 * removal of an account also removes each token of that person.
 */

/**
 * A client of the authorisation server, for example Claude. The plugin `cimd`
 * writes the row from the Client ID Metadata Document: `client_id` is the URL
 * of that document.
 */
export const oauthClient = sqliteTable(
	"oauth_client",
	{
		id: text("id").primaryKey(),
		clientId: text("client_id").notNull().unique(),
		clientSecret: text("client_secret"),
		clientDiscoveryId: text("client_discovery_id"),
		disabled: integer("disabled", { mode: "boolean" }).default(false),
		skipConsent: integer("skip_consent", { mode: "boolean" }),
		enableEndSession: integer("enable_end_session", { mode: "boolean" }),
		subjectType: text("subject_type"),
		scopes: text("scopes"),
		clientCredentialsScopes: text("client_credentials_scopes"),
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
		createdAt: integer("created_at", { mode: "timestamp" }),
		updatedAt: integer("updated_at", { mode: "timestamp" }),
		name: text("name"),
		uri: text("uri"),
		icon: text("icon"),
		contacts: text("contacts"),
		tos: text("tos"),
		policy: text("policy"),
		softwareId: text("software_id"),
		softwareVersion: text("software_version"),
		softwareStatement: text("software_statement"),
		redirectUris: text("redirect_uris").notNull(),
		postLogoutRedirectUris: text("post_logout_redirect_uris"),
		backchannelLogoutUri: text("backchannel_logout_uri"),
		backchannelLogoutSessionRequired: integer(
			"backchannel_logout_session_required",
			{ mode: "boolean" },
		),
		tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
		applicationType: text("application_type"),
		jwks: text("jwks"),
		jwksUri: text("jwks_uri"),
		grantTypes: text("grant_types"),
		responseTypes: text("response_types"),
		requirePKCE: integer("require_pkce", { mode: "boolean" }),
		dpopBoundAccessTokens: integer("dpop_bound_access_tokens", {
			mode: "boolean",
		}).default(false),
		referenceId: text("reference_id"),
		metadata: text("metadata"),
	},
	(table) => [index("oauth_client_user_id").on(table.userId)],
);

/** A protected resource. The MCP server of `/mcp` is the only one. */
export const oauthResource = sqliteTable("oauth_resource", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull().unique(),
	name: text("name").notNull(),
	accessTokenTtl: integer("access_token_ttl"),
	refreshTokenTtl: integer("refresh_token_ttl"),
	signingAlgorithm: text("signing_algorithm"),
	signingKeyId: text("signing_key_id"),
	allowedScopes: text("allowed_scopes"),
	customClaims: text("custom_claims"),
	dpopBoundAccessTokensRequired: integer("dpop_bound_access_tokens_required", {
		mode: "boolean",
	}).default(false),
	disabled: integer("disabled", { mode: "boolean" }).default(false),
	createdAt: integer("created_at", { mode: "timestamp" }),
	updatedAt: integer("updated_at", { mode: "timestamp" }),
	policyVersion: integer("policy_version").default(0),
	metadata: text("metadata"),
});

/** The resources that a client can ask for. */
export const oauthClientResource = sqliteTable(
	"oauth_client_resource",
	{
		id: text("id").primaryKey(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "cascade" }),
		resourceId: text("resource_id")
			.notNull()
			.references(() => oauthResource.identifier, { onDelete: "cascade" }),
		metadata: text("metadata"),
		createdAt: integer("created_at", { mode: "timestamp" }),
	},
	(table) => [
		index("oauth_client_resource_client_id").on(table.clientId),
		index("oauth_client_resource_resource_id").on(table.resourceId),
	],
);

/** A refresh token. The column `token` holds the hash, not the token. */
export const oauthRefreshToken = sqliteTable(
	"oauth_refresh_token",
	{
		id: text("id").primaryKey(),
		token: text("token").notNull().unique(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "cascade" }),
		sessionId: text("session_id").references(() => session.id, {
			onDelete: "set null",
		}),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		referenceId: text("reference_id"),
		authorizationCodeId: text("authorization_code_id"),
		resources: text("resources"),
		requestedUserInfoClaims: text("requested_user_info_claims"),
		expiresAt: integer("expires_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" }),
		revoked: integer("revoked", { mode: "timestamp" }),
		rotatedAt: integer("rotated_at", { mode: "timestamp" }),
		rotationReplayResponse: text("rotation_replay_response"),
		rotationReplayExpiresAt: integer("rotation_replay_expires_at", {
			mode: "timestamp",
		}),
		authTime: integer("auth_time", { mode: "timestamp" }),
		confirmation: text("confirmation"),
		scopes: text("scopes").notNull(),
	},
	(table) => [
		index("oauth_refresh_token_client_id").on(table.clientId),
		index("oauth_refresh_token_session_id").on(table.sessionId),
		index("oauth_refresh_token_user_id").on(table.userId),
		index("oauth_refresh_token_authorization_code_id").on(
			table.authorizationCodeId,
		),
	],
);

/**
 * An opaque access token. The MCP server receives a JWT, and the plugin keeps
 * no row for a JWT. The column `token` holds the hash, not the token.
 */
export const oauthAccessToken = sqliteTable(
	"oauth_access_token",
	{
		id: text("id").primaryKey(),
		token: text("token").unique(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "cascade" }),
		sessionId: text("session_id").references(() => session.id, {
			onDelete: "set null",
		}),
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
		referenceId: text("reference_id"),
		authorizationCodeId: text("authorization_code_id"),
		resources: text("resources"),
		requestedUserInfoClaims: text("requested_user_info_claims"),
		refreshId: text("refresh_id").references(() => oauthRefreshToken.id, {
			onDelete: "cascade",
		}),
		expiresAt: integer("expires_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" }),
		revoked: integer("revoked", { mode: "timestamp" }),
		confirmation: text("confirmation"),
		scopes: text("scopes").notNull(),
	},
	(table) => [
		index("oauth_access_token_client_id").on(table.clientId),
		index("oauth_access_token_session_id").on(table.sessionId),
		index("oauth_access_token_user_id").on(table.userId),
		index("oauth_access_token_authorization_code_id").on(
			table.authorizationCodeId,
		),
		index("oauth_access_token_refresh_id").on(table.refreshId),
	],
);

/** The scopes that a user accepted for a client. One row for each pair. */
export const oauthConsent = sqliteTable(
	"oauth_consent",
	{
		id: text("id").primaryKey(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "cascade" }),
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
		referenceId: text("reference_id"),
		resources: text("resources"),
		requestedUserInfoClaims: text("requested_user_info_claims"),
		scopes: text("scopes").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" }),
		updatedAt: integer("updated_at", { mode: "timestamp" }),
	},
	(table) => [
		index("oauth_consent_client_id").on(table.clientId),
		index("oauth_consent_user_id").on(table.userId),
	],
);

/** The assertions of a client that the server already accepted, against a replay. */
export const oauthClientAssertion = sqliteTable("oauth_client_assertion", {
	id: text("id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

/** A currency of points or of miles. More than one programme can use one currency. */
export const currency = sqliteTable("currency", {
	id: text("id").primaryKey(),
	code: text("code").notNull().unique(),
	name: text("name").notNull(),
	kind: text("kind", {
		enum: ["airline", "flexible", "hotel", "rail"],
	}).notNull(),
});

/** A loyalty programme. The user has an account with a programme. */
export const program = sqliteTable("program", {
	id: text("id").primaryKey(),
	currencyId: text("currency_id")
		.notNull()
		.references(() => currency.id),
	code: text("code").notNull().unique(),
	name: text("name").notNull(),
	transferable: integer("transferable", { mode: "boolean" }).notNull(),
});

/**
 * A rule for a transfer from one programme to one other programme.
 *
 * The key is the pair of programmes with `country` and with `valid_from`. Thus
 * one pair in one country cannot have two rules that start on the same day, and
 * two countries can hold a different rule for the same pair. A rule is
 * historical data: to change a ratio, write a date in `valid_to` and add a new
 * rule.
 *
 * The column `country` holds a country in the ISO 3166-1 alpha-2 format. The
 * catalogue holds `IT` only now. Paragraph 3.3.2 of `docs/architecture.md`
 * gives the reason.
 */
export const transferRule = sqliteTable(
	"transfer_rule",
	{
		fromProgramId: text("from_program_id")
			.notNull()
			.references(() => program.id),
		toProgramId: text("to_program_id")
			.notNull()
			.references(() => program.id),
		country: text("country").notNull(),
		ratioNum: integer("ratio_num").notNull(),
		ratioDen: integer("ratio_den").notNull(),
		minTransfer: integer("min_transfer").notNull(),
		increment: integer("increment").notNull(),
		validFrom: text("valid_from").notNull(),
		validTo: text("valid_to"),
	},
	(table) => [
		primaryKey({
			columns: [
				table.fromProgramId,
				table.toProgramId,
				table.country,
				table.validFrom,
			],
		}),
	],
);

/**
 * An account of the user with a programme.
 *
 * The removal of a user removes the accounts of that user, and then the
 * snapshots of those accounts.
 */
export const userAccount = sqliteTable("user_account", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	programId: text("program_id")
		.notNull()
		.references(() => program.id),
});

/**
 * A currency that the user marks as a favourite.
 *
 * The row marks a currency, not a programme. The dashboard shows one card for
 * one currency, and the heart of that card writes this row. Six programmes use
 * Avios, thus a favourite of a programme gives six marks for one card.
 *
 * The key is the pair of the user and the currency. Therefore one user marks
 * one currency one time, and a second mark changes no row.
 */
export const favoriteCurrency = sqliteTable(
	"favorite_currency",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		currencyId: text("currency_id")
			.notNull()
			.references(() => currency.id),
	},
	(table) => [primaryKey({ columns: [table.userId, table.currencyId] })],
);

/**
 * The balance of an account at a date.
 *
 * The current balance is the most recent snapshot of the account. The database
 * keeps no record of the changes. Paragraph 3.2 of `docs/architecture.md` gives
 * the reason.
 *
 * The column `observed_at` holds a date with no time. The column `created_at`
 * holds the moment of the write, with the milliseconds. Thus of two snapshots
 * with the same date, the snapshot that the user wrote last is the current
 * balance.
 */
export const balanceSnapshot = sqliteTable(
	"balance_snapshot",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id")
			.notNull()
			.references(() => userAccount.id, { onDelete: "cascade" }),
		points: integer("points").notNull(),
		observedAt: text("observed_at").notNull(),
		createdAt: text("created_at").notNull(),
	},
	(table) => [
		// The application reads the most recent snapshot of an account.
		index("balance_snapshot_account_observed_at").on(
			table.accountId,
			sql`${table.observedAt} desc`,
			sql`${table.createdAt} desc`,
		),
	],
);

/**
 * A quantity of points of a snapshot that expires at a date.
 *
 * The lots belong to the snapshot, not to the account. A new balance then
 * holds its own lots, and the sum of the lots stays below the balance of the
 * same snapshot. The schema of the API examines that sum. Paragraph 3.2.1 of
 * `docs/architecture.md` gives the reason.
 *
 * The key is the pair of the snapshot and the date: one snapshot holds one lot
 * for one date. The column `expires_on` holds a date with no time.
 */
export const expiryLot = sqliteTable(
	"expiry_lot",
	{
		snapshotId: text("snapshot_id")
			.notNull()
			.references(() => balanceSnapshot.id, { onDelete: "cascade" }),
		expiresOn: text("expires_on").notNull(),
		points: integer("points").notNull(),
	},
	(table) => [primaryKey({ columns: [table.snapshotId, table.expiresOn] })],
);

/**
 * The customer of Stripe of a user, with the state of the subscription.
 *
 * The checkout writes the row when it makes the customer, before the payment.
 * Only the webhook of Stripe writes the other columns. The columns hold no
 * date of the subscription: `user.supporter_until` holds the end of the
 * period that the user paid. Paragraph 4.6.1 of `docs/architecture.md`.
 */
export const stripeCustomer = sqliteTable("stripe_customer", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	customerId: text("customer_id").notNull().unique(),
	/** The last subscription of the customer, or null before the first one. */
	subscriptionId: text("subscription_id").unique(),
	/** The status of that subscription in Stripe, for example `active`. */
	status: text("status"),
	/** True when the subscription stops at the end of the period. */
	cancels: integer("cancels", { mode: "boolean" }).notNull().default(false),
	/**
	 * The field `created` of the last event that the webhook applied, in the
	 * ISO 8601 format. Stripe gives no order of delivery: an older event does
	 * not write the row.
	 */
	lastEventAt: text("last_event_at"),
	createdAt: text("created_at").notNull(),
});

/**
 * An event of Stripe that the webhook processed. Stripe can send one event
 * more than one time: the id stops the second write. `deleteExpired` removes
 * a row after 30 days, because Stripe tries again for 3 days at most.
 */
export const stripeEvent = sqliteTable("stripe_event", {
	id: text("id").primaryKey(),
	type: text("type").notNull(),
	receivedAt: text("received_at").notNull(),
});
