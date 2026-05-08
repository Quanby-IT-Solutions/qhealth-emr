"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { AhsrDashboard } from "@/features/reporting/components/ahsr-dashboard"
import { Card, CardContent } from "@/core/components/ui/card"

export function AhsrDashboardClient() {
	const { data: profile, isLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId

	if (isLoading) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">
					Loading…
				</CardContent>
			</Card>
		)
	}

	if (!facilityId) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">
					No facility assigned to your profile. Contact your administrator.
				</CardContent>
			</Card>
		)
	}

	return <AhsrDashboard facilityId={facilityId} />
}
