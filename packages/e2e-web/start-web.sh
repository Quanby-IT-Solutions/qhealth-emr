#!/usr/bin/env bash
# Playwright webServer command: build the web app and serve its standalone
# output on :3001. Only runs when nothing is already listening there —
# `reuseExistingServer: true` in playwright.config.ts makes Playwright skip
# this entirely when a dev server or a CI-started server is already up.
set -euo pipefail

cd "$(dirname "$0")/../.."

# Build-time fallbacks for environments that define nothing (the shared
# quality-gate CI job). Test-only values: the unauthenticated suite never
# authenticates, and web env validation is CI-skipped anyway. Real values in
# the environment always win.
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-e2e-only-dummy-secret-0123456789abcdef}"
export BETTER_AUTH_TRUSTED_ORIGINS="${BETTER_AUTH_TRUSTED_ORIGINS:-http://localhost:3001}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3001}"
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:3000/api}"

pnpm turbo run build --filter=@repo/web --cache-dir=.turbo

# Standalone output does not include static assets or /public; the server 404s
# without them. Re-copy each run so a rebuild never serves stale assets.
rm -rf apps/web/.next/standalone/apps/web/public apps/web/.next/standalone/apps/web/.next/static
cp -r apps/web/public apps/web/.next/standalone/apps/web/public
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

PORT=3001 HOSTNAME=0.0.0.0 exec node apps/web/.next/standalone/apps/web/server.js
