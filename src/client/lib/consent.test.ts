import { describe, expect, it } from "vitest";
import {
	clientLabel,
	consentBody,
	consentRequestOf,
	scopeTexts,
} from "./consent.ts";

/**
 * The query that the authorisation server gives to `/consent`, with the
 * redirect URI of claude.ai. The server signs each parameter except `sig`.
 */
function signed(params: Record<string, string>): string {
	const query = new URLSearchParams(params);
	for (const key of [...Object.keys(params), "ba_param"].sort()) {
		query.append("ba_param", key);
	}
	query.append("sig", "abc");
	return `?${query.toString()}`;
}

const CLAUDE = signed({
	client_id: "https://claude.ai/oauth/mcp-client-metadata",
	redirect_uri: "https://claude.ai/api/mcp/auth_callback",
	scope: "balances offline_access",
	exp: "1794340000",
});

describe("consentRequestOf", () => {
	it("reads the client, the scopes and the host of the redirect URI", () => {
		expect(consentRequestOf(CLAUDE)).toMatchObject({
			clientId: "https://claude.ai/oauth/mcp-client-metadata",
			scopes: ["balances", "offline_access"],
			redirectHost: "claude.ai",
			loopback: false,
		});
	});

	it("keeps the signed query for the answer", () => {
		expect(consentRequestOf(CLAUDE)?.oauthQuery).toBe(CLAUDE.slice(1));
	});

	// Claude Code receives the code on the computer of the person, on a port
	// that changes. Any program on that computer can open that port.
	for (const host of ["localhost", "127.0.0.1"]) {
		it(`marks a redirect URI on ${host} as loopback`, () => {
			const request = consentRequestOf(
				signed({
					client_id: "https://claude.ai/oauth/claude-code-client-metadata",
					redirect_uri: `http://${host}:3118/callback`,
					scope: "balances",
				}),
			);
			expect(request).toMatchObject({ redirectHost: host, loopback: true });
		});
	}

	it("marks an IPv6 loopback redirect URI as loopback", () => {
		const request = consentRequestOf(
			signed({
				client_id: "https://example.com/client",
				redirect_uri: "http://[::1]:3118/callback",
				scope: "balances",
			}),
		);
		expect(request?.loopback).toBe(true);
	});

	it("gives undefined with no signature", () => {
		expect(
			consentRequestOf(
				"?client_id=x&redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb&scope=balances",
			),
		).toBeUndefined();
	});

	it("gives undefined with no client", () => {
		expect(
			consentRequestOf(
				signed({ redirect_uri: "https://claude.ai/cb", scope: "balances" }),
			),
		).toBeUndefined();
	});

	it("gives undefined with a redirect URI that is not a URL", () => {
		expect(
			consentRequestOf(
				signed({
					client_id: "x",
					redirect_uri: "not a url",
					scope: "balances",
				}),
			),
		).toBeUndefined();
	});

	it("gives an empty list with no scope", () => {
		expect(
			consentRequestOf(
				signed({ client_id: "x", redirect_uri: "https://claude.ai/cb" }),
			)?.scopes,
		).toEqual([]);
	});

	it("ignores the spaces around the scopes", () => {
		expect(
			consentRequestOf(
				signed({
					client_id: "x",
					redirect_uri: "https://claude.ai/cb",
					scope: "  balances   offline_access ",
				}),
			)?.scopes,
		).toEqual(["balances", "offline_access"]);
	});
});

describe("scopeTexts", () => {
	const texts = { balances: "Read", offline_access: "Stay connected" };

	it("gives the text of each scope, in the order of the request", () => {
		expect(scopeTexts(["offline_access", "balances"], texts)).toEqual([
			"Stay connected",
			"Read",
		]);
	});

	// The server gives only the scopes of `MCP_SCOPES`. A scope with no text
	// still shows: the person must read each permission that the client asks.
	it("shows the name of a scope with no text", () => {
		expect(scopeTexts(["balances", "openid"], texts)).toEqual([
			"Read",
			"openid",
		]);
	});
});

describe("consentBody", () => {
	const request = consentRequestOf(CLAUDE);

	it("accepts with the signed query", () => {
		expect(request && consentBody(request, true)).toEqual({
			accept: true,
			oauth_query: CLAUDE.slice(1),
		});
	});

	it("refuses with the signed query", () => {
		expect(request && consentBody(request, false)).toEqual({
			accept: false,
			oauth_query: CLAUDE.slice(1),
		});
	});
});

describe("clientLabel", () => {
	it("gives the name of the client", () => {
		expect(clientLabel("Claude", "https://claude.ai/oauth/client")).toBe(
			"Claude",
		);
	});

	// A Client ID Metadata Document can hold no name: the host of its URL then
	// names the client, and it is the host that the plugin verified.
	it("gives the host of the client_id with no name", () => {
		expect(clientLabel(undefined, "https://claude.ai/oauth/client")).toBe(
			"claude.ai",
		);
	});

	it("gives the host with a name of spaces only", () => {
		expect(clientLabel("  ", "https://claude.ai/oauth/client")).toBe(
			"claude.ai",
		);
	});

	it("gives the client_id that is not a URL", () => {
		expect(clientLabel(undefined, "client-1")).toBe("client-1");
	});
});
