import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createAccount,
	deleteAccount,
	fetchCatalogue,
	setFavorite,
	setUnlimited,
} from "./api.ts";
import { ApiError } from "./errors.ts";

/** Replaces `fetch` with one answer, and gives the mock to read the calls. */
function answer(response: Response) {
	return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
	const error = await promise.then(
		() => null,
		(reason: unknown) => reason,
	);
	if (!(error instanceof ApiError)) {
		throw new Error(`no ApiError: ${String(error)}`);
	}
	return error;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("the client of the API", () => {
	it("gives the body of an answer of 2xx", async () => {
		answer(json({ currencies: [], programs: [] }, 200));
		await expect(fetchCatalogue()).resolves.toEqual({
			currencies: [],
			programs: [],
		});
	});

	it("sends a GET with no body", async () => {
		const fetch = answer(json({ currencies: [], programs: [] }, 200));
		await fetchCatalogue();
		expect(fetch).toHaveBeenCalledWith("/api/catalogue", { method: "GET" });
	});

	it("sends a body as JSON", async () => {
		const fetch = answer(json({ id: "a1" }, 201));
		await expect(createAccount({ programId: "amex-mr" })).resolves.toEqual({
			id: "a1",
		});
		expect(fetch).toHaveBeenCalledWith("/api/accounts", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ programId: "amex-mr" }),
		});
	});

	it("reads no body from an answer of 204", async () => {
		const fetch = answer(new Response(null, { status: 204 }));
		await expect(deleteAccount("a1")).resolves.toBeUndefined();
		expect(fetch).toHaveBeenCalledWith("/api/accounts/a1", {
			method: "DELETE",
		});
	});

	it("sends PUT for a favourite and DELETE to remove it", async () => {
		const fetch = answer(new Response(null, { status: 204 }));
		await setFavorite("avios", true);
		expect(fetch).toHaveBeenLastCalledWith("/api/favorites/avios", {
			method: "PUT",
		});
		await setFavorite("avios", false);
		expect(fetch).toHaveBeenLastCalledWith("/api/favorites/avios", {
			method: "DELETE",
		});
	});

	it("sends the flag unlimited of a user as JSON", async () => {
		const fetch = answer(new Response(null, { status: 204 }));
		await setUnlimited("a/b", true);
		expect(fetch).toHaveBeenLastCalledWith("/api/admin/users/a%2Fb/unlimited", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ unlimited: true }),
		});
	});

	it("gives an ApiError with the code of the body for a 4xx", async () => {
		answer(json({ error: "too_many_accounts" }, 409));
		const error = await rejection(createAccount({ programId: "amex-mr" }));
		expect(error.status).toBe(409);
		expect(error.code).toBe("too_many_accounts");
	});

	// Before the single helper, a GET and a DELETE gave a plain Error.
	it("gives an ApiError also for a GET and a DELETE", async () => {
		answer(json({ error: "unauthorized" }, 401));
		expect((await rejection(fetchCatalogue())).code).toBe("unauthorized");
		answer(json({ error: "unknown_account" }, 404));
		expect((await rejection(deleteAccount("a1"))).code).toBe("unknown_account");
	});

	// A proxy can answer with a page of HTML.
	it("gives an ApiError with no code for a 5xx with a body that is not JSON", async () => {
		answer(new Response("<html>Bad Gateway</html>", { status: 502 }));
		const error = await rejection(fetchCatalogue());
		expect(error.status).toBe(502);
		expect(error.code).toBeNull();
	});

	it("gives an ApiError for a 5xx with no body", async () => {
		answer(new Response(null, { status: 503 }));
		const error = await rejection(fetchCatalogue());
		expect(error.status).toBe(503);
		expect(error.code).toBeNull();
	});
});
