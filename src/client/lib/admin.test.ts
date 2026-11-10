import { describe, expect, it } from "vitest";
import { adminSummary, dayOf } from "./admin.ts";

const NOW = new Date("2026-11-10T12:00:00Z");

function joined(createdAt: string) {
	return { createdAt };
}

describe("adminSummary", () => {
	it("counts each user and the users of the last 30 days", () => {
		const users = [
			joined("2026-11-10T11:00:00Z"),
			joined("2026-10-20T00:00:00Z"),
			joined("2026-01-01T00:00:00Z"),
		];
		expect(adminSummary(users, NOW)).toEqual({ total: 3, recent: 2 });
	});

	it("gives zero with no user", () => {
		expect(adminSummary([], NOW)).toEqual({ total: 0, recent: 0 });
	});

	// The limit is 30 days of 24 hours before the instant of the page.
	it("counts a user at the exact limit of 30 days", () => {
		const users = [
			joined("2026-10-11T12:00:00Z"),
			joined("2026-10-11T11:59:59Z"),
		];
		expect(adminSummary(users, NOW)).toEqual({ total: 2, recent: 1 });
	});

	// A clock of the server in front of the clock of the device.
	it("counts a user of an instant after the clock of the device", () => {
		expect(adminSummary([joined("2026-11-10T13:00:00Z")], NOW).recent).toBe(1);
	});

	it("does not count a date that it cannot read as recent", () => {
		expect(adminSummary([joined("not-a-date")], NOW)).toEqual({
			total: 1,
			recent: 0,
		});
	});
});

describe("dayOf", () => {
	it("gives the day in UTC of an instant", () => {
		expect(dayOf("2026-11-10T23:30:00.000Z")).toBe("2026-11-10");
	});

	it("gives the same text for a value that it cannot read", () => {
		expect(dayOf("not-a-date")).toBe("not-a-date");
	});
});
