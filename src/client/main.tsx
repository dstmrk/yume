import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Dashboard } from "./Dashboard.tsx";
import "./styles/theme.css";
import { text } from "./text.ts";

const queryClient = new QueryClient();

const root = document.getElementById("root");
if (root === null) {
	throw new Error("The element #root is not in the page.");
}

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<main className="mx-auto flex max-w-board flex-col gap-6 px-4 py-6 pb-safe">
				<h1 className="font-board text-[22px] text-board-amber tracking-widest">
					{text.appName.toUpperCase()}
				</h1>
				<Dashboard />
			</main>
		</QueryClientProvider>
	</StrictMode>,
);
