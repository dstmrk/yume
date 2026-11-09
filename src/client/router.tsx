/**
 * The routes of the client.
 *
 * The tree is in the code, not in the file names. The project needs no plugin
 * of the router and no step of generation. Three routes are sufficient now: the
 * public page, the dashboard and the access.
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
import { AppShell } from "./AppShell.tsx";
import { Dashboard } from "./Dashboard.tsx";
import { HomePage } from "./HomePage.tsx";
import { LoginPage } from "./LoginPage.tsx";
import { fetchSession } from "./lib/api.ts";
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

const routeTree = rootRoute.addChildren([
	homeRoute,
	dashboardRoute,
	loginRoute,
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
