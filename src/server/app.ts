import { sql } from "drizzle-orm";
import { Hono } from "hono";
import {
	type AccountsResponse,
	addSnapshotSchema,
	type CatalogueResponse,
	createAccountSchema,
	type PotentialResponse,
} from "../shared/api.ts";
import { potentialMiles } from "../shared/potential.ts";
import type { Db } from "./db/index.ts";
import {
	addSnapshot,
	allCurrencies,
	allPrograms,
	allTransferRules,
	createAccount,
	currentBalances,
	findAccount,
} from "./db/queries.ts";

/**
 * The application has one user now. Better Auth gives the real user in a later
 * step. Refer to paragraph 4 of `docs/architecture.md`.
 */
export const SINGLE_USER_ID = "local";

/**
 * The date of today, in the ISO 8601 format.
 *
 * The date comes from the clock in UTC. Rome is one hour or two hours in front
 * of UTC. Therefore a rule that starts today enters the calculation some hours
 * late. No ratio changes at night, thus this difference is acceptable.
 */
function today(): string {
	return new Date().toISOString().slice(0, 10);
}

export function createApp(db: Db) {
	const app = new Hono();

	/**
	 * The state of the application, for the `HEALTHCHECK` of the container.
	 *
	 * The route reads the database. A process that answers with a database that
	 * is not available is not in good health: the dashboard gives an error on
	 * each request. Refer to paragraph 7 of `docs/architecture.md`.
	 */
	app.get("/api/health", (c) => {
		try {
			db.get(sql`select 1`);
		} catch {
			return c.json({ status: "error" }, 503);
		}
		return c.json({ status: "ok" });
	});

	app.get("/api/catalogue", (c) => {
		const body: CatalogueResponse = {
			currencies: allCurrencies(db),
			programs: allPrograms(db),
		};
		return c.json(body);
	});

	app.get("/api/accounts", (c) => {
		const body: AccountsResponse = {
			accounts: currentBalances(db, SINGLE_USER_ID),
		};
		return c.json(body);
	});

	app.post("/api/accounts", async (c) => {
		const body = createAccountSchema.safeParse(
			await c.req.json().catch(() => null),
		);
		if (!body.success) {
			return c.json({ error: "invalid_body", issues: body.error.issues }, 400);
		}
		const known = allPrograms(db).some(
			(program) => program.id === body.data.programId,
		);
		if (!known) {
			return c.json({ error: "unknown_program" }, 404);
		}
		const id = createAccount(db, { userId: SINGLE_USER_ID, ...body.data });
		return c.json({ id }, 201);
	});

	app.post("/api/accounts/:id/snapshots", async (c) => {
		const accountId = c.req.param("id");
		if (findAccount(db, accountId, SINGLE_USER_ID) === undefined) {
			return c.json({ error: "unknown_account" }, 404);
		}
		const body = addSnapshotSchema.safeParse(
			await c.req.json().catch(() => null),
		);
		if (!body.success) {
			return c.json({ error: "invalid_body", issues: body.error.issues }, 400);
		}
		const id = addSnapshot(db, { accountId, ...body.data });
		return c.json({ id }, 201);
	});

	/**
	 * The potential miles of each airline currency.
	 *
	 * A flexible currency is a source, thus it has no potential. The client must
	 * not add the values of two currencies: the user cannot send the same points
	 * to two currencies.
	 */
	app.get("/api/potential", (c) => {
		const programs = allPrograms(db);
		const rules = allTransferRules(db);
		const at = today();
		const balances = currentBalances(db, SINGLE_USER_ID)
			.filter((row) => row.points !== null)
			.map((row) => ({ programId: row.programId, points: row.points ?? 0 }));

		const potential = allCurrencies(db)
			.filter((currency) => currency.kind === "airline")
			.map((currency) =>
				potentialMiles({
					currencyId: currency.id,
					balances,
					programs,
					rules,
					at,
				}),
			);

		const body: PotentialResponse = { at, potential };
		return c.json(body);
	});

	return app;
}
