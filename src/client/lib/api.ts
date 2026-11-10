import type {
	AccountsResponse,
	AddSnapshotInput,
	CatalogueResponse,
	CreateAccountInput,
	FavoritesResponse,
	PotentialResponse,
} from "../../shared/api.ts";
import type { GoogleSignInBody } from "./auth.ts";
import { ApiError, errorCodeOf } from "./errors.ts";

/**
 * The client of the API.
 *
 * Hono supplies the client and the API from one origin, thus each path starts
 * with `/api`. In development the proxy of Vite gives the same result.
 *
 * A status that is not ok gives an `ApiError` with the field `error` of the
 * body. An answer of 204 holds no body, thus the function gives `undefined`.
 */
async function request<T>(
	method: "GET" | "POST" | "PUT" | "DELETE",
	path: string,
	body?: unknown,
): Promise<T> {
	const response = await fetch(
		path,
		body === undefined
			? { method }
			: {
					method,
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body),
				},
	);
	if (!response.ok) {
		// A proxy can answer with a body that is not JSON: then the code is null.
		const code = errorCodeOf(await response.json().catch(() => null));
		throw new ApiError(path, response.status, code);
	}
	if (response.status === 204) {
		return undefined as T;
	}
	return (await response.json()) as T;
}

/** The user of the session, or null with no session. */
export type Session = { user: { id: string; name: string; email: string } };

/**
 * Sends a request to Better Auth and gives the body of the answer.
 *
 * An error gives no text for the person: the page shows one message in its
 * language.
 */
async function postToAuth<T>(path: string, body: unknown): Promise<T> {
	const response = await fetch(`/api/auth/${path}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		throw new Error(`The request ${path} gave the status ${response.status}.`);
	}
	return (await response.json().catch(() => null)) as T;
}

/**
 * Gives the session of the request, or null.
 *
 * Better Auth answers with the status 200 and the body `null` with no session.
 * Therefore this function reads the body, and it does not read the status.
 */
export async function fetchSession(): Promise<Session | null> {
	const response = await fetch("/api/auth/get-session");
	if (!response.ok) {
		return null;
	}
	return ((await response.json().catch(() => null)) as Session | null) ?? null;
}

/**
 * Starts the sign-in with Google. It gives the address of the page of Google.
 *
 * Better Auth writes the cookie of the state and gives the address. The page
 * then opens that address: the request holds no redirect, because `fetch`
 * cannot follow a redirect to an other origin as a page.
 */
export async function startGoogleSignIn(
	body: GoogleSignInBody,
): Promise<string> {
	const answer = await postToAuth<{ url?: unknown }>("sign-in/social", body);
	if (typeof answer?.url !== "string") {
		throw new Error("Better Auth gave no address of Google.");
	}
	return answer.url;
}

export async function signOut(): Promise<void> {
	await postToAuth("sign-out", {});
}

export function fetchCatalogue(): Promise<CatalogueResponse> {
	return request<CatalogueResponse>("GET", "/api/catalogue");
}

export function fetchAccounts(): Promise<AccountsResponse> {
	return request<AccountsResponse>("GET", "/api/accounts");
}

export function fetchPotential(): Promise<PotentialResponse> {
	return request<PotentialResponse>("GET", "/api/potential");
}

export function fetchFavorites(): Promise<FavoritesResponse> {
	return request<FavoritesResponse>("GET", "/api/favorites");
}

/**
 * Marks a currency as a favourite of the user, or it removes that mark.
 *
 * The two requests are idempotent. Thus the client sends the state that the
 * heart shows, and a second tap gives no error.
 */
export function setFavorite(
	currencyId: string,
	favorite: boolean,
): Promise<void> {
	const path = `/api/favorites/${encodeURIComponent(currencyId)}`;
	return request(favorite ? "PUT" : "DELETE", path);
}

/** Adds an account of the user. It gives the id of the new account. */
export function createAccount(
	input: CreateAccountInput,
): Promise<{ id: string }> {
	return request<{ id: string }>("POST", "/api/accounts", input);
}

/**
 * Adds a snapshot of the balance of an account.
 *
 * The id of the account is a UUID, but `encodeURIComponent` keeps the path
 * correct also with an other shape of the id.
 */
export function addSnapshot(
	accountId: string,
	input: AddSnapshotInput,
): Promise<{ id: string }> {
	return request<{ id: string }>(
		"POST",
		`/api/accounts/${encodeURIComponent(accountId)}/snapshots`,
		input,
	);
}

/** Removes an account of the user, with each snapshot of that account. */
export function deleteAccount(accountId: string): Promise<void> {
	return request("DELETE", `/api/accounts/${encodeURIComponent(accountId)}`);
}

/**
 * Removes one snapshot of an account.
 *
 * The client sends the id of the snapshot that it shows. Thus it removes that
 * balance, and no balance that an other device wrote after it.
 */
export function deleteSnapshot(
	accountId: string,
	snapshotId: string,
): Promise<void> {
	return request(
		"DELETE",
		`/api/accounts/${encodeURIComponent(accountId)}/snapshots/${encodeURIComponent(snapshotId)}`,
	);
}
