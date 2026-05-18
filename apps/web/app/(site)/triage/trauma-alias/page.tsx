"use client"

import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { PreEncounterForm } from "@/features/ed/components/pre-encounter-form"
import { TraumaAliasBadge } from "@/features/ed/components/trauma-alias-badge"

export default function TraumaAliasPage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const staffProfileId = profile?.staffProfiles?.[0]?.id ?? ""
	const [created, setCreated] = useState(false)

	function handleCreated() {
		setCreated(true)
	}

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
			<div className="space-y-4">
				<div>
					<h1 className="text-2xl font-semibold">Trauma Alias Creation</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Create a temporary pre-encounter record for an unidentified emergency patient.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Pre-Encounter Details</CardTitle>
					</CardHeader>
					<CardContent>
						<PreEncounterForm
							facilityId={facilityId}
							triageStaffId={staffProfileId}
							onSuccess={handleCreated}
						/>
					</CardContent>
				</Card>
			</div>

			<Card className="h-fit">
				<CardHeader>
					<CardTitle>Workflow</CardTitle>
				</CardHeader>
				<CardContent className="text-muted-foreground space-y-4 text-sm">
					<TraumaAliasBadge alias="Auto-generated on save" acuityLevel={1} />
					<p>
						Clinical charting can begin immediately. The registrar merges the trauma alias into the
						permanent MRN after identity is confirmed.
					</p>
					{created ? (
						<p className="text-foreground font-medium">
							Trauma alias created. It is now available in the triage queue.
						</p>
					) : null}
				</CardContent>
			</Card>
		</div>
	)
}
