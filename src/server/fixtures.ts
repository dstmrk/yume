/**
 * The helpers of the tests of the MCP server.
 *
 * A test of a tool needs an access token. This file gives one through the
 * full flow of `src/server/authorisation.test.ts`: authorize, consent, token.
 * Thus the token holds the claims that the plugin really writes.
 *
 * This file holds no logic of the application, thus it has no test file.
 */

import { createHash, randomBytes } from "node:crypto";
import { consentBody, consentRequestOf } from "../client/lib/consent.ts";
import type { createApp } from "./app.ts";

/** The client of the test. No test reaches the network for its document. */
export const TEST_CLIENT_ID = "https://claude.ai/oauth/mcp-client-metadata";
export const TEST_REDIRECT_URI = "https://claude.ai/api/mcp/auth_callback";

/**
 * The transport of CIMD of the tests. It gives the document of the client of
 * the test, and the status 404 to each other URL.
 */
export async function testClientMetadata(
	input: RequestInfo | URL,
): Promise<Response> {
	const url = String(input instanceof Request ? input.url : input);
	if (url !== TEST_CLIENT_ID) {
		return new Response(null, { status: 404 });
	}
	return Response.json(
		{
			client_id: TEST_CLIENT_ID,
			client_name: "Claude",
			redirect_uris: [TEST_REDIRECT_URI],
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			token_endpoint_auth_method: "none",
		},
		{ headers: { "cache-control": "max-age=3600" } },
	);
}

/** Gives an access token of the MCP server for the user of `cookie`. */
export async function mcpAccessToken(
	app: ReturnType<typeof createApp>,
	cookie: string,
	baseURL: string,
	scope = "balances offline_access",
): Promise<string> {
	return (await mcpTokens(app, cookie, baseURL, scope)).accessToken;
}

/**
 * Gives the access token and the refresh token of the MCP server for the user
 * of `cookie`.
 *
 * It throws at each step that does not give the expected answer, with the
 * status: a test then shows the step that failed.
 */
export async function mcpTokens(
	app: ReturnType<typeof createApp>,
	cookie: string,
	baseURL: string,
	scope = "balances offline_access",
): Promise<{ accessToken: string; refreshToken: string }> {
	const verifier = randomBytes(32).toString("base64url");
	const challenge = createHash("sha256").update(verifier).digest("base64url");
	const query = new URLSearchParams({
		response_type: "code",
		client_id: TEST_CLIENT_ID,
		redirect_uri: TEST_REDIRECT_URI,
		scope,
		state: "state",
		code_challenge: challenge,
		code_challenge_method: "S256",
		resource: `${baseURL}/mcp`,
	});

	const authorize = await app.request(
		`/api/auth/oauth2/authorize?${query.toString()}`,
		{ headers: { cookie } },
	);
	const page = new URL(authorize.headers.get("location") ?? "", baseURL);
	const request = consentRequestOf(page.search);
	if (request === undefined) {
		throw new Error(`authorize gave ${authorize.status} ${page.href}`);
	}

	const consent = await app.request("/api/auth/oauth2/consent", {
		method: "POST",
		headers: { "content-type": "application/json", cookie, origin: baseURL },
		body: JSON.stringify(consentBody(request, true)),
	});
	const { url } = (await consent.json()) as { url?: string };
	const code = new URL(url ?? "", baseURL).searchParams.get("code");
	if (code === null) {
		throw new Error(`consent gave ${consent.status} ${url}`);
	}

	const token = await app.request("/api/auth/oauth2/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: TEST_REDIRECT_URI,
			client_id: TEST_CLIENT_ID,
			code_verifier: verifier,
			resource: `${baseURL}/mcp`,
		}).toString(),
	});
	const body = (await token.json()) as {
		access_token?: string;
		refresh_token?: string;
	};
	if (body.access_token === undefined) {
		throw new Error(`token gave ${token.status} ${JSON.stringify(body)}`);
	}
	return {
		accessToken: body.access_token,
		refreshToken: body.refresh_token ?? "",
	};
}
