import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The client is in `src/client`. The build writes `dist/`, and in production
 * Hono supplies those files from the same origin as the API. Refer to paragraph
 * 2.2 of `docs/architecture.md`.
 *
 * In development, Vite and the server are two processes. The proxy sends `/api`
 * to the server, thus the client uses one origin in development also.
 */
export default defineConfig({
	root: "src/client",
	plugins: [react(), tailwindcss()],
	build: {
		outDir: "../../dist",
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		proxy: {
			"/api": "http://localhost:3000",
		},
	},
});
