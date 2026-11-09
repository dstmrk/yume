import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BASE_LOCALE } from "../shared/locale.ts";
import { I18nProvider } from "./i18n/I18n.tsx";
import { router } from "./router.tsx";
import "./styles/theme.css";

const queryClient = new QueryClient();

const root = document.getElementById("root");
if (root === null) {
	throw new Error("The element #root is not in the page.");
}

createRoot(root).render(
	<StrictMode>
		{/* The language comes from the path in the next step of paragraph 5.8
		    of `docs/architecture.md`. Now each page holds the base language. */}
		<I18nProvider locale={BASE_LOCALE}>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</I18nProvider>
	</StrictMode>,
);
