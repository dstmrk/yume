/**
 * The routes of the household. Paragraph 4.10 of `docs/architecture.md` gives
 * the decisions. Each test sends the request of a browser on the page of Yume.
 */

import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import type { HouseholdResponse } from "../shared/api.ts";
import { createApp } from "./app.ts";
import { type Auth, createAuth } from "./auth.ts";
import { insertUser, sessionCookie } from "./db/fixtures.ts";
import { type Db, openDatabase } from "./db/index.ts";
import { createAccount, currentBalances } from "./db/queries.ts";
import {
	household,
	householdInvite,
	householdMember,
	householdPool,
	user,
	userAccount,
} from "./db/schema.ts";
import { seedCatalogue } from "./db/seed/seed.ts";

const BASE_URL = "http://localhost:3000";
const DAY = 24 * 60 * 60 * 1000;

let db: Db;
let auth: Auth;
let app: ReturnType<typeof createApp>;
const cookies = new Map<string, string>();

/** A supporter, a free user and a user of Spain. */
const OWNER = "owner";
const FRIEND = "friend";
const SPANIARD = "spaniard";

beforeEach(async () => {
	db = openDatabase(":memory:");
	migrate(db, { migrationsFolder: "drizzle" });
	seedCatalogue(db);
	auth = createAuth(db, {
		secret: "a-secret-for-the-test",
		baseURL: BASE_URL,
		google: { clientId: "client-id-test", clientSecret: "client-secret-test" },
	});
	app = createApp(db, auth, [BASE_URL], { limits: true });
	insertUser(db, OWNER);
	insertUser(db, FRIEND);
	insertUser(db, SPANIARD, "ES");
	supporter(OWNER, true);
	cookies.clear();
	for (const id of [OWNER, FRIEND, SPANIARD]) {
		cookies.set(id, await sessionCookie(auth, id));
	}
});

function supporter(id: string, active: boolean) {
	db.update(user)
		.set({ supporterUntil: new Date(Date.now() + (active ? DAY : -DAY)) })
		.where(eq(user.id, id))
		.run();
}

function send(as: string, method: string, path: string, body?: unknown) {
	return app.request(path, {
		method,
		headers: {
			cookie: cookies.get(as) ?? "",
			origin: BASE_URL,
			...(body === undefined ? {} : { "content-type": "application/json" }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

async function view(as: string): Promise<HouseholdResponse> {
	const response = await send(as, "GET", "/api/household");
	expect(response.status).toBe(200);
	return (await response.json()) as HouseholdResponse;
}

async function make(as = OWNER): Promise<string> {
	const response = await send(as, "POST", "/api/household");
	expect(response.status).toBe(201);
	return ((await response.json()) as { id: string }).id;
}

async function join(id: string, as = FRIEND) {
	expect(
		(
			await send(OWNER, "POST", "/api/household/invites", {
				email: `${as}@example.com`,
			})
		).status,
	).toBe(204);
	expect(
		(await send(as, "POST", `/api/household/invitations/${id}`)).status,
	).toBe(204);
}

async function manual(name = "Giulia"): Promise<string> {
	const response = await send(OWNER, "POST", "/api/household/members", {
		name,
	});
	expect(response.status).toBe(201);
	return ((await response.json()) as { id: string }).id;
}

describe("POST /api/household", () => {
	it("makes a household with the owner as the first member", async () => {
		const id = await make();
		const body = await view(OWNER);
		expect(body.household).toMatchObject({ id, owner: true, canManage: true });
		expect(body.household?.members).toEqual([
			expect.objectContaining({ kind: "user", owner: true, self: true }),
		]);
	});

	it("refuses a second household", async () => {
		await make();
		const response = await send(OWNER, "POST", "/api/household");
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: "already_in_household" });
	});

	it("refuses a free account with the limits active", async () => {
		const response = await send(FRIEND, "POST", "/api/household");
		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: "supporter_required" });
	});

	it("refuses a user with no country", async () => {
		db.update(user).set({ country: null }).where(eq(user.id, OWNER)).run();
		const response = await send(OWNER, "POST", "/api/household");
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: "country_required" });
	});

	it("gives the household to a free account with no limits", async () => {
		const open = createApp(db, auth, [BASE_URL]);
		const response = await open.request("/api/household", {
			method: "POST",
			headers: { cookie: cookies.get(FRIEND) ?? "", origin: BASE_URL },
		});
		expect(response.status).toBe(201);
	});
});

describe("the invitations", () => {
	it("shows the invitation to the person of the address only", async () => {
		const id = await make();
		await send(OWNER, "POST", "/api/household/invites", {
			email: " Friend@Example.com ",
		});
		expect((await view(FRIEND)).invitations).toEqual([
			{ householdId: id, ownerName: OWNER },
		]);
		expect((await view(SPANIARD)).invitations).toEqual([]);
		expect((await view(OWNER)).household?.invites).toEqual([
			"friend@example.com",
		]);
	});

	it("gives the balances of each member to each member after the acceptance", async () => {
		const id = await make();
		createAccount(db, {
			userId: OWNER,
			programId: "ba-club",
			snapshot: { points: 1000, observedAt: "2026-11-01" },
		});
		createAccount(db, {
			userId: FRIEND,
			programId: "iberia-club",
			snapshot: { points: 500, observedAt: "2026-11-01" },
		});
		await join(id);

		const body = await view(FRIEND);
		expect(body.household?.owner).toBe(false);
		expect(body.household?.canManage).toBe(false);
		expect(body.household?.invites).toEqual([]);
		expect(
			body.household?.members.map((m) => [m.name, m.accounts[0]?.points]),
		).toEqual([
			[OWNER, 1000],
			[FRIEND, 500],
		]);
	});

	it("does not open the household to an other address", async () => {
		const id = await make();
		await send(OWNER, "POST", "/api/household/invites", {
			email: "friend@example.com",
		});
		const response = await send(
			SPANIARD,
			"POST",
			`/api/household/invitations/${id}`,
		);
		expect(response.status).toBe(404);
		expect((await view(SPANIARD)).household).toBeNull();
	});

	it("refuses a person of an other country", async () => {
		const id = await make();
		await send(OWNER, "POST", "/api/household/invites", {
			email: "spaniard@example.com",
		});
		const response = await send(
			SPANIARD,
			"POST",
			`/api/household/invitations/${id}`,
		);
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: "country_mismatch" });
	});

	it("refuses a person in an other household, and keeps the invitation", async () => {
		const id = await make();
		supporter(FRIEND, true);
		await make(FRIEND);
		await send(OWNER, "POST", "/api/household/invites", {
			email: "friend@example.com",
		});
		const response = await send(
			FRIEND,
			"POST",
			`/api/household/invitations/${id}`,
		);
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: "already_in_household" });
	});

	it("removes the other invitations of the address after an acceptance", async () => {
		const id = await make();
		insertUser(db, "second");
		supporter("second", true);
		cookies.set("second", await sessionCookie(auth, "second"));
		const other = await make("second");
		await send("second", "POST", "/api/household/invites", {
			email: "friend@example.com",
		});
		await join(id);
		expect(
			db
				.select()
				.from(householdInvite)
				.where(eq(householdInvite.householdId, other))
				.all(),
		).toEqual([]);
	});

	it("refuses an address of a member", async () => {
		const id = await make();
		await join(id);
		for (const email of ["friend@example.com", "OWNER@example.com"]) {
			const response = await send(OWNER, "POST", "/api/household/invites", {
				email,
			});
			expect(response.status).toBe(409);
			expect(await response.json()).toEqual({ error: "already_member" });
		}
	});

	it("accepts the same invitation two times and writes one row", async () => {
		await make();
		for (let i = 0; i < 2; i++) {
			expect(
				(
					await send(OWNER, "POST", "/api/household/invites", {
						email: "friend@example.com",
					})
				).status,
			).toBe(204);
		}
		expect(db.select().from(householdInvite).all()).toHaveLength(1);
	});

	it("refuses an invitation from a member who is not the owner", async () => {
		const id = await make();
		await join(id);
		const response = await send(FRIEND, "POST", "/api/household/invites", {
			email: "spaniard@example.com",
		});
		expect(response.status).toBe(404);
	});

	it("refuses an address that is not correct", async () => {
		await make();
		const response = await send(OWNER, "POST", "/api/household/invites", {
			email: "friend",
		});
		expect(response.status).toBe(400);
	});

	it("removes an invitation of the owner, and a refusal of the person", async () => {
		const id = await make();
		await send(OWNER, "POST", "/api/household/invites", {
			email: "friend@example.com",
		});
		expect(
			(await send(FRIEND, "DELETE", `/api/household/invitations/${id}`)).status,
		).toBe(204);
		expect((await view(FRIEND)).invitations).toEqual([]);

		await send(OWNER, "POST", "/api/household/invites", {
			email: "friend@example.com",
		});
		expect(
			(await send(OWNER, "DELETE", "/api/household/invites/friend@example.com"))
				.status,
		).toBe(204);
		expect((await view(OWNER)).household?.invites).toEqual([]);
	});
});

describe("the limit of 8 people", () => {
	it("counts the members, the manual members and the open invitations", async () => {
		await make();
		await send(OWNER, "POST", "/api/household/invites", {
			email: "friend@example.com",
		});
		for (let i = 0; i < 6; i++) {
			await manual(`Persona ${i}`);
		}
		// 1 owner + 1 invitation + 6 manual members.
		const member = await send(OWNER, "POST", "/api/household/members", {
			name: "Nona",
		});
		expect(member.status).toBe(409);
		expect(await member.json()).toEqual({ error: "household_full" });
		const invitation = await send(OWNER, "POST", "/api/household/invites", {
			email: "spaniard@example.com",
		});
		expect(invitation.status).toBe(409);
	});

	it("lets the invited person accept in the last place", async () => {
		const id = await make();
		await send(OWNER, "POST", "/api/household/invites", {
			email: "friend@example.com",
		});
		for (let i = 0; i < 6; i++) {
			await manual(`Persona ${i}`);
		}
		expect(
			(await send(FRIEND, "POST", `/api/household/invitations/${id}`)).status,
		).toBe(204);
		expect((await view(OWNER)).household?.members).toHaveLength(8);
	});
});

describe("the manual members", () => {
	it("holds accounts that only the household shows", async () => {
		const id = await make();
		const giulia = await manual();
		const response = await send(
			OWNER,
			"POST",
			`/api/household/members/${giulia}/accounts`,
			{
				programId: "amex-mr",
				snapshot: { points: 1000, observedAt: "2026-11-01" },
			},
		);
		expect(response.status).toBe(201);

		expect(currentBalances(db, OWNER)).toEqual([]);
		await join(id);
		const member = (await view(FRIEND)).household?.members.find(
			(m) => m.id === giulia,
		);
		expect(member).toMatchObject({ kind: "manual", name: "Giulia" });
		expect(member?.accounts.map((a) => a.points)).toEqual([1000]);
	});

	it("lets only the owner write the accounts of a manual member", async () => {
		const id = await make();
		const giulia = await manual();
		await join(id);
		const response = await send(
			FRIEND,
			"POST",
			`/api/household/members/${giulia}/accounts`,
			{ programId: "amex-mr" },
		);
		expect(response.status).toBe(404);
	});

	it("refuses an account for a member of Yume", async () => {
		const id = await make();
		await join(id);
		const friend = (await view(OWNER)).household?.members.find(
			(m) => m.kind === "user" && !m.owner,
		);
		const response = await send(
			OWNER,
			"POST",
			`/api/household/members/${friend?.id}/accounts`,
			{ programId: "amex-mr" },
		);
		expect(response.status).toBe(404);
	});

	it("updates and removes a balance of a manual member", async () => {
		await make();
		const giulia = await manual();
		const created = await send(
			OWNER,
			"POST",
			`/api/household/members/${giulia}/accounts`,
			{ programId: "ba-club" },
		);
		const { id: accountId } = (await created.json()) as { id: string };

		const snapshot = await send(
			OWNER,
			"POST",
			`/api/household/accounts/${accountId}/snapshots`,
			{ points: 300, observedAt: "2026-11-02" },
		);
		expect(snapshot.status).toBe(201);
		// The personal route does not reach the account of a manual member.
		const personal = await send(
			OWNER,
			"POST",
			`/api/accounts/${accountId}/snapshots`,
			{ points: 1, observedAt: "2026-11-02" },
		);
		expect(personal.status).toBe(404);

		expect(
			(await send(OWNER, "DELETE", `/api/household/accounts/${accountId}`))
				.status,
		).toBe(204);
		expect(db.select().from(userAccount).all()).toEqual([]);
	});

	it("refuses a balance of a personal account on the route of the household", async () => {
		await make();
		const own = createAccount(db, { userId: OWNER, programId: "ba-club" });
		const response = await send(
			OWNER,
			"POST",
			`/api/household/accounts/${own}/snapshots`,
			{ points: 1, observedAt: "2026-11-02" },
		);
		expect(response.status).toBe(404);
		expect(
			(await send(OWNER, "DELETE", `/api/household/accounts/${own}`)).status,
		).toBe(404);
	});

	it("refuses a name of spaces", async () => {
		await make();
		const response = await send(OWNER, "POST", "/api/household/members", {
			name: "   ",
		});
		expect(response.status).toBe(400);
	});
});

describe("the end of the supporter account of the owner", () => {
	it("keeps the household and the balances, and stops each new addition", async () => {
		const id = await make();
		const giulia = await manual();
		const created = await send(
			OWNER,
			"POST",
			`/api/household/members/${giulia}/accounts`,
			{ programId: "ba-club" },
		);
		const { id: accountId } = (await created.json()) as { id: string };
		await send(OWNER, "POST", "/api/household/invites", {
			email: "friend@example.com",
		});
		supporter(OWNER, false);

		expect((await view(OWNER)).household?.canManage).toBe(false);
		expect(
			(await send(OWNER, "POST", "/api/household/members", { name: "Luca" }))
				.status,
		).toBe(403);
		expect(
			(
				await send(OWNER, "POST", "/api/household/invites", {
					email: "spaniard@example.com",
				})
			).status,
		).toBe(403);
		expect(
			(
				await send(OWNER, "POST", `/api/household/members/${giulia}/accounts`, {
					programId: "iberia-club",
				})
			).status,
		).toBe(403);
		// A balance stays open, and an open invitation stays valid.
		expect(
			(
				await send(
					OWNER,
					"POST",
					`/api/household/accounts/${accountId}/snapshots`,
					{
						points: 10,
						observedAt: "2026-11-02",
					},
				)
			).status,
		).toBe(201);
		expect(
			(await send(FRIEND, "POST", `/api/household/invitations/${id}`)).status,
		).toBe(204);
	});
});

describe("the removal of members", () => {
	it("lets a member of Yume leave, with the own accounts", async () => {
		const id = await make();
		createAccount(db, { userId: FRIEND, programId: "ba-club" });
		await join(id);
		const own = (await view(FRIEND)).household?.members.find((m) => m.self);
		expect(
			(await send(FRIEND, "DELETE", `/api/household/members/${own?.id}`))
				.status,
		).toBe(204);
		expect((await view(FRIEND)).household).toBeNull();
		expect(currentBalances(db, FRIEND)).toHaveLength(1);
	});

	it("refuses the owner who leaves", async () => {
		await make();
		const own = (await view(OWNER)).household?.members.find((m) => m.self);
		const response = await send(
			OWNER,
			"DELETE",
			`/api/household/members/${own?.id}`,
		);
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: "owner_cannot_leave" });
	});

	it("refuses a member who removes an other member", async () => {
		const id = await make();
		const giulia = await manual();
		await join(id);
		const owner = (await view(FRIEND)).household?.members.find((m) => m.owner);
		for (const target of [giulia, owner?.id]) {
			expect(
				(await send(FRIEND, "DELETE", `/api/household/members/${target}`))
					.status,
			).toBe(404);
		}
	});

	it("removes the manual members and keeps the accounts of Yume with the household", async () => {
		const id = await make();
		const giulia = await manual();
		await send(OWNER, "POST", `/api/household/members/${giulia}/accounts`, {
			programId: "ba-club",
		});
		createAccount(db, { userId: FRIEND, programId: "iberia-club" });
		await join(id);

		expect((await send(FRIEND, "DELETE", "/api/household")).status).toBe(404);
		expect((await send(OWNER, "DELETE", "/api/household")).status).toBe(204);

		expect(db.select().from(household).all()).toEqual([]);
		expect(db.select().from(householdMember).all()).toEqual([]);
		expect(
			db
				.select()
				.from(userAccount)
				.all()
				.map((a) => a.userId),
		).toEqual([FRIEND]);
	});
});

describe("the potential miles of the household", () => {
	async function avios(as: string) {
		return (await view(as)).household?.potential.find(
			(row) => row.currencyId === "avios",
		);
	}

	beforeEach(async () => {
		const id = await make();
		createAccount(db, {
			userId: OWNER,
			programId: "ba-club",
			snapshot: { points: 1000, observedAt: "2026-11-01" },
		});
		const giulia = await manual();
		await send(OWNER, "POST", `/api/household/members/${giulia}/accounts`, {
			programId: "iberia-club",
			snapshot: { points: 500, observedAt: "2026-11-01" },
		});
		await join(id);
	});

	it("gives no total for a currency with no pool", async () => {
		const row = await avios(FRIEND);
		expect(row?.pooled).toBe(false);
		expect(row?.total).toBeNull();
		expect(row?.members.map((m) => m.potential.total)).toEqual([1000, 500, 0]);
	});

	it("adds the members for a currency with a pool in the country", async () => {
		db.insert(householdPool)
			.values({ programId: "ba-club", country: "IT", validFrom: "2026-01-01" })
			.run();
		expect((await avios(FRIEND))?.total).toBe(1500);
	});

	it("ignores a pool of an other country", async () => {
		db.insert(householdPool)
			.values({ programId: "ba-club", country: "ES", validFrom: "2026-01-01" })
			.run();
		expect((await avios(OWNER))?.total).toBeNull();
	});
});
