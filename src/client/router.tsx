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
 */

import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { Dashboard } from "./Dashboard.tsx";
import { HomePage } from "./HomePage.tsx";
import { LoginPage } from "./LoginPage.tsx";
import { fetchSession } from "./lib/api.ts";
import { text } from "./text.ts";

const rootRoute = createRootRoute({
	component: () => (
		<main className="mx-auto flex max-w-board flex-col gap-6 px-4 py-6 pb-safe">
			<h1 className="font-board text-[22px] text-board-amber tracking-widest">
				{text.appName.toUpperCase()}
			</h1>
			<Outlet />
		</main>
	),
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
	// A user with a session reads the dashboard, not the form of the access.
	beforeLoad: async () => {
		if ((await fetchSession()) !== null) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});

export const router = createRouter({
	routeTree: rootRoute.addChildren([homeRoute, dashboardRoute, loginRoute]),
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
