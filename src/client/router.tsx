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
import { CalculatorPage } from "./CalculatorPage.tsx";
import { ConsentPage } from "./ConsentPage.tsx";
import { CurrenciesPage } from "./CurrenciesPage.tsx";
import { CurrencyPage } from "./CurrencyPage.tsx";
import { Dashboard } from "./Dashboard.tsx";
import { GuidePage } from "./GuidePage.tsx";
import { HomePage } from "./HomePage.tsx";
import { LegalPage } from "./LegalPage.tsx";
import { LoginPage } from "./LoginPage.tsx";
import { fetchMe, fetchSession } from "./lib/api.ts";
import { loginErrorOf } from "./lib/auth.ts";
import { checkoutReturned } from "./lib/supporter.ts";
import { NotFoundPage } from "./NotFoundPage.tsx";
import { SourcePage } from "./SourcePage.tsx";

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
	// Stripe Checkout opens the dashboard with `?checkout=done` after the
	// payment. Paragraph 4.6.1 of `docs/architecture.md`.
	validateSearch: (search: Record<string, unknown>): { checkout?: "done" } =>
		checkoutReturned(search) ? { checkout: "done" } : {},
	beforeLoad: async () => {
		if ((await fetchSession()) === null) {
			throw redirect({ to: "/login" });
		}
	},
	component: () => (
		<Dashboard returned={dashboardRoute.useSearch().checkout === "done"} />
	),
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

const supportRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/support",
	component: () => <LegalPage document="support" />,
});

const tosRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tos",
	component: () => <LegalPage document="tos" />,
});

// The public pages of the catalogue, the calculator and the guides. Each
// person reads them, with a session or with no session. The build writes a
// static page for each value of a parameter, and the server gives that file.
// An other value gives the page of the status 404, from the server and from
// the component. Paragraph 5.5.5 of `docs/architecture.md`.
const calculatorRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/calcolatore",
	component: CalculatorPage,
});

const currenciesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/miglia",
	component: CurrenciesPage,
});

const currencyRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/miglia/$currencyId",
	component: () => (
		<CurrencyPage currencyId={currencyRoute.useParams().currencyId} />
	),
});

const sourceRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/punti/$slug",
	component: () => <SourcePage slug={sourceRoute.useParams().slug} />,
});

const guideRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/guide/$slug",
	component: () => <GuidePage slug={guideRoute.useParams().slug} />,
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
	supportRoute,
	calculatorRoute,
	currenciesRoute,
	currencyRoute,
	sourceRoute,
	guideRoute,
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
