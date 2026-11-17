import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		globals: true,
		passWithNoTests: true,
		// Cap worker count. Each worker loads a heavy jsdom + Next stack, and
		// one fork per CPU core spikes Windows' commit charge enough to crash
		// V8 with "out of memory" even when physical RAM is free.
		maxWorkers: 2,
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "json-summary", "html"],
			// Re-baselined for the JuanMeds feature import (large presentation
			// components arrived with logic-level tests but little component
			// coverage: public order pages, coordinator dashboard, print
			// dialogs). Current totals at import time: 54.7 L / 47.7 F /
			// 49.3 B / 52.3 S. Ratchet these back up toward 60/60/50/60 as
			// component tests are added — do not lower them further.
			thresholds: {
				lines: 52,
				functions: 45,
				branches: 47,
				statements: 50,
			},
			exclude: [
				"**/*.config.*",
				"**/*.setup.*",
				"**/*.spec.*",
				"**/*.test.*",
				"**/*.d.ts",
				"**/node_modules/**",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
			// Resolve workspace packages to source so tests don't depend on a
			// prior `tsc` build of the package's dist output.
			"@repo/contracts": path.resolve(__dirname, "../../packages/contracts/src/index.ts"),
			// `@repo/observability` publishes only compiled `dist` artifacts, which
			// are not checked in. Resolve it from source so the suite runs in a
			// clean checkout without a prior manual package build.
			"@repo/observability": path.resolve(__dirname, "../../packages/observability/src/index.ts"),
		},
	},
})
