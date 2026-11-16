# ========================================
# Base Stage
# ========================================
FROM node:22-alpine AS base
RUN apk update
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10.27.0
WORKDIR /app

# ========================================
# Prepare Stage - Prune workspace
# ========================================
FROM base AS prepare
RUN npm install -g turbo
COPY . .
# Generate pruned workspace with pruned lockfile for target workspace
RUN turbo prune @repo/web --docker

# ========================================
# Builder Stage
# ========================================
FROM base AS builder

# Build-time arguments for Next.js public environment variables
# These get inlined into the JavaScript bundle during build
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_VERSION

# Set as environment variables for the build process
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_VERSION=$NEXT_PUBLIC_API_VERSION

# Sentry browser configuration. Public by nature (the DSN is a write-only
# ingest key) and inlined into the client bundle, so it belongs with the other
# NEXT_PUBLIC_* args. Unset by default: the image builds and runs with crash
# reporting off. Server-side SENTRY_* values are runtime config, not build
# args, and SENTRY_AUTH_TOKEN in particular must never be baked into a layer.
ARG NEXT_PUBLIC_SENTRY_ENABLED
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG SENTRY_ENVIRONMENT
ARG NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
ENV NEXT_PUBLIC_SENTRY_ENABLED=$NEXT_PUBLIC_SENTRY_ENABLED
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT
ENV SENTRY_ENVIRONMENT=$SENTRY_ENVIRONMENT
ENV NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=$NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE

# Source-map upload target. Org and project slugs are plain identifiers, not
# credentials. Unset by default: no org, no upload.
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT

# PostHog browser configuration: public ingest token + host, inlined at build.
ARG NEXT_PUBLIC_POSTHOG_ENABLED
ARG NEXT_PUBLIC_POSTHOG_TOKEN
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POSTHOG_ENABLED=$NEXT_PUBLIC_POSTHOG_ENABLED
ENV NEXT_PUBLIC_POSTHOG_TOKEN=$NEXT_PUBLIC_POSTHOG_TOKEN
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# First install the dependencies (as they change less often)
COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# Resilient install: cached pnpm store (survives retries) + generous retries
# for slow/flaky networks. Cache mount requires BuildKit (default here).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store && \
  pnpm config set fetch-retries 5 && \
  pnpm config set fetch-retry-maxtimeout 120000 && \
  pnpm config set network-concurrency 8 && \
  pnpm install --frozen-lockfile
# Build the project
COPY --from=prepare /app/out/full/ .
RUN pnpm --filter @repo/web build

# ========================================
# Runner Stage - Minimal production image
# ========================================
FROM base AS runner
# Don't run production as root for security reasons
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/app/building-your-application/deploying#minimal-usage
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

EXPOSE 3001
CMD node apps/web/server.js
