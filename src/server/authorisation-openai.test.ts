/**
 * The authorisation of the clients of OpenAI: ChatGPT and Codex.
 *
 * The two clients give a Client ID Metadata Document, as Claude does. The
 * documentation of OpenAI gives two differences from Claude:
 *
 * - The document of ChatGPT can prefer `private_key_jwt` to `none`. The client
 *   then signs its requests to the token endpoint with a key of its document.
 * - Codex gives `http://127.0.0.1/callback` with no port in its document, and
 *   it adds the port of its listener to the request.
 *
 * Yume gives both methods and both forms of address. These tests make the two
 * flows mechanical. Paragraph 4.7.2 of `docs/architecture.md` gives the
 * decision. The addresses of the documents are an example: no test reaches the
 * network, and the transport of the test gives the documents.
 */

import {
	createHash,
	generateKeyPairSync,
	type KeyObject,
	randomBytes,
	randomUUID,
	sign,
} from "node:crypto";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consentBody, consentRequestOf } from "../client/lib/consent.ts";
import { createApp } from "./app.ts";
import { type Auth, createAuth } from "./auth.ts";
import { insertUser, sessionCookie } from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";

const BASE_URL = "http://localhost:3000";
const RESOURCE = `${BASE_URL}/mcp`;
const TOKEN_ENDPOINT = `${BASE_URL}/api/auth/oauth2/token`;
const CLIENT_ID = "https://chatgpt.example.com/oauth/client-metadata.json";
const JWKS_URI = "https://chatgpt.example.com/oauth/jwks.json";
const REDIRECT_URI = "https://chatgpt.example.com/connector/oauth/callback";

const CODEX_ID = "https://codex.example.com/oauth/client-metadata.json";
const CODEX_REDIRECT = "http://127.0.0.1/callback";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
	modulusLength: 2048,
});
const KID = "key-of-the-test";

let db: Db;
let auth: Auth;
let app: ReturnType<typeof createApp>;
let userId: string;
let cookie: string;
let keysAddress = 0;

beforeEach(async () => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	auth = createAuth(db, {
		secret: "a-secret-for-the-test-of-the-key-of-a-client",
		baseURL: BASE_URL,
		google: { clientId: "client-id-test", clientSecret: "client-secret-test" },
		fetchClientMetadataResource: async (input) => {
			const url = String(input instanceof Request ? input.url : input);
			const headers = { "cache-control": "max-age=3600" };
			if (url === CLIENT_ID) {
				return Response.json(
					{
						client_id: CLIENT_ID,
						client_name: "ChatGPT",
						redirect_uris: [REDIRECT_URI],
						grant_types: ["authorization_code", "refresh_token"],
						response_types: ["code"],
						token_endpoint_auth_method: "private_key_jwt",
						jwks_uri: JWKS_URI,
					},
					{ headers },
				);
			}
			if (url === CODEX_ID) {
				return Response.json(
					{
						client_id: CODEX_ID,
						client_name: "Codex",
						redirect_uris: [CODEX_REDIRECT],
						grant_types: ["authorization_code", "refresh_token"],
						response_types: ["code"],
						token_endpoint_auth_method: "none",
					},
					{ headers },
				);
			}
			if (url === JWKS_URI) {
				const jwk = publicKey.export({ format: "jwk" });
				return Response.json(
					{ keys: [{ ...jwk, kid: KID, alg: "RS256", use: "sig" }] },
					{ headers },
				);
			}
			return new Response(null, { status: 404 });
		},
	});
	// `jose` keeps the keys of an address in a cache of the module, and each
	// test makes new keys of the server. Thus each test has its own address.
	keysAddress += 1;
	app = createApp(db, auth, [BASE_URL], {
		jwksUrl: `${BASE_URL}/api/auth/jwks?test=${keysAddress}`,
	});
	// `requireMcpAuth` reads the keys of the server with `fetch`. The test
	// gives that request to the application.
	const realFetch = globalThis.fetch;
	vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
		const url = String(input instanceof Request ? input.url : input);
		return url.startsWith(BASE_URL)
			? Promise.resolve(app.request(url, init))
			: realFetch(input, init);
	});
	userId = insertUser(db, "primo");
	cookie = await sessionCookie(auth, userId);
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** A client assertion of RFC 7523, signed with RS256. */
function assertion(key: KeyObject = privateKey, audience = TOKEN_ENDPOINT) {
	const now = Math.floor(Date.now() / 1000);
	const part = (value: object) =>
		Buffer.from(JSON.stringify(value)).toString("base64url");
	const input = `${part({ alg: "RS256", typ: "JWT", kid: KID })}.${part({
		iss: CLIENT_ID,
		sub: CLIENT_ID,
		aud: audience,
		jti: randomUUID(),
		iat: now,
		exp: now + 60,
	})}`;
	const signature = sign("sha256", Buffer.from(input), key);
	return `${input}.${signature.toString("base64url")}`;
}

/** The person accepts. It gives the code and the verifier of PKCE. */
async function code(
	clientId = CLIENT_ID,
	redirectUri = REDIRECT_URI,
): Promise<{ code: string; verifier: string }> {
	const verifier = randomBytes(32).toString("base64url");
	const challenge = createHash("sha256").update(verifier).digest("base64url");
	const query = new URLSearchParams({
		response_type: "code",
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: "balances offline_access",
		state: "state",
		code_challenge: challenge,
		code_challenge_method: "S256",
		resource: RESOURCE,
	});
	const authorize = await app.request(
		`/api/auth/oauth2/authorize?${query.toString()}`,
		{ headers: { cookie } },
	);
	const page = new URL(authorize.headers.get("location") ?? "", BASE_URL);
	const request = consentRequestOf(page.search);
	expect(request, `authorize gave ${page.href}`).toBeDefined();
	const consent = await app.request("/api/auth/oauth2/consent", {
		method: "POST",
		headers: { "content-type": "application/json", cookie, origin: BASE_URL },
		body: JSON.stringify(request && consentBody(request, true)),
	});
	const { url } = (await consent.json()) as { url: string };
	return {
		code: new URL(url).searchParams.get("code") ?? "",
		verifier,
	};
}

/** The form of the server of the client to the token endpoint: no origin. */
function token(fields: Record<string, string>) {
	return app.request("/api/auth/oauth2/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(fields).toString(),
	});
}

const ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";

describe("a client of the MCP server with private_key_jwt", () => {
	it("finds the method in the metadata of the authorisation server", async () => {
		const response = await app.request(
			"/.well-known/oauth-authorization-server/api/auth",
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(body.token_endpoint_auth_methods_supported).toEqual(
			expect.arrayContaining(["none", "private_key_jwt"]),
		);
		expect(body.client_id_metadata_document_supported).toBe(true);
		expect(body.code_challenge_methods_supported).toEqual(["S256"]);
	});

	it("receives a token for the MCP server with a signed assertion", async () => {
		const { code: value, verifier } = await code();
		const response = await token({
			grant_type: "authorization_code",
			code: value,
			redirect_uri: REDIRECT_URI,
			client_id: CLIENT_ID,
			code_verifier: verifier,
			resource: RESOURCE,
			client_assertion_type: ASSERTION_TYPE,
			client_assertion: assertion(),
		});
		const body = (await response.json()) as Record<string, string>;

		expect(response.status, JSON.stringify(body)).toBe(200);
		expect(body.refresh_token).toBeTruthy();
		const claims = JSON.parse(
			Buffer.from(
				body.access_token?.split(".")[1] ?? "",
				"base64url",
			).toString(),
		);
		expect(claims.sub).toBe(userId);
		expect([claims.aud].flat()).toContain(RESOURCE);
	});

	it("calls a tool of the MCP server with that token", async () => {
		const { code: value, verifier } = await code();
		const body = (await (
			await token({
				grant_type: "authorization_code",
				code: value,
				redirect_uri: REDIRECT_URI,
				client_id: CLIENT_ID,
				code_verifier: verifier,
				resource: RESOURCE,
				client_assertion_type: ASSERTION_TYPE,
				client_assertion: assertion(),
			})
		).json()) as Record<string, string>;

		const response = await app.request("/mcp", {
			method: "POST",
			headers: {
				authorization: `Bearer ${body.access_token}`,
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "tools/call",
				params: { name: "list_accounts", arguments: {} },
			}),
		});
		expect(response.status).toBe(200);
		const result = (await response.json()) as {
			result: { isError?: boolean; structuredContent: unknown };
		};
		expect(result.result.isError).toBeUndefined();
		expect(result.result.structuredContent).toEqual({ accounts: [] });
	});

	// The document gives a key, thus the client must prove it. A code with no
	// assertion is a code that an other party can use.
	it("refuses the code with no assertion", async () => {
		const { code: value, verifier } = await code();
		const response = await token({
			grant_type: "authorization_code",
			code: value,
			redirect_uri: REDIRECT_URI,
			client_id: CLIENT_ID,
			code_verifier: verifier,
			resource: RESOURCE,
		});

		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(await response.json()).toMatchObject({ error: "invalid_client" });
	});

	it("refuses an assertion that an other key signs", async () => {
		const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
		const { code: value, verifier } = await code();
		const response = await token({
			grant_type: "authorization_code",
			code: value,
			redirect_uri: REDIRECT_URI,
			client_id: CLIENT_ID,
			code_verifier: verifier,
			resource: RESOURCE,
			client_assertion_type: ASSERTION_TYPE,
			client_assertion: assertion(other.privateKey),
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({ error: "invalid_client" });
	});

	it("refuses an assertion for an other audience", async () => {
		const { code: value, verifier } = await code();
		const response = await token({
			grant_type: "authorization_code",
			code: value,
			redirect_uri: REDIRECT_URI,
			client_id: CLIENT_ID,
			code_verifier: verifier,
			resource: RESOURCE,
			client_assertion_type: ASSERTION_TYPE,
			client_assertion: assertion(
				privateKey,
				"https://other.example.com/token",
			),
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({ error: "invalid_client" });
	});
});

describe("a client of the MCP server on the loopback address", () => {
	// RFC 8252 gives the port of a loopback address at the time of the
	// request. The document holds no port, thus the server must ignore it.
	it("receives a token with the port of its listener", async () => {
		const redirect = "http://127.0.0.1:53123/callback";
		const { code: value, verifier } = await code(CODEX_ID, redirect);
		expect(value).not.toBe("");

		const response = await token({
			grant_type: "authorization_code",
			code: value,
			redirect_uri: redirect,
			client_id: CODEX_ID,
			code_verifier: verifier,
			resource: RESOURCE,
		});
		const body = (await response.json()) as Record<string, string>;

		expect(response.status, JSON.stringify(body)).toBe(200);
		expect(body.access_token).toBeTruthy();
	});

	it("sends no code to an other path on the loopback address", async () => {
		const query = new URLSearchParams({
			response_type: "code",
			client_id: CODEX_ID,
			redirect_uri: "http://127.0.0.1:53123/other",
			scope: "balances",
			state: "state",
			code_challenge: "a".repeat(43),
			code_challenge_method: "S256",
			resource: RESOURCE,
		});
		const response = await app.request(
			`/api/auth/oauth2/authorize?${query.toString()}`,
			{ headers: { cookie } },
		);

		const target = new URL(response.headers.get("location") ?? "", BASE_URL);
		expect(target.origin).toBe(BASE_URL);
		expect(target.searchParams.get("error")).toBe("invalid_redirect");
	});
});
