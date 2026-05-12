"use client"

import { use } from "react"

import { InvoicePage as InvoicePageComponent } from "@/features/billing/invoice-payment/components/invoice-page"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function InvoicePage({ params }: { params: Promise<{ encounterId: string }> }) {
	const { encounterId } = use(params)
	const { facilityId, patientId } = useChartContext()

	if (!facilityId) return null

	return <InvoicePageComponent encounterId={encounterId} facilityId={facilityId} patientId={patientId} />
}
