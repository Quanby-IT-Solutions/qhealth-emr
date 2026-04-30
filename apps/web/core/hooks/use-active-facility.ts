"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

/**
 * Returns the facility ID of the currently active staff profile.
 *
 * The active profile is the one whose role list contains the active role ID.
 * Falls back to the first staff profile if no role match is found (e.g. on
 * first login before role switch).
 *
 * Returns undefined while the profile is still loading.
 */
export function useActiveFacilityId(): string | undefined {
	const { data: profile } = useMyProfile()
	if (!profile) return undefined

	const activeProfile =
		profile.staffProfiles.find(p => p.roles.some(r => r.id === profile.activeRole?.id)) ??
		profile.staffProfiles[0]

	return activeProfile?.facility.id
}
