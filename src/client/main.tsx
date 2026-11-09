import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routing } from "../shared/locale.ts";
import { I18nProvider } from "./i18n/I18n.tsx";
import { createAppRouter } from "./router.tsx";
import "./styles/theme.css";

const queryClient = new QueryClient();

/**
 * The language of the page comes from the path, and from no other source.
 * Paragraph 5.8 of `docs/architecture.md` gives the rule.
 */
const { locale } = routing.localeOfPath(window.location.pathname);
const router = createAppRouter(routing.pathFor(locale, "/"));

const root = document.getElementById("root");
if (root === null) {
	throw new Error("The element #root is not in the page.");
}

createRoot(root).render(
	<StrictMode>
		<I18nProvider locale={locale}>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</I18nProvider>
	</StrictMode>,
);
