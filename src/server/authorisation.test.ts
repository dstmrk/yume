/**
 * The full authorisation of a client of the MCP server, as Claude does it.
 *
 * The test goes through the application, thus the routes of the metadata, the
 * middleware `csrf` and the session also apply. The client functions of
 * `src/client/lib/` read the addresses, as the pages do. No test reaches
 * Google: the session comes from `sessionCookie`. No test reaches the network:
 * the Client ID Metadata Document comes from a transport of the test.
 *
 * Paragraph 4.7.2 of `docs/architecture.md` gives the flow. This file is the
 * artefact of sub-task 3 of paragraph 4.7.5.
 */

import { createHash, randomBytes } from "node:crypto";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { googleSignInBody, withOAuthQuery } from "../client/lib/auth.ts";
import { consentBody, consentRequestOf } from "../client/lib/consent.ts";
import { createApp } from "./app.ts";
import { type Auth, createAuth } from "./auth.ts";
import { insertUser, sessionCookie } from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";
import { oauthConsent, oauthRefreshToken } from "./db/schema.ts";

const BASE_URL = "http://localhost:3000";
const RESOURCE = `${BASE_URL}/mcp`;
const CLIENT_ID = "https://claude.ai/oauth/mcp-client-metadata";
const REDIRECT_URI = "https://claude.ai/api/mcp/auth_callback";

/** The Client ID Metadata Document of the client of the test. */
const DOCUMENT = {
	client_id: CLIENT_ID,
	client_name: "Claude",
	redirect_uris: [REDIRECT_URI],
	grant_types: ["authorization_code", "refresh_token"],
	response_types: ["code"],
	token_endpoint_auth_method: "none",
};

let db: Db;
let auth: Auth;
let app: ReturnType<typeof createApp>;
let userId: string;
let cookie: string;
/** Each URL that the transport of the test received. */
let fetched: string[];

beforeEach(async () => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	fetched = [];
	auth = createAuth(db, {
		secret: "a-secret-for-the-test-of-the-authorisation",
		baseURL: BASE_URL,
		google: { clientId: "client-id-test", clientSecret: "client-secret-test" },
		fetchClientMetadataResource: async (input) => {
			const url = String(input instanceof Request ? input.url : input);
			fetched.push(url);
			return url === CLIENT_ID
				? Response.json(DOCUMENT, {
						headers: { "cache-control": "max-age=3600" },
					})
				: new Response(null, { status: 404 });
		},
	});
	app = createApp(db, auth, [BASE_URL]);
	userId = insertUser(db, "primo");
	cookie = await sessionCookie(auth, userId);
});

/** A verifier of PKCE and its challenge with S256. */
function pkce() {
	const verifier = randomBytes(32).toString("base64url");
	const challenge = createHash("sha256").update(verifier).digest("base64url");
	return { verifier, challenge };
}

/** The address of the authorisation, as Claude writes it. */
function authorizeUrl(challenge: string, extra: Record<string, string> = {}) {
	const query = new URLSearchParams({
		response_type: "code",
		client_id: CLIENT_ID,
		redirect_uri: REDIRECT_URI,
		scope: "balances offline_access",
		state: "state-of-claude",
		code_challenge: challenge,
		code_challenge_method: "S256",
		resource: RESOURCE,
		...extra,
	});
	return `/api/auth/oauth2/authorize?${query.toString()}`;
}

/** The address of a redirect of the server. */
function locationOf(response: Response): URL {
	const location = response.headers.get("location");
	expect(location, `status ${response.status}`).not.toBeNull();
	return new URL(location ?? "", BASE_URL);
}

/** The person accepts on `/consent`. It gives the address of the client. */
async function consent(challenge: string, accept = true): Promise<URL> {
	const authorize = await app.request(authorizeUrl(challenge), {
		headers: { cookie },
	});
	const page = locationOf(authorize);
	expect(page.pathname).toBe("/consent");

	const request = consentRequestOf(page.search);
	expect(request).toBeDefined();
	const response = await app.request("/api/auth/oauth2/consent", {
		method: "POST",
		headers: { "content-type": "application/json", cookie, origin: BASE_URL },
		body: JSON.stringify(request && consentBody(request, accept)),
	});
	expect(response.status).toBe(200);
	const { url } = (await response.json()) as { url: string };
	return new URL(url);
}

/** The request of the server of Claude to the token endpoint: a form, no origin. */
function token(fields: Record<string, string>) {
	return app.request("/api/auth/oauth2/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(fields).toString(),
	});
}

/** The claims of a JWT, with no examination of the signature. */
function claimsOf(jwt: string): Record<string, unknown> {
	const payload = jwt.split(".")[1] ?? "";
	return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

describe("the authorisation of a client of the MCP server", () => {
	it("sends a person with no session to /login with a signed query", async () => {
		const response = await app.request(authorizeUrl(pkce().challenge));
		const page = locationOf(response);

		expect(page.pathname).toBe("/login");
		expect(page.searchParams.get("client_id")).toBe(CLIENT_ID);
		expect(page.searchParams.has("sig")).toBe(true);
		expect(fetched).toContain(CLIENT_ID);
	});

	// The page `/login` sends that query with the sign-in. The server must
	// accept the query that `withOAuthQuery` keeps, or the flow stops there.
	it("accepts the signed query of /login in the sign-in", async () => {
		const page = locationOf(await app.request(authorizeUrl(pkce().challenge)));
		const body = withOAuthQuery(
			googleSignInBody(BASE_URL, "it"),
			`?utm_source=mail&${page.search.slice(1)}`,
		);
		expect(body.oauth_query).toBeDefined();

		const response = await app.request("/api/auth/sign-in/social", {
			method: "POST",
			headers: { "content-type": "application/json", origin: BASE_URL },
			body: JSON.stringify(body),
		});
		expect(response.status).toBe(200);
		const { url } = (await response.json()) as { url: string };
		expect(new URL(url).origin).toBe("https://accounts.google.com");
	});

	it("sends a person with a session to /consent", async () => {
		const response = await app.request(authorizeUrl(pkce().challenge), {
			headers: { cookie },
		});
		const request = consentRequestOf(locationOf(response).search);

		expect(request).toMatchObject({
			clientId: CLIENT_ID,
			scopes: ["balances", "offline_access"],
			redirectHost: "claude.ai",
			loopback: false,
		});
	});

	it("gives a code, then a token for the MCP server and the user", async () => {
		const { verifier, challenge } = pkce();
		const callback = await consent(challenge);

		expect(callback.origin + callback.pathname).toBe(REDIRECT_URI);
		expect(callback.searchParams.get("state")).toBe("state-of-claude");
		const code = callback.searchParams.get("code") ?? "";

		const response = await token({
			grant_type: "authorization_code",
			code,
			redirect_uri: REDIRECT_URI,
			client_id: CLIENT_ID,
			code_verifier: verifier,
			resource: RESOURCE,
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as Record<string, string>;
		expect(body.token_type?.toLowerCase()).toBe("bearer");
		expect(body.refresh_token).toBeTruthy();

		const claims = claimsOf(body.access_token ?? "");
		expect(claims.sub).toBe(userId);
		expect(claims.client_id).toBe(CLIENT_ID);
		expect([claims.aud].flat()).toContain(RESOURCE);
		expect(String(claims.scope).split(" ")).toContain("balances");
	});

	it("keeps the consent of the person", async () => {
		await consent(pkce().challenge);

		const rows = db.select().from(oauthConsent).all();
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ clientId: CLIENT_ID, userId });
	});

	// The database keeps the hash: a copy of the database gives no token.
	it("keeps no refresh token in clear text", async () => {
		const { verifier, challenge } = pkce();
		const code = (await consent(challenge)).searchParams.get("code") ?? "";
		const body = (await (
			await token({
				grant_type: "authorization_code",
				code,
				redirect_uri: REDIRECT_URI,
				client_id: CLIENT_ID,
				code_verifier: verifier,
				resource: RESOURCE,
			})
		).json()) as Record<string, string>;

		const stored = db.select().from(oauthRefreshToken).all();
		expect(stored).toHaveLength(1);
		expect(stored[0]?.token).not.toBe(body.refresh_token);
	});

	it("gives a new refresh token at each use", async () => {
		const { verifier, challenge } = pkce();
		const code = (await consent(challenge)).searchParams.get("code") ?? "";
		const first = (await (
			await token({
				grant_type: "authorization_code",
				code,
				redirect_uri: REDIRECT_URI,
				client_id: CLIENT_ID,
				code_verifier: verifier,
				resource: RESOURCE,
			})
		).json()) as Record<string, string>;

		const response = await token({
			grant_type: "refresh_token",
			refresh_token: first.refresh_token ?? "",
			client_id: CLIENT_ID,
			resource: RESOURCE,
		});
		expect(response.status).toBe(200);
		const second = (await response.json()) as Record<string, string>;
		expect(second.access_token).toBeTruthy();
		expect(second.refresh_token).not.toBe(first.refresh_token);
	});

	it("refuses a code with the wrong verifier of PKCE", async () => {
		const code =
			(await consent(pkce().challenge)).searchParams.get("code") ?? "";

		const response = await token({
			grant_type: "authorization_code",
			code,
			redirect_uri: REDIRECT_URI,
			client_id: CLIENT_ID,
			code_verifier: pkce().verifier,
			resource: RESOURCE,
		});
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: "invalid_grant" });
	});

	it("refuses a code that the client already used", async () => {
		const { verifier, challenge } = pkce();
		const code = (await consent(challenge)).searchParams.get("code") ?? "";
		const fields = {
			grant_type: "authorization_code",
			code,
			redirect_uri: REDIRECT_URI,
			client_id: CLIENT_ID,
			code_verifier: verifier,
			resource: RESOURCE,
		};
		expect((await token(fields)).status).toBe(200);

		expect((await token(fields)).status).toBe(400);
	});

	it("gives the error access_denied to the client after a refusal", async () => {
		const callback = await consent(pkce().challenge, false);

		expect(callback.origin + callback.pathname).toBe(REDIRECT_URI);
		expect(callback.searchParams.get("error")).toBe("access_denied");
		expect(callback.searchParams.has("code")).toBe(false);
		expect(db.select().from(oauthConsent).all()).toEqual([]);
	});

	// A redirect URI that the document does not hold could send the code to an
	// other site. The server then gives no redirect to that address.
	it("sends no code to a redirect URI that the document does not hold", async () => {
		const response = await app.request(
			authorizeUrl(pkce().challenge, {
				redirect_uri: "https://evil.example.com/callback",
			}),
			{ headers: { cookie } },
		);

		const target = locationOf(response);
		expect(target.origin).toBe(BASE_URL);
		expect(target.searchParams.get("error")).toBe("invalid_redirect");
	});

	it("refuses a scope that the server does not give", async () => {
		const response = await app.request(
			authorizeUrl(pkce().challenge, { scope: "balances profile" }),
			{ headers: { cookie } },
		);

		const target = locationOf(response);
		expect(target.pathname).not.toBe("/consent");
		expect(target.searchParams.get("error")).toBe("invalid_scope");
	});

	it("refuses a client whose document does not exist", async () => {
		const response = await app.request(
			authorizeUrl(pkce().challenge, {
				client_id: "https://claude.ai/oauth/no-such-client",
			}),
			{ headers: { cookie } },
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: "invalid_client" });
	});
});
