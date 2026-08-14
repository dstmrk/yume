import { sql } from "drizzle-orm";
import { Hono } from "hono";
import {
	type AccountsResponse,
	addSnapshotSchema,
	type CatalogueResponse,
	createAccountSchema,
	type InvitationsResponse,
	type PotentialResponse,
} from "../shared/api.ts";
import { DEFAULT_COUNTRY } from "../shared/catalogue.ts";
import { potentialMiles } from "../shared/potential.ts";
import type { Auth } from "./auth.ts";
import type { Db } from "./db/index.ts";
import {
	addSnapshot,
	allCurrencies,
	allPrograms,
	allTransferRules,
	createAccount,
	createInvitationForUser,
	currentBalances,
	deleteAccount,
	deleteSnapshot,
	findAccount,
	invitationsOfUser,
} from "./db/queries.ts";
import { heldSlots, INVITATION_LIMIT, invitationState } from "./invitation.ts";

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
	 * Removes an account of the user, with each snapshot of that account.
	 *
	 * The query holds the user in its condition. Thus the account of an other
	 * user gives the status 404, and no answer says that the account exists.
	 */
	app.delete("/api/accounts/:id", (c) => {
		const removed = deleteAccount(db, c.req.param("id"), c.get("userId"));
		if (!removed) {
			return c.json({ error: "unknown_account" }, 404);
		}
		return c.body(null, 204);
	});

	/**
	 * Removes one snapshot of an account.
	 *
	 * This operation is the correction of a value that the user wrote in a wrong
	 * way. The current balance then goes back to the snapshot before it.
	 */
	app.delete("/api/accounts/:id/snapshots/:snapshotId", (c) => {
		const accountId = c.req.param("id");
		if (findAccount(db, accountId, c.get("userId")) === undefined) {
			return c.json({ error: "unknown_account" }, 404);
		}
		const removed = deleteSnapshot(db, c.req.param("snapshotId"), accountId);
		if (!removed) {
			return c.json({ error: "unknown_snapshot" }, 404);
		}
		return c.body(null, 204);
	});

	/**
	 * The invitations that the user wrote, with the quantity of free slots.
	 *
	 * The route gives no invitation of an other user: the query holds the user
	 * in its condition. Paragraph 4 of `docs/architecture.md` gives the limit.
	 */
	app.get("/api/invitations", (c) => {
		const at = new Date().toISOString();
		const rows = invitationsOfUser(db, c.get("userId"));
		const body: InvitationsResponse = {
			invitations: rows.map((row) => ({
				code: row.code,
				expiresAt: row.expiresAt,
				state: invitationState(row, at),
			})),
			left: INVITATION_LIMIT - heldSlots(rows, at),
		};
		return c.json(body);
	});

	/**
	 * Writes an invitation of the user.
	 *
	 * The user has a maximum of two slots. A user with no free slot reads the
	 * status 409: the button of the interface is already not active, thus this
	 * answer arrives only with two requests at the same moment.
	 */
	app.post("/api/invitations", (c) => {
		const written = createInvitationForUser(db, {
			userId: c.get("userId"),
			at: new Date().toISOString(),
		});
		if (written === null) {
			return c.json({ error: "no_invitation_left" }, 409);
		}
		return c.json(written, 201);
	});

	/**
	 * The potential miles of each airline currency.
	 *
	 * A flexible currency is a source, thus it has no potential. The client must
	 * not add the values of two currencies: the user cannot send the same points
	 * to two currencies.
	 *
	 * The route uses the rules of `DEFAULT_COUNTRY`. The user selects no country
	 * now. Paragraph 3.3.2 of `docs/architecture.md` gives the reason.
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
					country: DEFAULT_COUNTRY,
					at,
				}),
			);

		const body: PotentialResponse = { at, potential };
		return c.json(body);
	});

	/**
	 * A path of the API that no route above matches.
	 *
	 * The server supplies the files of the client after this application, and a
	 * path that no file matches gives `index.html`. Without this route, a path
	 * of the API that holds an error gives that page with the status 200. Then
	 * the client reads HTML in the place of JSON, and the cause of the defect
	 * stays hidden.
	 *
	 * The route is the last one, thus it takes only a path that no route above
	 * holds. The middleware of the session is before it: a path that is not
	 * correct gives the status 401 with no session, and it says nothing about
	 * the routes of the application.
	 */
	app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

	return app;
}
