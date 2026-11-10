/**
 * The logic of the page `/consent`, the authorisation of a client of the MCP
 * server.
 *
 * The authorisation server sends the person to that page with a signed query.
 * The page shows the client, the host that receives the code and the
 * permissions. Then it sends the answer with the same query. Paragraph 4.7.2
 * of `docs/architecture.md` gives the flow.
 */

import { signedOAuthQuery } from "./auth.ts";

/** The hosts of the computer of the person. */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** A request of authorisation, from the address of the page. */
export type ConsentRequest = {
	/** The URL of the Client ID Metadata Document of the client. */
	clientId: string;
	/** The scopes that the client asks, in the order of the request. */
	scopes: string[];
	/** The host that receives the code, for example `claude.ai`. */
	redirectHost: string;
	/**
	 * True when the code goes to the computer of the person, as with Claude
	 * Code. Each program on that computer can open the port, thus the page
	 * shows a warning. The MCP specification asks for it.
	 */
	loopback: boolean;
	/** The signed query. The answer sends it again. */
	oauthQuery: string;
};

/**
 * Reads the request of authorisation from the address of `/consent`.
 *
 * It gives undefined with no signature, with no client or with a redirect URI
 * that is not a URL. The page then shows an error, and it sends no answer.
 */
export function consentRequestOf(search: string): ConsentRequest | undefined {
	const oauthQuery = signedOAuthQuery(search);
	if (oauthQuery === undefined) {
		return undefined;
	}
	const params = new URLSearchParams(oauthQuery);
	const clientId = params.get("client_id");
	if (clientId === null || clientId === "") {
		return undefined;
	}
	let redirect: URL;
	try {
		redirect = new URL(params.get("redirect_uri") ?? "");
	} catch {
		return undefined;
	}
	return {
		clientId,
		scopes: (params.get("scope") ?? "").split(" ").filter((s) => s !== ""),
		redirectHost: redirect.hostname,
		loopback: LOOPBACK.has(redirect.hostname),
		oauthQuery,
	};
}

/**
 * Gives the text of each scope, in the order of the request. A scope with no
 * text shows its name: the person must read each permission of the request.
 */
export function scopeTexts(
	scopes: string[],
	texts: Record<string, string>,
): string[] {
	return scopes.map((scope) => texts[scope] ?? scope);
}

/** The body of `POST /api/auth/oauth2/consent`. */
export type ConsentBody = { accept: boolean; oauth_query: string };

/** Gives the answer of the person to the request. */
export function consentBody(
	request: ConsentRequest,
	accept: boolean,
): ConsentBody {
	return { accept, oauth_query: request.oauthQuery };
}

/**
 * The name of the client on the page. A client with no name shows the host of
 * its `client_id`: the plugin read the document of the client at that host.
 */
export function clientLabel(
	name: string | undefined,
	clientId: string,
): string {
	if (name !== undefined && name.trim() !== "") {
		return name.trim();
	}
	try {
		return new URL(clientId).hostname;
	} catch {
		return clientId;
	}
}
