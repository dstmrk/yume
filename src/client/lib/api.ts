import type {
	AccountsResponse,
	CatalogueResponse,
	CreateAccountInput,
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

export function fetchCatalogue(): Promise<CatalogueResponse> {
	return get<CatalogueResponse>("/api/catalogue");
}

export function fetchAccounts(): Promise<AccountsResponse> {
	return get<AccountsResponse>("/api/accounts");
}

export function fetchPotential(): Promise<PotentialResponse> {
	return get<PotentialResponse>("/api/potential");
}

/** Adds an account of the user. It gives the id of the new account. */
export function createAccount(
	input: CreateAccountInput,
): Promise<{ id: string }> {
	return post<{ id: string }>("/api/accounts", input);
}
