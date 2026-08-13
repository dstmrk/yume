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
import type { Auth } from "./auth.ts";
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
 * The routes with no session.
 *
 * The container reads the state of the application before a person signs in.
 * Better Auth controls its own routes: the sign-in has no session before it.
 */
const PUBLIC = ["/api/health", "/api/auth/"];

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

export function createApp(db: Db, auth: Auth) {
	const app = new Hono<{ Variables: { userId: string } }>();

	/**
	 * Each route of the data needs a session.
	 *
	 * This middleware is the first one, thus a new route is closed and no person
	 * must remember the protection. The list `PUBLIC` holds the exceptions.
	 * Each route then reads the user with `c.get("userId")`.
	 */
	app.use("/api/*", async (c, next) => {
		if (PUBLIC.some((path) => c.req.path.startsWith(path))) {
			return next();
		}

		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		if (session === null) {
			return c.json({ error: "unauthorized" }, 401);
		}

		c.set("userId", session.user.id);
		return next();
	});

	/**
	 * The routes of Better Auth: the sign-up, the sign-in, the sign-out and the
	 * session. The library reads the request and writes the cookies.
	 */
	app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

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
			accounts: currentBalances(db, c.get("userId")),
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
		const id = createAccount(db, { userId: c.get("userId"), ...body.data });
		return c.json({ id }, 201);
	});

	app.post("/api/accounts/:id/snapshots", async (c) => {
		const accountId = c.req.param("id");
		if (findAccount(db, accountId, c.get("userId")) === undefined) {
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
		const balances = currentBalances(db, c.get("userId"))
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
