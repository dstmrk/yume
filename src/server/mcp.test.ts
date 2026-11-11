/**
 * The MCP server on `/mcp`, with the client of `@modelcontextprotocol/sdk`.
 *
 * The client sends its requests to the application of the test, not to the
 * network. The access token comes from the full flow of OAuth: refer to
 * `fixtures.ts`. The plugin reads the keys of the tokens from `/api/auth/jwks`
 * with `fetch`, thus the test sends that request to the application too.
 *
 * Paragraph 4.7.3 of `docs/architecture.md` gives the tools. This file is the
 * artefact of sub-task 4 of paragraph 4.7.5.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidAt } from "../shared/conversion.ts";
import { createApp, MAX_BODY_BYTES } from "./app.ts";
import { createAuth } from "./auth.ts";
import { insertUser, sessionCookie } from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";
import {
	addSnapshot,
	createAccount,
	currentBalances,
	revokeConnection,
} from "./db/queries.ts";
import { transferRule, user } from "./db/schema.ts";
import { currencies } from "./db/seed/catalogue.ts";
import { seedCatalogue } from "./db/seed/seed.ts";
import {
	mcpAccessToken,
	mcpTokens,
	TEST_CLIENT_ID,
	testClientMetadata,
} from "./fixtures.ts";

const BASE_URL = "http://localhost:3000";
const OTHER_USER = "an-other-user";

let db: Db;
let app: ReturnType<typeof createApp>;
let userId: string;
let cookie: string;

/**
 * A new address of the keys for each application. `jose` keeps the keys of an
 * address in a cache of the module, and each test makes new keys. With one
 * address, a test then reads the keys of the test before it.
 */
let keysAddress = 0;

/** Makes the application, with or without the limits of the free account. */
function makeApp(limits: boolean) {
	const auth = createAuth(db, {
		secret: "a-secret-for-the-test-of-the-mcp-server",
		baseURL: BASE_URL,
		google: { clientId: "client-id-test", clientSecret: "client-secret-test" },
		fetchClientMetadataResource: testClientMetadata,
	});
	keysAddress += 1;
	const jwksUrl = `${BASE_URL}/api/auth/jwks?test=${keysAddress}`;
	return { auth, app: createApp(db, auth, [BASE_URL], { limits, jwksUrl }) };
}

beforeEach(async () => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	seedCatalogue(db);
	insertUser(db, OTHER_USER);
	userId = insertUser(db, "primo");
	const made = makeApp(false);
	app = made.app;
	cookie = await sessionCookie(made.auth, userId);

	// The plugin reads the keys with `fetch`. The test gives that request to
	// the application, and each other request to the real `fetch`.
	const realFetch = globalThis.fetch;
	vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
		const url = String(input instanceof Request ? input.url : input);
		return url.startsWith(BASE_URL)
			? Promise.resolve(app.request(url, init))
			: realFetch(input, init);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** A client of MCP with the token of the user of `cookie`. */
async function connect(token: string): Promise<Client> {
	const client = new Client({ name: "test", version: "1.0.0" });
	await client.connect(
		new StreamableHTTPClientTransport(new URL(`${BASE_URL}/mcp`), {
			requestInit: { headers: { authorization: `Bearer ${token}` } },
			fetch: async (input, init) =>
				app.request(String(input instanceof Request ? input.url : input), init),
		}),
	);
	return client;
}

/** The structured result of a tool. */
async function call(
	client: Client,
	name: string,
): Promise<Record<string, unknown>> {
	const result = await client.callTool({ name, arguments: {} });
	expect(result.isError, JSON.stringify(result.content)).toBeFalsy();
	return result.structuredContent as Record<string, unknown>;
}

describe("the protection of /mcp", () => {
	// Claude starts the sign-in only after a 401 with the address of the
	// metadata. Paragraph 4.7.2.
	it("gives 401 with the address of the metadata with no token", async () => {
		const response = await app.request("/mcp", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
		});

		expect(response.status).toBe(401);
		expect(response.headers.get("www-authenticate")).toContain(
			`resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource`,
		);
	});

	it("gives 401 to a token that is not valid", async () => {
		const response = await app.request("/mcp", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer not-a-token",
			},
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
		});

		expect(response.status).toBe(401);
	});

	// The cookie of the session is not a token of the MCP server.
	it("gives 401 to the cookie of the session", async () => {
		const response = await app.request("/mcp", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
		});

		expect(response.status).toBe(401);
	});

	// A token with no scope `balances` reads no balance. The plugin answers
	// with `insufficient_scope`, and the client can ask for the scope.
	it("gives 403 to a token with no scope balances", async () => {
		const token = await mcpAccessToken(app, cookie, BASE_URL, "offline_access");
		const response = await app.request("/mcp", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
		});

		expect(response.status).toBe(403);
		expect(response.headers.get("www-authenticate")).toContain(
			"insufficient_scope",
		);
	});

	// The server keeps no session of MCP, thus it opens no stream of events.
	it("gives no stream of events to GET", async () => {
		const token = await mcpAccessToken(app, cookie, BASE_URL);
		const response = await app.request("/mcp", {
			headers: {
				accept: "text/event-stream",
				authorization: `Bearer ${token}`,
			},
		});

		expect(response.status).toBe(405);
		expect(response.headers.get("allow")).toBe("POST");
	});

	it("gives 413 to a body above the limit", async () => {
		const token = await mcpAccessToken(app, cookie, BASE_URL);
		const response = await app.request("/mcp", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${token}`,
			},
			body: "x".repeat(MAX_BODY_BYTES + 1),
		});

		expect(response.status).toBe(413);
	});
});

/** A request `tools/list` with a token, with no client of MCP. */
function listTools(token: string): Promise<Response> {
	return Promise.resolve(
		app.request("/mcp", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
		}),
	);
}

/**
 * The revocation of an assistant. The JWT stays valid until its expiry, thus
 * `/mcp` reads the consent at each request. Issue #97.
 */
describe("the revocation of an assistant", () => {
	it("gives the tools to a token with a consent", async () => {
		const token = await mcpAccessToken(app, cookie, BASE_URL);

		expect((await listTools(token)).status).toBe(200);
	});

	it("refuses the same token at once after the revocation", async () => {
		const token = await mcpAccessToken(app, cookie, BASE_URL);

		revokeConnection(db, userId, TEST_CLIENT_ID);

		const response = await listTools(token);
		expect(response.status).toBe(401);
		expect(response.headers.get("www-authenticate")).toContain(
			'error="invalid_token"',
		);
	});

	// Claude starts the sign-in again from the address of the metadata. The
	// two answers 401 must give the same address.
	it("gives the address of the metadata of the 401 with no token", async () => {
		const token = await mcpAccessToken(app, cookie, BASE_URL);
		revokeConnection(db, userId, TEST_CLIENT_ID);

		const revoked = await listTools(token);
		const none = await app.request("/mcp", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: "{}",
		});

		const metadataOf = (response: Response) =>
			/resource_metadata="([^"]+)"/.exec(
				response.headers.get("www-authenticate") ?? "",
			)?.[1];
		expect(metadataOf(revoked)).toBeDefined();
		expect(metadataOf(revoked)).toBe(metadataOf(none));
	});

	it("refuses the refresh token after the revocation", async () => {
		const { refreshToken } = await mcpTokens(app, cookie, BASE_URL);

		revokeConnection(db, userId, TEST_CLIENT_ID);

		const response = await app.request("/api/auth/oauth2/token", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				client_id: TEST_CLIENT_ID,
				resource: `${BASE_URL}/mcp`,
			}).toString(),
		});
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: "invalid_grant" });
	});
});

describe("the list of the tools", () => {
	it("gives the three tools that read and the tool that writes", async () => {
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));
		const { tools } = await client.listTools();

		expect(tools.map((tool) => tool.name).sort()).toEqual([
			"add_snapshot",
			"get_catalogue",
			"get_potential",
			"list_accounts",
		]);
	});

	// The directory of Anthropic refuses a tool with no title and no hint.
	it("gives a title, a description and a hint to each tool", async () => {
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));
		const { tools } = await client.listTools();

		for (const tool of tools) {
			expect(tool.annotations?.title, tool.name).toBeTruthy();
			expect(tool.description, tool.name).toBeTruthy();
			const writes = tool.name === "add_snapshot";
			expect(tool.annotations?.readOnlyHint, tool.name).toBe(!writes);
		}
	});

	// The directory asks for this hint on each tool that changes data. Claude
	// then asks the person before each call. Paragraph 4.7.3.
	it("gives destructiveHint to add_snapshot", async () => {
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));
		const { tools } = await client.listTools();

		const tool = tools.find((item) => item.name === "add_snapshot");
		expect(tool?.annotations?.destructiveHint).toBe(true);
	});
});

describe("list_accounts", () => {
	it("gives the accounts of the user with the current balance", async () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });
		addSnapshot(db, {
			accountId,
			points: 1900,
			observedAt: "2026-11-09",
			lots: [{ points: 500, expiresOn: "2027-03-31" }],
		});
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));

		expect(await call(client, "list_accounts")).toEqual({
			accounts: [
				{
					accountId,
					programId: "amex-mr",
					programName: expect.any(String),
					currencyId: expect.any(String),
					points: 1900,
					observedAt: "2026-11-09",
					lots: [{ points: 500, expiresOn: "2027-03-31" }],
				},
			],
		});
	});

	it("gives an account with no balance with null", async () => {
		createAccount(db, { userId, programId: "ba-club" });
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));

		const { accounts } = (await call(client, "list_accounts")) as {
			accounts: Record<string, unknown>[];
		};
		expect(accounts[0]).toMatchObject({
			points: null,
			observedAt: null,
			lots: [],
		});
	});

	// The access token is a JWT, valid for one hour after the removal of the
	// account. The server then reads the data of no person. Issue #97 refuses
	// such a token with 401: the consent goes away with the user.
	// The access token is a JWT, valid for one hour after the removal of the
	// account. The consent goes away with the user, thus `/mcp` refuses the
	// token at once. Issue #97.
	it("refuses the token after the removal of the user", async () => {
		const token = await mcpAccessToken(app, cookie, BASE_URL);

		db.delete(user).where(eq(user.id, userId)).run();

		const response = await listTools(token);
		expect(response.status).toBe(401);
	});

	it("gives no account of an other user", async () => {
		createAccount(db, { userId: OTHER_USER, programId: "amex-mr" });
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));

		expect(await call(client, "list_accounts")).toEqual({ accounts: [] });
	});
});

describe("get_potential", () => {
	it("gives one result for each airline currency", async () => {
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));
		const { potential } = (await call(client, "get_potential")) as {
			potential: { currencyId: string }[];
		};

		const airline = currencies
			.filter((currency) => currency.kind === "airline")
			.map((currency) => currency.id);
		expect(potential.map((row) => row.currencyId).sort()).toEqual(
			[...airline].sort(),
		);
	});

	it("gives the same values as the dashboard", async () => {
		for (const [programId, points] of [
			["ba-club", 1000],
			["iberia-club", 500],
			["amex-mr", 700],
		] as const) {
			const accountId = createAccount(db, { userId, programId });
			addSnapshot(db, { accountId, points, observedAt: "2026-08-11" });
		}
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));

		const body = await call(client, "get_potential");
		const dashboard = (await (
			await app.request("/api/potential", { headers: { cookie } })
		).json()) as Record<string, unknown>;
		expect(body.potential).toEqual(dashboard.potential);
		expect(body.at).toBe(dashboard.at);
	});

	// Rules of the interface, also for the agent: the value is a calculation,
	// a transfer is permanent, and no sum of all the currencies exists.
	it("states that the value is a calculation and that a transfer is permanent", async () => {
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));
		const body = await call(client, "get_potential");

		expect(String(body.notice)).toMatch(/calculation/i);
		expect(String(body.notice)).toMatch(/permanent/i);
	});

	it("gives no sum of all the currencies", async () => {
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));
		const body = await call(client, "get_potential");

		expect(Object.keys(body).sort()).toEqual(["at", "notice", "potential"]);
	});
});

describe("get_catalogue", () => {
	it("gives the currencies and the programmes of the catalogue", async () => {
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));
		const body = (await call(client, "get_catalogue")) as {
			currencies: unknown[];
			programs: unknown[];
			country: string;
		};

		expect(body.currencies).toHaveLength(currencies.length);
		expect(body.programs.length).toBeGreaterThan(0);
		expect(body.country).toBe("IT");
	});

	it("gives only the rules of the country that apply today", async () => {
		const base = db.select().from(transferRule).limit(1).get();
		expect(base).toBeDefined();
		if (base === undefined) return;
		db.insert(transferRule)
			.values([
				{ ...base, validFrom: "2020-01-01", validTo: "2021-01-01" },
				{ ...base, validFrom: "2999-01-01", validTo: null },
				{ ...base, country: "ES", validFrom: "2020-01-01", validTo: null },
			])
			.run();
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));

		const body = (await call(client, "get_catalogue")) as {
			at: string;
			transferRules: (typeof transferRule.$inferSelect)[];
		};
		const all = db.select().from(transferRule).all();
		const expected = all.filter(
			(rule) => rule.country === "IT" && isValidAt(rule, body.at),
		);
		expect(body.transferRules).toHaveLength(expected.length);
		for (const rule of body.transferRules) {
			expect(rule.country).toBe("IT");
			expect(isValidAt(rule, body.at)).toBe(true);
		}
	});
});

describe("add_snapshot", () => {
	const TODAY = new Date().toISOString().slice(0, 10);

	/** Calls `add_snapshot` and gives the result. */
	async function add(arguments_: Record<string, unknown>) {
		const client = await connect(await mcpAccessToken(app, cookie, BASE_URL));
		return client.callTool({ name: "add_snapshot", arguments: arguments_ });
	}

	/** The text of the result of a tool. */
	function textOf(result: Awaited<ReturnType<typeof add>>): string {
		return JSON.stringify(result.content);
	}

	it("writes the balance of an account of the user", async () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		const result = await add({ accountId, points: 1900, observedAt: TODAY });

		expect(result.isError).toBeFalsy();
		expect(currentBalances(db, userId)[0]).toMatchObject({
			points: 1900,
			observedAt: TODAY,
			lots: [],
		});
		expect(result.structuredContent).toMatchObject({
			snapshotId: currentBalances(db, userId)[0]?.snapshotId,
			accountId,
			points: 1900,
			observedAt: TODAY,
		});
	});

	it("writes the expiry lots of the balance", async () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		await add({
			accountId,
			points: 1900,
			observedAt: TODAY,
			lots: [{ points: 500, expiresOn: "2099-03-31" }],
		});

		expect(currentBalances(db, userId)[0]?.lots).toEqual([
			{ points: 500, expiresOn: "2099-03-31" },
		]);
	});

	// The lots belong to the snapshot. A new balance with no lots holds no
	// lots, as the description of the tool states. Paragraph 3.2.1.
	it("keeps no lot of the balance before", async () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });
		addSnapshot(db, {
			accountId,
			points: 1000,
			observedAt: "2026-01-01",
			lots: [{ points: 500, expiresOn: "2099-03-31" }],
		});

		await add({ accountId, points: 1900, observedAt: TODAY });

		expect(currentBalances(db, userId)[0]?.lots).toEqual([]);
	});

	it("refuses an account of an other user and writes nothing", async () => {
		const accountId = createAccount(db, {
			userId: OTHER_USER,
			programId: "amex-mr",
		});

		const result = await add({ accountId, points: 1900, observedAt: TODAY });

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain("list_accounts");
		expect(currentBalances(db, OTHER_USER)[0]?.points).toBeNull();
	});

	// The directory refuses an error with no detail. The text names the field
	// and the cause.
	it("gives the cause of a balance that is not an integer", async () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		const result = await add({ accountId, points: 19.5, observedAt: TODAY });

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain("points");
		expect(currentBalances(db, userId)[0]?.points).toBeNull();
	});

	it("gives the cause of a balance below 0", async () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		const result = await add({ accountId, points: -1, observedAt: TODAY });

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain("points");
		expect(currentBalances(db, userId)[0]?.points).toBeNull();
	});

	// The SDK examines the arguments with the schema of the tool, before the
	// tool runs. Its error also names the field.
	it("gives the name of a field that is not present", async () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		const result = await add({ accountId, observedAt: TODAY });

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain("points");
	});

	it("gives the cause of lots above the balance", async () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		const result = await add({
			accountId,
			points: 100,
			observedAt: TODAY,
			lots: [{ points: 500, expiresOn: "2099-03-31" }],
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain("The lots are above the balance.");
	});

	it("gives the latest date that the server accepts for a future date", async () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });
		const tomorrow = new Date();
		tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
		const latest = tomorrow.toISOString().slice(0, 10);

		const result = await add({
			accountId,
			points: 1900,
			observedAt: "2099-01-01",
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain(latest);
		expect(currentBalances(db, userId)[0]?.points).toBeNull();
	});

	it("gives the cause of a date that does not exist", async () => {
		const accountId = createAccount(db, { userId, programId: "amex-mr" });

		const result = await add({
			accountId,
			points: 1900,
			observedAt: "2026-02-30",
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain("observedAt");
	});
});

/**
 * The MCP server is a function of the supporter account on the official
 * instance. A free user signs in and reads the list of the tools: each tool
 * then gives an error that names the supporter account. Paragraph 4.7.2.
 */
describe("the supporter account", () => {
	let limited: ReturnType<typeof createApp>;
	let limitedCookie: string;

	beforeEach(async () => {
		const made = makeApp(true);
		limited = made.app;
		app = limited;
		limitedCookie = await sessionCookie(made.auth, userId);
	});

	it("gives the list of the tools to a free account", async () => {
		const client = await connect(
			await mcpAccessToken(limited, limitedCookie, BASE_URL),
		);
		expect((await client.listTools()).tools).toHaveLength(4);
	});

	it("gives an error that names the supporter account to a free account", async () => {
		const client = await connect(
			await mcpAccessToken(limited, limitedCookie, BASE_URL),
		);
		for (const [name, args] of [
			["list_accounts", {}],
			["get_potential", {}],
			["get_catalogue", {}],
			["add_snapshot", { accountId: "x", points: 1, observedAt: "2026-11-09" }],
		] as const) {
			const result = await client.callTool({ name, arguments: args });
			expect(result.isError, name).toBe(true);
			expect(JSON.stringify(result.content)).toMatch(/supporter/i);
		}
	});

	it("gives the tools to an unlimited account", async () => {
		db.update(user).set({ unlimited: true }).where(eq(user.id, userId)).run();
		const client = await connect(
			await mcpAccessToken(limited, limitedCookie, BASE_URL),
		);

		const result = await client.callTool({
			name: "list_accounts",
			arguments: {},
		});
		expect(result.isError).toBeFalsy();
	});

	// The level is read at each call, not at the sign-in. The end of a
	// supporter account thus stops the access at the next call.
	it("stops the access at the end of the supporter account", async () => {
		db.update(user)
			.set({ supporterUntil: new Date(Date.now() + 60_000) })
			.where(eq(user.id, userId))
			.run();
		const client = await connect(
			await mcpAccessToken(limited, limitedCookie, BASE_URL),
		);
		expect(
			(await client.callTool({ name: "list_accounts", arguments: {} })).isError,
		).toBeFalsy();

		db.update(user)
			.set({ supporterUntil: new Date(Date.now() - 1000) })
			.where(eq(user.id, userId))
			.run();
		expect(
			(await client.callTool({ name: "list_accounts", arguments: {} })).isError,
		).toBe(true);
	});
});

describe("an installation on plain HTTP", () => {
	it("gives no MCP server", async () => {
		const auth = createAuth(db, {
			secret: "a-secret-for-the-test-of-the-mcp-server",
			baseURL: "http://nas.local:3000",
			google: { clientId: "id", clientSecret: "secret" },
		});
		const plain = createApp(db, auth, ["http://nas.local:3000"]);

		const response = await plain.request("/mcp", { method: "POST" });
		expect(response.status).toBe(404);
	});
});
