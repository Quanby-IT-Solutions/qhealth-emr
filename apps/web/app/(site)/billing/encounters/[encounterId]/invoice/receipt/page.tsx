"use client"

import { use } from "react"

import { ReceiptPage as ReceiptPageComponent } from "@/features/billing/invoice-payment/components/receipt-page"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function ReceiptPage({ params }: { params: Promise<{ encounterId: string }> }) {
	const { encounterId, encounter, facilityId } = useChartContext()
	void use(params)

	if (!facilityId) return null

	return (
		<ReceiptPageComponent
			encounterId={encounterId}
			facilityId={facilityId}
			patientName={encounter?.patientName ?? ""}
			patientMrn={encounter?.patientMrn ?? ""}
			facilityName={encounter?.wardName ?? "Health Facility"}
		/>
	)
}
