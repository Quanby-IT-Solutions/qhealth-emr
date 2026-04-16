"use client"

import { useState } from "react"

import { OrderReview } from "@/features/pharmacy/components/order-review"
import { VerificationQueue } from "@/features/pharmacy/components/verification-queue"

export default function PharmacyPage() {
	const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

	if (selectedOrderId) {
		return (
			<OrderReview
				orderId={selectedOrderId}
				onBack={() => setSelectedOrderId(null)}
				onDispenseSuccess={() => setSelectedOrderId(null)}
			/>
		)
	}

	return <VerificationQueue onSelectOrder={setSelectedOrderId} />
}
