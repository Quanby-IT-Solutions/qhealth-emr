"use client"

import { useEffect, useRef, useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Skeleton } from "@/core/components/ui/skeleton"

import { EncounterContextBar } from "@/features/billing/components/encounter-context-bar"
import { ReceiptTemplate } from "@/features/billing/components/receipt-template"
import { useIssueReceiptMutation, useInvoicesQuery, useListPaymentsQuery } from "../api/invoices.hooks"
import { paymentMethodLabel } from "../lib/invoice-utils"

interface ReceiptPageProps {
	encounterId: string
	facilityId: string
	patientName: string
	patientMrn: string
	facilityName: string
}

export function ReceiptPage({ encounterId, facilityId, patientName, patientMrn, facilityName }: ReceiptPageProps) {
	const printRef = useRef<HTMLDivElement>(null)
	const [officialReceiptNumber, setOfficialReceiptNumber] = useState<string | null>(null)
	const [receiptIssued, setReceiptIssued] = useState(false)

	const { data: invoicesData, isLoading: invoicesLoading } = useInvoicesQuery(encounterId, facilityId)
	const invoice = invoicesData?.invoices?.[0] ?? null

	const { data: paymentsData, isLoading: paymentsLoading } = useListPaymentsQuery(
		invoice?.id ?? "",
		facilityId
	)

	const { mutate: issueReceipt } = useIssueReceiptMutation()

	const latestPayment = paymentsData?.payments?.[paymentsData.payments.length - 1] ?? null

	// Issue receipt once when payment is available
	useEffect(() => {
		if (latestPayment && !receiptIssued) {
			setReceiptIssued(true)
			issueReceipt(
				{ paymentId: latestPayment.id },
				{
					onSuccess: (result) => {
						setOfficialReceiptNumber(result.receiptNumber)
					},
				}
			)
		}
	}, [latestPayment, receiptIssued, issueReceipt])

	const isLoading = invoicesLoading || paymentsLoading
	const handlePrint = () => window.print()

	if (isLoading) {
		return (
			<div className="space-y-4 px-4">
				<EncounterContextBar />
				<Skeleton className="h-96 w-full max-w-md mx-auto" />
			</div>
		)
	}

	if (!invoice || !latestPayment) {
		return (
			<div className="space-y-4 px-4">
				<EncounterContextBar />
				<p className="text-sm text-muted-foreground text-center py-8">
					No payment found. Please complete payment first.
				</p>
			</div>
		)
	}

	const lineItems = (
		(invoice as typeof invoice & { lineItems?: Array<{ id: string; description: string; quantity: string; unitPrice: string; totalAmount: string }> })
			.lineItems ?? []
	).map(item => ({
		description: item.description,
		quantity: Number(item.quantity),
		unitPrice: Number(item.unitPrice),
		totalAmount: Number(item.totalAmount),
	}))

	const paymentItems = paymentsData!.payments.map(p => ({
		method: paymentMethodLabel(p.paymentMethod),
		amount: Number(p.amount),
		reference: p.referenceNumber ?? undefined,
	}))

	const subtotal = Number(invoice.subtotal)
	const philhealthCoverage = Number(invoice.philhealthCoverage)
	const total = Number(invoice.patientResponsibility)
	const totalPaid = paymentItems.reduce((s, p) => s + p.amount, 0)
	const change = Math.max(0, totalPaid - total)

	const year = latestPayment.paymentDate?.split("-")[0] ?? String(new Date().getFullYear())
	const receiptNumber = officialReceiptNumber ?? `OR-${year}-PENDING`

	return (
		<div className="space-y-4">
			<EncounterContextBar />

			<div className="px-4 space-y-4">
				<div className="flex items-center justify-between no-print">
					<h1 className="text-lg font-semibold">Official Receipt</h1>
					<Button onClick={handlePrint} variant="outline" size="sm" aria-label="Print receipt">
						Print
					</Button>
				</div>

				<ReceiptTemplate
					ref={printRef}
					facilityName={facilityName}
					receiptNumber={receiptNumber}
					issuedAt={latestPayment.createdAt instanceof Date ? latestPayment.createdAt.toISOString() : String(latestPayment.createdAt)}
					patientName={patientName}
					patientMrn={patientMrn}
					encounterId={encounterId}
					lineItems={lineItems}
					subtotal={subtotal}
					philhealthCoverage={philhealthCoverage > 0 ? philhealthCoverage : undefined}
					total={total}
					payments={paymentItems}
					change={change > 0 ? change : undefined}
					issuedBy="Cashier"
				/>
			</div>
		</div>
	)
}
