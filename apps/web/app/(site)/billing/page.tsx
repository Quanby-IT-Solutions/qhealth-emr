"use client"

import { ReceiptText } from "lucide-react"

import { Card, CardContent } from "@/core/components/ui/card"

export default function BillingPage() {
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
