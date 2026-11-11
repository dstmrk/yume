import { describe, expect, it } from "vitest";
import type { Connection } from "../../shared/api.ts";
import { connectionLabel } from "./connections.ts";
import { formatDate } from "./format.ts";

const INTL = "it-IT";

const CLAUDE: Connection = {
	clientId: "https://claude.ai/oauth/mcp-client-metadata",
	name: "Claude",
	host: "claude.ai",
	connectedAt: "2026-11-05T10:00:00.000Z",
};

describe("connectionLabel", () => {
	it("gives the name as the title", () => {
		expect(connectionLabel(CLAUDE, INTL).title).toBe("Claude");
	});

	it("gives the host and the date of the consent", () => {
		expect(connectionLabel(CLAUDE, INTL).detail).toBe(
			`claude.ai · ${formatDate("2026-11-05", INTL)}`,
		);
	});

	it("gives the date only with no host", () => {
		expect(connectionLabel({ ...CLAUDE, host: "" }, INTL).detail).toBe(
			formatDate("2026-11-05", INTL),
		);
	});

	// The date is the date in UTC of the consent, as each other date of Yume.
	it("reads the date of the consent from the ISO text", () => {
		const late = { ...CLAUDE, connectedAt: "2026-11-05T23:30:00.000Z" };
		expect(connectionLabel(late, INTL).detail).toContain(
			formatDate("2026-11-05", INTL),
		);
	});
});
