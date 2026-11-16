"use client"

import { authClient } from "@/services/better-auth/auth-client"

import { AnalyticsIdentityStamp } from "./analytics-identity-stamp"

/**
 * Bridges the Better Auth session to the PostHog identity lifecycle.
 *
 * Mounted once in the root layout. Reads the session reactively and keeps
 * `syncAnalyticsIdentity` in step with it: identify on sign-in, reset to an
 * anonymous id on sign-out. Renders nothing; a no-op while analytics is off.
 */
export function AnalyticsIdentity() {
	const { data: session, isPending } = authClient.useSession()

	// While the session is still resolving, do nothing rather than resetting a
	// freshly identified user back to anonymous on every hard navigation.
	if (isPending) return null

	return <AnalyticsIdentityStamp userId={session?.user?.id ?? null} />
}
