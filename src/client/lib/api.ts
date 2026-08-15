import type {
	AccountsResponse,
	AddSnapshotInput,
	CatalogueResponse,
	CreateAccountInput,
	FavoritesResponse,
	InvitationsResponse,
	PotentialResponse,
} from "../../shared/api.ts";

/**
 * The client of the API.
 *
 * Hono supplies the client and the API from one origin, thus each path starts
 * with `/api`. In development the proxy of Vite gives the same result.
 */
async function get<T>(path: string): Promise<T> {
	const response = await fetch(path);
	if (!response.ok) {
		throw new Error(`${path} gives the status ${response.status}`);
	}
	return (await response.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
	const response = await fetch(path, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		throw new Error(`${path} gives the status ${response.status}`);
	}
	return (await response.json()) as T;
}

/**
 * Removes a row. The answer of a removal holds no body, thus this function
 * reads only the status.
 */
async function del(path: string): Promise<void> {
	const response = await fetch(path, { method: "DELETE" });
	if (!response.ok) {
		throw new Error(`${path} gives the status ${response.status}`);
	}
}

/**
 * Writes a state. The answer holds no body, thus this function reads only the
 * status.
 */
async function put(path: string): Promise<void> {
	const response = await fetch(path, { method: "PUT" });
	if (!response.ok) {
		throw new Error(`${path} gives the status ${response.status}`);
	}
}

/**
 * An error of Better Auth, with the field `code` of the answer.
 *
 * The client shows the message of that code in Italian. Refer to
 * `src/client/lib/auth.ts`.
 */
export class AuthError extends Error {
	constructor(readonly code: string | undefined) {
		super(code ?? "auth");
		this.name = "AuthError";
	}
}

/** The user of the session, or null with no session. */
export type Session = { user: { id: string; name: string; email: string } };

async function postToAuth(path: string, body: unknown): Promise<void> {
	const response = await fetch(`/api/auth/${path}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		const error = (await response.json().catch(() => null)) as {
			code?: string;
		} | null;
		throw new AuthError(error?.code);
	}
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

export function signIn(input: {
	email: string;
	password: string;
}): Promise<void> {
	return postToAuth("sign-in/email", input);
}

/** The sign-up needs an invitation. Refer to paragraph 4 of the architecture. */
export function signUp(input: {
	name: string;
	email: string;
	password: string;
	inviteCode: string;
}): Promise<void> {
	return postToAuth("sign-up/email", input);
}

export function signOut(): Promise<void> {
	return postToAuth("sign-out", {});
}

export function fetchCatalogue(): Promise<CatalogueResponse> {
	return get<CatalogueResponse>("/api/catalogue");
}

export function fetchAccounts(): Promise<AccountsResponse> {
	return get<AccountsResponse>("/api/accounts");
}

export function fetchPotential(): Promise<PotentialResponse> {
	return get<PotentialResponse>("/api/potential");
}

export function fetchFavorites(): Promise<FavoritesResponse> {
	return get<FavoritesResponse>("/api/favorites");
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
	return favorite ? put(path) : del(path);
}

export function fetchInvitations(): Promise<InvitationsResponse> {
	return get<InvitationsResponse>("/api/invitations");
}

/**
 * Writes an invitation of the user. It gives the code and the date of the end.
 *
 * The request holds no body: the server writes the code and the time of
 * validity. A user with no free slot reads the status 409.
 */
export function createInvitation(): Promise<{
	code: string;
	expiresAt: string;
}> {
	return post<{ code: string; expiresAt: string }>("/api/invitations", {});
}

/** Adds an account of the user. It gives the id of the new account. */
export function createAccount(
	input: CreateAccountInput,
): Promise<{ id: string }> {
	return post<{ id: string }>("/api/accounts", input);
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
	return post<{ id: string }>(
		`/api/accounts/${encodeURIComponent(accountId)}/snapshots`,
		input,
	);
}

/** Removes an account of the user, with each snapshot of that account. */
export function deleteAccount(accountId: string): Promise<void> {
	return del(`/api/accounts/${encodeURIComponent(accountId)}`);
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
	return del(
		`/api/accounts/${encodeURIComponent(accountId)}/snapshots/${encodeURIComponent(snapshotId)}`,
	);
}
