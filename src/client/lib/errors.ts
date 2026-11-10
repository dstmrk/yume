import { SUPPORTER_REQUIRED } from "../../shared/api.ts";

/**
 * An answer of the API with a status that is not correct.
 *
 * The client keeps the status and the field `error` of the body. A form then
 * shows a message for a known code, and the general message for each other
 * error.
 */
export class ApiError extends Error {
	readonly status: number;
	/** The field `error` of the body, or null when the body has no such text. */
	readonly code: string | null;

	constructor(path: string, status: number, code: string | null) {
		super(`${path} gives the status ${status}`);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
	}
}

/** Gives the field `error` of a body of JSON, or null. */
export function errorCodeOf(body: unknown): string | null {
	if (typeof body !== "object" || body === null || !("error" in body)) {
		return null;
	}
	return typeof body.error === "string" ? body.error : null;
}

/**
 * True when the server refuses a request that the free account cannot do. The
 * form then shows its own message, not the general message of an error.
 */
export function isSupporterRequired(error: unknown): boolean {
	return error instanceof ApiError && error.code === SUPPORTER_REQUIRED;
}
