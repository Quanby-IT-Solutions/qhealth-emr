"use client"

import { AuditLogTable } from "@/features/audit/components/audit-log-table"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function AuditTrailPage() {
	const { facilityId } = useChartContext()

	if (!facilityId) return null

	return <AuditLogTable facilityId={facilityId} />
}
