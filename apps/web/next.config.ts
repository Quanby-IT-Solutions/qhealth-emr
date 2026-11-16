import "dotenv/config"

import type { NextConfig } from "next"
import { PHASE_PRODUCTION_BUILD } from "next/constants"
import path from "node:path"
import { withSentryConfig } from "@sentry/nextjs/config"

import { resolvePosthogHosts } from "./core/lib/posthog-proxy"

import "./env"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api"

/**
 * Whether the same-origin `/ingest` proxy to PostHog is live.
 *
 * Read raw from `process.env` through the same gate the proxy route uses: the
 * flag, a token, and an https PostHog Cloud host. When it is off,
 * trailing-slash handling stays exactly as it is today.
 */
const isPosthogProxyOn = Boolean(
	resolvePosthogHosts({
		enabled: ["true", "1"].includes(process.env.NEXT_PUBLIC_POSTHOG_ENABLED?.trim() ?? ""),
		token: process.env.NEXT_PUBLIC_POSTHOG_TOKEN,
		host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
	})
)

/** @type {import("next").NextConfig} */
const config: NextConfig = {
	typedRoutes: true,
	output: "standalone",
	outputFileTracingRoot: path.resolve(import.meta.dirname, "../../"),

	/**
	 * Keep the Sentry SDK out of the bundled server graph.
	 *
	 * `@sentry/node` reaches for `node:inspector`, and bundling it makes
	 * Turbopack emit a chunk whose filename contains that literal colon. Windows
	 * cannot name a file that way, so `output: "standalone"` fails to copy it and
	 * the build dies on a developer machine while passing in CI. Loading the SDK
	 * from `node_modules` at runtime sidesteps the chunk entirely, and is what
	 * Sentry's auto-instrumentation of other server packages wants anyway.
	 */
	serverExternalPackages: ["@sentry/nextjs"],

	/** Enables hot reloading for local packages without a build step */
	transpilePackages: [
		"@repo/auth",
		"@repo/backend",
		"@repo/contracts",
		"@repo/db",
		"@t3-oss/env-core",
		"@t3-oss/env-nextjs",
	],

	typescript: { ignoreBuildErrors: true },
	// React Compiler crashes Turbopack's dev server (segfault) in Next.js 16.1.1,
	// which leaves routes stuck on "Rendering…" forever. Enable it only for
	// production builds (webpack), where it runs without crashing.
	reactCompiler: process.env.NODE_ENV === "production",

	devIndicators: {
		position: "bottom-right",
	},

	/**
	 * PostHog's API paths end in a slash (`/ingest/e/`), which Next would
	 * otherwise redirect away before the `/ingest` proxy route sees them. Only
	 * while that proxy is live.
	 */
	...(isPosthogProxyOn ? { skipTrailingSlashRedirect: true } : {}),

	/**
	 * Give the browser bundle the same Sentry environment the server and edge
	 * runtimes resolve.
	 *
	 * Only `NEXT_PUBLIC_*` reads survive client bundling, so an operator who sets
	 * `SENTRY_ENVIRONMENT=staging` alone would otherwise get server events tagged
	 * `staging` and browser events tagged `production`. Projecting the value here
	 * inlines it at build time under the public name `env.ts` reads. An explicit
	 * `NEXT_PUBLIC_SENTRY_ENVIRONMENT` always wins, and when neither is set
	 * nothing is added — the client falls back to NODE_ENV.
	 */
	env:
		process.env.SENTRY_ENVIRONMENT && !process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT
			? { NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT }
			: {},

	// Proxy SSE/streaming endpoints to backend to avoid cross-origin cookie issues
	async rewrites() {
		return [
			{
				source: "/api/v1/notification/stream",
				destination: `${BACKEND_URL}/v1/notification/stream`,
			},
		]
	},
}

/**
 * Next passes the phase on every config load, which is the only way to tell a
 * `next build` apart from a `next dev` at this point — the upload notice below
 * has to stay out of the dev server's output.
 */
export default (phase: string) => {
	/**
	 * Say out loud that source maps are not being uploaded.
	 *
	 * The plugin runs in `silent` mode below and skips upload without a word when
	 * there is no auth token, so a production build would otherwise ship minified
	 * stack traces while looking exactly like a build that had uploaded them. The
	 * build stays green either way — a missing observability credential is not a
	 * reason to fail a contributor's build — but the operator gets one line saying
	 * what was skipped.
	 */
	if (
		phase === PHASE_PRODUCTION_BUILD &&
		!process.env.SENTRY_AUTH_TOKEN &&
		!process.env.SENTRY_UPLOAD_NOTICE_PRINTED
	) {
		// Next loads this config once per build worker, so the notice would otherwise
		// repeat four or five times. The marker is set on the environment rather than
		// in module scope because the workers are separate processes that inherit it.
		process.env.SENTRY_UPLOAD_NOTICE_PRINTED = "1"
		console.info(
			"[sentry] SENTRY_AUTH_TOKEN is not set — skipping source-map upload; stack traces will stay minified."
		)
	}

	return withSentryConfig(config, {
		/**
		 * Client events are POSTed to a same-origin route instead of Sentry's ingest
		 * host. That keeps CSP tight (no Sentry origin needed) and stops ad blockers
		 * eating the reports on the way out.
		 */
		tunnelRoute: "/monitoring",

		/**
		 * Source-map upload credentials.
		 *
		 * All three are `undefined` for contributor and CI builds without Sentry
		 * configured, and that alone is what keeps upload inert — the plugin skips
		 * release creation entirely when there is no auth token.
		 */
		org: process.env.SENTRY_ORG,
		project: process.env.SENTRY_PROJECT,
		authToken: process.env.SENTRY_AUTH_TOKEN,

		/**
		 * Delete the `.map` files once Sentry has them.
		 *
		 * They are emitted next to the client bundle, so `output: "standalone"`
		 * copies them into the image and Next serves them from `/_next/static/` —
		 * anyone could fetch the unminified source of the whole app. Sentry only
		 * needs the maps at upload time. With no auth token nothing is uploaded
		 * and nothing is generated to delete, so this is inert for builds without
		 * Sentry configured.
		 */
		sourcemaps: {
			deleteSourcemapsAfterUpload: true,
		},

		/**
		 * Without this the plugin narrates every build, including the disabled ones
		 * it has nothing to say about.
		 */
		silent: true,
	})
}
