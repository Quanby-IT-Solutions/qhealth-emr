"use client"

import { Card, CardContent } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { PidsrDashboard } from "@/features/reporting/components/pidsr-dashboard"

export function PidsrInboxClient() {
	const { data: profile, isLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId

	if (isLoading) {
		return (
			<Card>
				<CardContent className="text-muted-foreground py-8 text-center text-sm">
					Loading…
				</CardContent>
			</Card>
		)
	}

	if (!facilityId) {
		return (
			<Card>
				<CardContent className="text-muted-foreground py-8 text-center text-sm">
					No facility assigned to your profile. Contact your administrator.
				</CardContent>
			</Card>
		)
	}

	return <PidsrDashboard facilityId={facilityId} />
}
