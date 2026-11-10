import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import {
	type AccountsResponse,
	type AdminUsersResponse,
	type CatalogueResponse,
	createAccountSchema,
	type FavoritesResponse,
	type MeResponse,
	type PotentialResponse,
	setUnlimitedSchema,
	TOO_MANY_ACCOUNTS,
} from "../shared/api.ts";
import { accountTier } from "../shared/tier.ts";
import { isAdmin } from "./admin.ts";
import type { Auth } from "./auth.ts";
import type { Db } from "./db/index.ts";
import {
	addFavorite,
	allCurrencies,
	allPrograms,
	countAccounts,
	createAccount,
	currentBalances,
	deleteAccount,
	deleteSnapshot,
	favoriteCurrencies,
	findAccount,
	listUsers,
	removeFavorite,
	setUnlimited,
} from "./db/queries.ts";
import {
	latestObservedAt,
	potentialOf,
	recordSnapshot,
	today,
} from "./operations.ts";

/**
 * The routes with no session.
 *
 * The container reads the state of the application before a person signs in.
 * Better Auth controls its own routes: the sign-in has no session before it.
 */
const PUBLIC = ["/api/health", "/api/auth/"];

/**
 * The maximum quantity of accounts of one user.
 *
 * The sign-up is open, and `GET /api/potential` reads each account of the
 * user in one synchronous loop. Without a ceiling, one user stops the process
 * for each other user. The catalogue has 34 programmes, thus two accounts of
 * each programme stay below this value. Paragraph 4.4 of
 * `docs/architecture.md` gives the reason.
 */
export const MAX_ACCOUNTS_PER_USER = 100;

/**
 * The maximum size of the body of a request to `/api`, in bytes.
 *
 * `c.req.json()` reads the full body into memory. Each body of the API and of
 * the sign-in has less than 1 KB.
 */
export const MAX_BODY_BYTES = 16 * 1024;

/**
 * Makes the application.
 *
 * `origins` holds the origin of the application and each origin of
 * `TRUSTED_ORIGINS`: Better Auth receives the same list. `adminEmail` is the
 * value of `ADMIN_EMAIL`. With no value, the instance has no administrator.
 */
export function createApp(
	db: Db,
	auth: Auth,
	origins: string[],
	adminEmail?: string,
) {
	const app = new Hono<{ Variables: { userId: string; admin: boolean } }>();

	/**
	 * The security headers, on each answer: the API, the files of the client
	 * and the pages. A page of an other site cannot show Yume in a frame.
	 *
	 * Two values are not the defaults of Hono:
	 *
	 * - `Referrer-Policy` is the default of the browser. `no-referrer` changes
	 *   the header `Origin` of some POST requests, and Better Auth examines that
	 *   header.
	 * - No `Strict-Transport-Security`. The default holds `includeSubDomains`:
	 *   on a domain with other services, it forces HTTPS on each subdomain. The
	 *   proxy of the TLS gives that header. Refer to paragraph 7 of
	 *   `docs/architecture.md`.
	 */
	app.use(
		"*",
		secureHeaders({
			referrerPolicy: "strict-origin-when-cross-origin",
			strictTransportSecurity: false,
		}),
	);

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
		c.set("admin", isAdmin(session.user, adminEmail));
		return next();
	});

	/**
	 * Refuses a form of an other origin, with the status 403.
	 *
	 * The cookie of the session is `SameSite=Lax`. A service on an other
	 * subdomain of the same domain is the same site, thus its forms send that
	 * cookie, and `c.req.json()` reads a body of `text/plain`. The middleware
	 * examines a request with the type of a form or with no type: a `DELETE`
	 * with no body has no type. A request of JSON from an other origin needs
	 * CORS, and the server gives no CORS.
	 *
	 * The middleware is after the session: a request with no session gets the
	 * status 401 from each origin. Paragraph 4.4 of `docs/architecture.md` gives
	 * the rule.
	 */
	app.use("/api/*", csrf({ origin: origins }));

	/**
	 * The limit of the size of a body, also on the routes of Better Auth.
	 *
	 * This middleware is after the session: a request with no session gets the
	 * status 401, and the server reads no byte of its body.
	 */
	app.use(
		"/api/*",
		bodyLimit({
			maxSize: MAX_BODY_BYTES,
			onError: (c) => c.json({ error: "payload_too_large" }, 413),
		}),
	);

	/**
	 * The routes of Better Auth: the sign-in with Google, its callback, the
	 * sign-out and the session. The library reads the request and writes the cookies.
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
		const observedAt = body.data.snapshot?.observedAt;
		if (observedAt !== undefined && observedAt > latestObservedAt(new Date())) {
			return c.json({ error: "future_date" }, 400);
		}
		// better-sqlite3 is synchronous and no `await` is between the count and
		// the insert. Thus two requests at the same time cannot both pass.
		if (countAccounts(db, c.get("userId")) >= MAX_ACCOUNTS_PER_USER) {
			return c.json({ error: TOO_MANY_ACCOUNTS }, 409);
		}
		const id = createAccount(db, { userId: c.get("userId"), ...body.data });
		return c.json({ id }, 201);
	});

	/**
	 * Adds a snapshot to an account of the user.
	 *
	 * `recordSnapshot` holds each examination, because the tool `add_snapshot`
	 * of the MCP server gives the same result.
	 */
	app.post("/api/accounts/:id/snapshots", async (c) => {
		const result = recordSnapshot(db, {
			userId: c.get("userId"),
			accountId: c.req.param("id"),
			body: await c.req.json().catch(() => null),
			now: new Date(),
		});
		if (result.ok) {
			return c.json({ id: result.id }, 201);
		}
		switch (result.error) {
			case "unknown_account":
				return c.json({ error: result.error }, 404);
			case "invalid_body":
				return c.json({ error: result.error, issues: result.issues }, 400);
			case "future_date":
				return c.json({ error: result.error }, 400);
		}
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
	 * The currencies that the user marks as a favourite.
	 *
	 * The dashboard reads this list and it puts those cards first. The route
	 * gives no mark of an other user: the query holds the user in its condition.
	 */
	app.get("/api/favorites", (c) => {
		const body: FavoritesResponse = {
			currencyIds: favoriteCurrencies(db, c.get("userId")),
		};
		return c.json(body);
	});

	/**
	 * Marks a currency as a favourite of the user.
	 *
	 * The method is `PUT`, because the operation is idempotent: two taps of the
	 * heart on two devices give one mark and the same answer.
	 */
	app.put("/api/favorites/:currencyId", (c) => {
		const currencyId = c.req.param("currencyId");
		const known = allCurrencies(db).some(
			(currency) => currency.id === currencyId,
		);
		if (!known) {
			return c.json({ error: "unknown_currency" }, 404);
		}
		addFavorite(db, { userId: c.get("userId"), currencyId });
		return c.body(null, 204);
	});

	/**
	 * Removes the mark of a currency.
	 *
	 * A currency with no mark also gives the status 204. The request asks for a
	 * state, and that state is the result. Thus a second tap gives no error.
	 */
	app.delete("/api/favorites/:currencyId", (c) => {
		removeFavorite(db, c.get("userId"), c.req.param("currencyId"));
		return c.body(null, 204);
	});

	/**
	 * The potential miles of each airline currency.
	 *
	 * `potentialOf` holds the calculation, because the tool `get_potential` of
	 * the MCP server gives the same result. The client must not add the values
	 * of two currencies: the user cannot send the same points to two currencies.
	 */
	app.get("/api/potential", (c) => {
		const body: PotentialResponse = potentialOf(
			db,
			c.get("userId"),
			today(new Date()),
		);
		return c.json(body);
	});

	/** The user of the session. The client reads if it is the administrator. */
	app.get("/api/me", (c) => {
		const body: MeResponse = { admin: c.get("admin") };
		return c.json(body);
	});

	/**
	 * The routes of the administrator.
	 *
	 * A user that is not the administrator receives the answer of a path that
	 * does not exist. Thus no answer says that these routes exist. The
	 * middleware of the session is before this one: with no session, the
	 * status is 401. Paragraph 4.8 of `docs/architecture.md` gives the rules.
	 */
	app.use("/api/admin/*", async (c, next) => {
		if (!c.get("admin")) {
			return c.json({ error: "not_found" }, 404);
		}
		return next();
	});

	/** Each user, with the level at the clock of the server. */
	app.get("/api/admin/users", (c) => {
		const now = new Date();
		const body: AdminUsersResponse = {
			users: listUsers(db).map((row) => ({
				id: row.id,
				email: row.email,
				createdAt: row.createdAt.toISOString(),
				tier: accountTier(row, now),
				supporterUntil: row.supporterUntil?.toISOString() ?? null,
				unlimited: row.unlimited,
			})),
		};
		return c.json(body);
	});

	/**
	 * Writes the flag `unlimited` of a user.
	 *
	 * The method is `PUT`, because the request gives a state: the same request
	 * two times gives the same result.
	 */
	app.put("/api/admin/users/:id/unlimited", async (c) => {
		const body = setUnlimitedSchema.safeParse(
			await c.req.json().catch(() => null),
		);
		if (!body.success) {
			return c.json({ error: "invalid_body", issues: body.error.issues }, 400);
		}
		if (!setUnlimited(db, c.req.param("id"), body.data.unlimited)) {
			return c.json({ error: "unknown_user" }, 404);
		}
		return c.body(null, 204);
	});

	/**
	 * A path of the API that no route above matches.
	 *
	 * The server supplies the files of the client after this application, and a
	 * path that no file matches gives `app.html`. Without this route, a path
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
