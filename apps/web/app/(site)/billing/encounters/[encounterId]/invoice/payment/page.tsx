"use client"

import { use } from "react"

import { PaymentEntryPage as PaymentEntryPageComponent } from "@/features/billing/invoice-payment/components/payment-entry-page"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function PaymentEntryPage({ params }: { params: Promise<{ encounterId: string }> }) {
	const { encounterId } = use(params)
	const { facilityId } = useChartContext()

	if (!facilityId) return null

	return <PaymentEntryPageComponent encounterId={encounterId} facilityId={facilityId} />
}
