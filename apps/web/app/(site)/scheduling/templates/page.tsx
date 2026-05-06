"use client"

import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { TemplateBuilder } from "@/features/scheduling/components/template-builder"

export default function SchedulingTemplatesPage() {
	const facilityId = useActiveFacilityId() ?? ""

	if (!facilityId) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				No facility context available.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<TemplateBuilder facilityId={facilityId} />
		</div>
	)
}
