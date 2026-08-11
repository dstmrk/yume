import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/theme.css";

const queryClient = new QueryClient();

const root = document.getElementById("root");
if (root === null) {
	throw new Error("The element #root is not in the page.");
}

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<main className="mx-auto max-w-board px-4 py-6 pb-safe">
				<h1 className="font-board text-board-amber text-2xl tracking-widest">
					YUME
				</h1>
			</main>
		</QueryClientProvider>
	</StrictMode>,
);
