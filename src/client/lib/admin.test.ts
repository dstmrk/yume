import { describe, expect, it } from "vitest";
import { adminSummary, dayOf, filterUsers, pageOf } from "./admin.ts";

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

describe("filterUsers", () => {
	const users = [
		{ email: "anna@example.com", tier: "free" as const },
		{ email: "Bruno@Example.com", tier: "supporter" as const },
		{ email: "carla@other.org", tier: "unlimited" as const },
	];

	it("gives each user with no text and the filter all", () => {
		expect(filterUsers(users, "", "all")).toEqual(users);
	});

	it("keeps the users of one level", () => {
		expect(filterUsers(users, "", "supporter")).toEqual([users[1]]);
	});

	it("finds a part of the email and ignores the case", () => {
		expect(filterUsers(users, "BRUNO", "all")).toEqual([users[1]]);
		expect(filterUsers(users, "example", "all")).toEqual([users[0], users[1]]);
	});

	it("ignores the spaces at the two ends of the text", () => {
		expect(filterUsers(users, "  carla ", "all")).toEqual([users[2]]);
	});

	it("applies the two filters together", () => {
		expect(filterUsers(users, "example", "free")).toEqual([users[0]]);
		expect(filterUsers(users, "carla", "free")).toEqual([]);
	});

	it("gives an empty list with no match", () => {
		expect(filterUsers(users, "nobody", "all")).toEqual([]);
	});
});

describe("pageOf", () => {
	const items = Array.from({ length: 45 }, (_, index) => index);

	it("gives the first page", () => {
		expect(pageOf(items, 1, 20)).toEqual({
			items: items.slice(0, 20),
			page: 1,
			pages: 3,
		});
	});

	it("gives a last page that is not full", () => {
		expect(pageOf(items, 3, 20).items).toEqual([40, 41, 42, 43, 44]);
	});

	// A filter or a change of a level can make the list shorter than the page.
	it("gives the last page for a page after the end", () => {
		expect(pageOf(items, 9, 20)).toMatchObject({ page: 3, pages: 3 });
	});

	it("gives the first page for a page before the start", () => {
		expect(pageOf(items, 0, 20).page).toBe(1);
		expect(pageOf(items, -2, 20).page).toBe(1);
	});

	it("gives one empty page with no item", () => {
		expect(pageOf([], 1, 20)).toEqual({ items: [], page: 1, pages: 1 });
	});

	it("gives one page for a list of exactly one page", () => {
		expect(pageOf(items.slice(0, 20), 1, 20).pages).toBe(1);
	});

	it("uses 20 items for each page by default", () => {
		expect(pageOf(items, 1).items).toHaveLength(20);
	});
});
