/**
 * The routes of the client.
 *
 * The tree is in the code, not in the file names. The project needs no plugin
 * of the router and no step of generation. Two routes are sufficient now: the
 * dashboard and the access.
 *
 * The route `/` reads the session before the load. With no session it sends the
 * user to `/login`. Therefore the dashboard makes no request that gives the
 * status 401.
 */

import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { Dashboard } from "./Dashboard.tsx";
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

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
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
			throw redirect({ to: "/" });
		}
	},
	component: LoginPage,
});

export const router = createRouter({
	routeTree: rootRoute.addChildren([indexRoute, loginRoute]),
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
