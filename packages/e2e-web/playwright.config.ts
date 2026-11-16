import { defineConfig, devices } from "@playwright/test"

import { AUTH_FILE } from "./constants"

const hasBackend = !!process.env.E2E_AUTH_API_URL
const liveKitE2EArgs =
	process.env.LIVEKIT_E2E === "1"
		? ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
		: []

export default defineConfig({
	globalSetup: "./global-setup.ts",
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [["html", { open: "never" }]] : "html",
	use: {
		baseURL: process.env.BASE_URL ?? "http://localhost:3001",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "off",
	},
	// Builds and serves the web app when :3001 is not already listening. The
	// shared quality-gate CI job runs `pnpm test:e2e:web` with no servers of
	// its own; this is what keeps that job green. reuseExistingServer stays
	// true unconditionally so a locally running dev server, or the CI job that
	// pre-starts web and backend, is used as-is instead of fighting for the
	// port.
	webServer: {
		command: "bash ./start-web.sh",
		url: "http://localhost:3001",
		reuseExistingServer: true,
		timeout: 300_000,
		stdout: "pipe",
		stderr: "pipe",
	},
	projects: [
		// ── Auth setup (runs once before authenticated tests) ──────────────────
		...(hasBackend
			? [
					{
						name: "setup",
						testDir: ".",
						testMatch: /global\.setup\.ts/,
					},
				]
			: []),

		// ── Unauthenticated tests ──────────────────────────────────────────────
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				launchOptions: { args: liveKitE2EArgs },
			},
			testIgnore: /authenticated\.spec\.ts/,
		},

		// ── Authenticated tests (only when backend is available) ───────────────
		...(hasBackend
			? [
					{
						name: "chromium-authenticated",
						use: {
							...devices["Desktop Chrome"],
							storageState: AUTH_FILE,
							launchOptions: { args: liveKitE2EArgs },
						},
						testMatch: /authenticated\.spec\.ts/,
						dependencies: ["setup"],
					},
				]
			: []),
	],
})
