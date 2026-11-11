/**
 * The routes of the client.
 *
 * The tree is in the code, not in the file names. The project needs no plugin
 * of the router and no step of generation.
 *
 * Each route reads the session before the load. Therefore the dashboard makes
 * no request that gives the status 401, and a user with a session reads the
 * dashboard and not the public page.
 *
 * The route `/login` reads the parameter `error`. Better Auth adds it after an
 * error on the page of Google.
 *
 * The root holds no title: the public page gives a title of the centre, and
 * the other two pages give the masthead `AppTitle`.
 *
 * The prefix of the language is the `basepath` of the router. Thus each link
 * and each redirect keeps the language, and no route knows it. Paragraph 5.8 of
 * `docs/architecture.md` gives the rules.
 */

import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { AdminPage } from "./AdminPage.tsx";
import { AppShell } from "./AppShell.tsx";
import { ConsentPage } from "./ConsentPage.tsx";
import { Dashboard } from "./Dashboard.tsx";
import { HomePage } from "./HomePage.tsx";
import { LegalPage } from "./LegalPage.tsx";
import { LoginPage } from "./LoginPage.tsx";
import { fetchMe, fetchSession } from "./lib/api.ts";
import { loginErrorOf } from "./lib/auth.ts";
import { NotFoundPage } from "./NotFoundPage.tsx";

const rootRoute = createRootRoute({
	component: () => (
		<AppShell>
			<Outlet />
		</AppShell>
	),
	// A path with no route. The server gives the status 404 to that same path,
	// and `CLIENT_PATHS` of `src/shared/routes.ts` holds the list of the paths.
	notFoundComponent: NotFoundPage,
});

const homeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	// The public page is for a visitor. A user with a session reads the
	// dashboard.
	beforeLoad: async () => {
		if ((await fetchSession()) !== null) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: HomePage,
});

const dashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard",
	beforeLoad: async () => {
		if ((await fetchSession()) === null) {
			throw redirect({ to: "/login" });
		}
	},
	component: Dashboard,
});

// The page of the administrator. Each other user reads the dashboard. The
// server gives the status 404 to the routes of the data, thus this redirect
// only hides a page with no data. Paragraph 4.8 of `docs/architecture.md`.
const adminRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/admin",
	beforeLoad: async () => {
		if ((await fetchSession()) === null) {
			throw redirect({ to: "/login" });
		}
		const me = await fetchMe().catch(() => null);
		if (me?.admin !== true) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: AdminPage,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	// The parameter is not necessary: a link to `/login` holds no error.
	validateSearch: (search: Record<string, unknown>): { error?: string } => {
		const error = loginErrorOf(search);
		return error === undefined ? {} : { error };
	},
	// A user with a session reads the dashboard, not the page of the access.
	beforeLoad: async () => {
		if ((await fetchSession()) !== null) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: () => <LoginPage error={loginRoute.useSearch().error} />,
});

// The authorisation of an assistant on the MCP server. The authorisation
// server opens this page after the sign-in, thus a person with no session
// goes to the page of the access. Paragraph 4.7.2 of `docs/architecture.md`.
const consentRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/consent",
	beforeLoad: async () => {
		if ((await fetchSession()) === null) {
			throw redirect({ to: "/login" });
		}
	},
	component: ConsentPage,
});

// The legal pages. Each person reads them, with a session or with no session:
// Google and the law ask for a public address.
const privacyRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/privacy",
	component: () => <LegalPage document="privacy" />,
});

// The public documentation of the MCP server: the directory of Anthropic
// asks for its address. Paragraph 4.7.4 of `docs/architecture.md`.
const connectorRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/connector",
	component: () => <LegalPage document="connector" />,
});

const tosRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tos",
	component: () => <LegalPage document="tos" />,
});

const routeTree = rootRoute.addChildren([
	homeRoute,
	dashboardRoute,
	adminRoute,
	loginRoute,
	consentRoute,
	privacyRoute,
	tosRoute,
	connectorRoute,
]);

/**
 * The router of a page in one language.
 *
 * `basepath` is the prefix of the language, for example `/en`, or `/` for the
 * base language. A change of the language loads a new page, thus one page
 * holds one router.
 */
export function createAppRouter(basepath: string) {
	return createRouter({ routeTree, basepath });
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createAppRouter>;
	}
}
