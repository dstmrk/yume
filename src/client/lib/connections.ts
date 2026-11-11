/**
 * The logic of the list of the assistants on the dashboard: the clients that
 * the user authorised on the MCP server. Issue #97 and paragraph 4.7.2 of
 * `docs/architecture.md`.
 */

import type { Connection } from "../../shared/api.ts";
import { formatDate } from "./format.ts";

/**
 * The two lines of an assistant: its name, then the host that receives its
 * code and the date of the consent. With no host, the second line holds the
 * date only. The date is the date in UTC of the consent.
 */
export function connectionLabel(
	connection: Connection,
	intl: string,
): { title: string; detail: string } {
	const date = formatDate(connection.connectedAt.slice(0, 10), intl);
	return {
		title: connection.name,
		detail: connection.host === "" ? date : `${connection.host} · ${date}`,
	};
}
