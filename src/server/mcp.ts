/**
 * The MCP server of Yume, on the path `/mcp`.
 *
 * An agent, for example Claude, reads the balances and the potential miles of
 * a person with an access token of the authorisation server of `auth.ts`. The
 * server keeps no session of MCP: each request makes a new server, and the
 * transport answers with JSON. Thus a restart of the container breaks no
 * connection. Paragraph 4.7 of `docs/architecture.md` gives the decisions.
 *
 * The text of the tools is English: the agent translates it for the person,
 * and the server holds no Italian text. A description states the operation of
 * the tool and gives no instruction to the agent. Paragraph 4.7.3.
 */

import { requireMcpAuth } from "@better-auth/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { DEFAULT_COUNTRY } from "../shared/catalogue.ts";
import { isValidAt } from "../shared/conversion.ts";
import { canUseMcp } from "../shared/tier.ts";
import type { Auth } from "./auth.ts";
import type { Db } from "./db/index.ts";
import {
	allCurrencies,
	allPrograms,
	allTransferRules,
	currentBalances,
	hasConnection,
} from "./db/queries.ts";
import {
	entitlementOf,
	latestObservedAt,
	potentialOf,
	recordSnapshot,
	type SnapshotResult,
	today,
} from "./operations.ts";

/**
 * The warning of each result of `get_potential`. The rules of the interface
 * apply also to the agent: the value is a calculation, and a transfer is
 * permanent. It is data in the result, not an instruction in a description.
 */
export const POTENTIAL_NOTICE =
	"Potential miles are a calculation from the current balances and the transfer rules, not a balance. A transfer of points between programmes is permanent.";

/** The error of each tool for a free account on the official instance. */
export const SUPPORTER_NOTICE =
	"The MCP server of Yume needs a supporter account. This account is a free account.";

/**
 * The authentication of each tool, for ChatGPT. Each tool needs the access
 * token with the scope `balances`: `offline_access` gives the refresh token,
 * not a permission of a tool. The transport refuses a request with no token
 * before it reaches a tool, thus no tool is anonymous. The SDK gives no field
 * `securitySchemes` on the tool, thus the value is in `_meta`, as the
 * documentation of OpenAI shows. Paragraph 4.7.2 of `docs/architecture.md`.
 */
const AUTHENTICATED = {
	securitySchemes: [{ type: "oauth2", scopes: ["balances"] }],
};

/**
 * The hints of each tool. Each tool reads or writes the data of Yume only, not
 * a public system: openWorldHint is false. The directory of OpenAI asks for an
 * explicit value of each hint. Paragraph 4.7.3.
 */
const READS = {
	readOnlyHint: true,
	destructiveHint: false,
	openWorldHint: false,
} as const;

const lotOutput = z.object({
	points: z.number().int(),
	expiresOn: z.string(),
});

/** The output of `list_accounts`. The SDK examines each result with it. */
const accountsOutput = {
	accounts: z.array(
		z.object({
			accountId: z.string(),
			programId: z.string(),
			programName: z.string(),
			currencyId: z.string().nullable(),
			points: z.number().int().nullable(),
			observedAt: z.string().nullable(),
			lots: z.array(lotOutput),
		}),
	),
};

/** The output of `get_potential`: `PotentialMiles` of `src/shared/`. */
const potentialOutput = {
	at: z.string(),
	notice: z.string(),
	potential: z.array(
		z.object({
			currencyId: z.string(),
			current: z.number().int(),
			fromTransfers: z.number().int(),
			total: z.number().int(),
			routes: z.array(
				z.object({
					fromProgramId: z.string(),
					points: z.number().int(),
					options: z.array(
						z.object({ toProgramId: z.string(), points: z.number().int() }),
					),
				}),
			),
		}),
	),
};

/** The output of `get_catalogue`: the rows of the three tables. */
const catalogueOutput = {
	at: z.string(),
	country: z.string(),
	currencies: z.array(
		z.object({
			id: z.string(),
			code: z.string(),
			name: z.string(),
			kind: z.enum(["airline", "flexible", "hotel", "rail"]),
		}),
	),
	programs: z.array(
		z.object({
			id: z.string(),
			currencyId: z.string(),
			code: z.string(),
			name: z.string(),
			transferable: z.boolean(),
		}),
	),
	transferRules: z.array(
		z.object({
			fromProgramId: z.string(),
			toProgramId: z.string(),
			country: z.string(),
			ratioNum: z.number().int(),
			ratioDen: z.number().int(),
			minTransfer: z.number().int(),
			increment: z.number().int(),
			validFrom: z.string(),
			validTo: z.string().nullable(),
		}),
	),
};

/** The output of `add_snapshot`: the snapshot that the tool wrote. */
const snapshotOutput = {
	snapshotId: z.string(),
	accountId: z.string(),
	points: z.number().int(),
	observedAt: z.string(),
	lots: z.array(lotOutput),
};

export type McpOptions = {
	/** The URL of the MCP server: `mcpResource` of `auth.ts`. */
	resource: string;
	/**
	 * The address of the keys of the tokens. Give the address of the process
	 * on the machine itself: the default address goes through the proxy of
	 * the TLS. Paragraph 4.7.2.
	 */
	jwksUrl: string;
	/** The value of `FREE_ACCOUNT_LIMITS`. */
	limits: boolean;
};

/**
 * Makes the handler of `/mcp`.
 *
 * `requireMcpAuth` examines the token: the signature, the issuer, the audience,
 * the expiry and the scope `balances`. With no valid token it gives the
 * status 401 with the address of the metadata, and Claude then starts the
 * sign-in. The field `sub` of the token gives the user.
 */
export function createMcpHandler(
	db: Db,
	auth: Auth,
	options: McpOptions,
): (request: Request) => Promise<Response> {
	return requireMcpAuth(
		auth,
		async (request, claims) => {
			// The server keeps no session, thus it opens no stream of events. In
			// that mode the transport keeps a GET open with no end: each GET then
			// holds a connection. The MCP specification allows 405 here.
			if (request.method !== "POST") {
				return new Response(null, { status: 405, headers: { allow: "POST" } });
			}
			// The JWT stays valid until its expiry, also after a revocation or
			// the removal of the account. The consent is the state of the
			// access: with no consent the token is not valid. Issue #97.
			if (!hasConnection(db, String(claims.sub), String(claims.client_id))) {
				return revokedToken(options.resource);
			}
			const server = mcpServer(db, String(claims.sub), options.limits);
			const transport = new WebStandardStreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
				enableJsonResponse: true,
			});
			await server.connect(transport);
			return transport.handleRequest(request);
		},
		{
			resource: options.resource,
			jwksUrl: options.jwksUrl,
			requiredScopes: ["balances"],
		},
	);
}

/**
 * The answer to a token whose consent does not exist. Claude then tries the
 * refresh token, receives `invalid_grant`, and starts the sign-in again from
 * the address of the metadata. That address is the address of the 401 of
 * `requireMcpAuth`: the metadata path, then the path of the resource.
 */
function revokedToken(resource: string): Response {
	const url = new URL(resource);
	const metadata = `${url.origin}/.well-known/oauth-protected-resource${url.pathname}`;
	return Response.json(
		{ error: "invalid_token" },
		{
			status: 401,
			headers: {
				"www-authenticate": `Bearer error="invalid_token", resource_metadata="${metadata}"`,
			},
		},
	);
}

/** The server of one request, for one user. */
function mcpServer(db: Db, userId: string, limits: boolean): McpServer {
	const server = new McpServer({ name: "yume", version: "1.0.0" });

	/**
	 * Gives the result of a tool, or the error of the supporter account. The
	 * level comes from the database at each call: the end of a supporter
	 * account stops the access at the next call.
	 */
	function result(
		run: (now: Date) => Record<string, unknown> | CallToolResult,
	): CallToolResult {
		const now = new Date();
		if (!canUseMcp(entitlementOf(db, userId, limits, now))) {
			return failure(SUPPORTER_NOTICE);
		}
		const body = run(now);
		if ("content" in body) {
			return body as CallToolResult;
		}
		return {
			structuredContent: body,
			content: [{ type: "text", text: JSON.stringify(body) }],
		};
	}

	server.registerTool(
		"list_accounts",
		{
			title: "List accounts",
			description:
				"Gives the loyalty accounts of the user of Yume. Each account has its programme, its currency, the most recent balance in points with its date, and the expiry lots of that balance. An account with no balance has null.",
			outputSchema: accountsOutput,
			annotations: { title: "List accounts", ...READS },
			_meta: AUTHENTICATED,
		},
		() =>
			result(() => {
				const programs = new Map(
					allPrograms(db).map((program) => [program.id, program]),
				);
				return {
					accounts: currentBalances(db, userId).map((row) => ({
						accountId: row.accountId,
						programId: row.programId,
						programName: programs.get(row.programId)?.name ?? row.programId,
						currencyId: programs.get(row.programId)?.currencyId ?? null,
						points: row.points,
						observedAt: row.observedAt,
						lots: row.lots,
					})),
				};
			}),
	);

	server.registerTool(
		"get_potential",
		{
			title: "Get potential miles",
			description:
				"Gives the potential miles of each airline currency for the user of Yume: the current balance, the miles that the transfers of the other balances can add, and the best route from each source programme. The value of each currency is separate: the same points cannot go to two currencies, so the result holds no sum of the currencies.",
			outputSchema: potentialOutput,
			annotations: { title: "Get potential miles", ...READS },
			_meta: AUTHENTICATED,
		},
		() =>
			result((now) => {
				const { at, potential } = potentialOf(db, userId, today(now));
				return { at, notice: POTENTIAL_NOTICE, potential };
			}),
	);

	server.registerTool(
		"get_catalogue",
		{
			title: "Get catalogue",
			description:
				"Gives the catalogue of Yume: the currencies, the loyalty programmes and the transfer rules that apply today in the country of the catalogue. A ratio is two integers: ratioNum target points for ratioDen source points, with a minimum transfer and a step.",
			outputSchema: catalogueOutput,
			annotations: { title: "Get catalogue", ...READS },
			_meta: AUTHENTICATED,
		},
		() =>
			result((now) => {
				const at = today(now);
				return {
					at,
					country: DEFAULT_COUNTRY,
					currencies: allCurrencies(db),
					programs: allPrograms(db),
					transferRules: allTransferRules(db).filter(
						(rule) => rule.country === DEFAULT_COUNTRY && isValidAt(rule, at),
					),
				};
			}),
	);

	server.registerTool(
		"add_snapshot",
		{
			title: "Add a balance",
			description:
				"Adds a balance in points to an account of the user of Yume, at a date. The balance with the most recent date is the current balance of the account. The expiry lots belong to the balance: a balance with no lots holds no lots, and the lots of the balance before do not carry over. list_accounts gives the ids of the accounts and their current lots. The date cannot be after tomorrow in UTC.",
			inputSchema: {
				accountId: z
					.string()
					.describe("The id of the account, from list_accounts."),
				points: z.number().describe("The balance: an integer of 0 or more."),
				observedAt: z
					.string()
					.describe("The date of the balance, in the format YYYY-MM-DD."),
				lots: z
					.array(
						z.object({
							points: z
								.number()
								.describe("The points that expire: an integer of 1 or more."),
							expiresOn: z
								.string()
								.describe("The expiry date, in the format YYYY-MM-DD."),
						}),
					)
					.optional()
					.describe(
						"The parts of the balance that expire at a date. Their sum is not above the balance, and each date is unique.",
					),
			},
			outputSchema: snapshotOutput,
			/**
			 * The tool removes no data, but the directory of Anthropic asks for
			 * destructiveHint on each tool that changes data. The new balance
			 * also changes the potential miles, and a transfer of points is
			 * permanent. Paragraph 4.7.3.
			 */
			annotations: {
				title: "Add a balance",
				readOnlyHint: false,
				destructiveHint: true,
				openWorldHint: false,
			},
			_meta: AUTHENTICATED,
		},
		({ accountId, ...snapshot }) =>
			result((now) => {
				const written = recordSnapshot(db, {
					userId,
					accountId,
					body: snapshot,
					now,
					limits,
				});
				if (!written.ok) {
					return failure(snapshotErrorText(written, accountId, now));
				}
				return {
					snapshotId: written.id,
					accountId,
					points: snapshot.points,
					observedAt: snapshot.observedAt,
					lots: snapshot.lots ?? [],
				};
			}),
	);

	return server;
}

/** The result of a tool that gives an error. Claude shows the text. */
function failure(text: string): CallToolResult {
	return { isError: true, content: [{ type: "text", text }] };
}

/**
 * The text of an error of `add_snapshot`: the cause and the correct input.
 * The directory of Anthropic refuses a general error. Paragraph 4.7.3.
 */
function snapshotErrorText(
	written: Exclude<SnapshotResult, { ok: true }>,
	accountId: string,
	now: Date,
): string {
	switch (written.error) {
		case "unknown_account":
			return `No account of the user has the id ${accountId}. list_accounts gives the ids of the accounts.`;
		case "invalid_body":
			return `The balance is not valid. ${written.issues
				.map(
					(issue) => `${issue.path.join(".") || "balance"}: ${issue.message}`,
				)
				.join(" ")}`;
		case "future_date":
			return `The date is after ${latestObservedAt(now)}, the latest date that Yume accepts.`;
		case "supporter_required":
			return "The expiry lots need a supporter account.";
	}
}
