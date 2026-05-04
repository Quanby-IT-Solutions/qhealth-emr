"use client"

import { ReceiptText } from "lucide-react"

import { Card, CardContent } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function BillingPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "billing", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access billing.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Billing</h1>
				<p className="text-muted-foreground text-sm">
					Invoice management, PhilHealth eClaims, and payment processing
				</p>
			</div>
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-20 text-center">
					<ReceiptText className="text-muted-foreground mb-4 size-12" />
					<p className="font-medium">Billing & Revenue Cycle Management</p>
					<p className="text-muted-foreground mt-1 max-w-sm text-sm">
						Patient billing queue, PhilHealth CF4/CF5 eClaims, CEWS eligibility, Konsulta and Malasakit program tracking will be available here.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
