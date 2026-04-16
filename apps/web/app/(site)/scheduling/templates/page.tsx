"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { TemplateBuilder } from "@/features/scheduling/components/template-builder"

export default function SchedulingTemplatesPage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	if (!facilityId) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				No facility context available.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Clinic Schedule Templates</h1>
				<p className="text-muted-foreground">
					Configure available days, time slots, and patient limits per clinician
				</p>
			</div>
			<TemplateBuilder facilityId={facilityId} />
		</div>
	)
}
