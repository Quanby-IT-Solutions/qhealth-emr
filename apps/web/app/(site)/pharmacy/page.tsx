"use client"

import { useState } from "react"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { OrderReview } from "@/features/pharmacy/components/order-review"
import { VerificationQueue } from "@/features/pharmacy/components/verification-queue"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function PharmacyPage() {
	const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
	const permSet = usePermissionSet()

	if (!can(permSet, "orders", "verify")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access pharmacy.
			</div>
		)
	}

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
