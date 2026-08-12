import { defineConfig } from "vitest/config";

/**
 * Vitest needs its own file. Without it, Vitest reads `vite.config.ts` and
 * takes the option `root: "src/client"`. Then it finds no test of the server
 * and no test of `src/shared`.
 */
export default defineConfig({
	test: {
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
	},
});
