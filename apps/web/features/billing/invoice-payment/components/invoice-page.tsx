"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"

import { DiscountSelector, type DiscountType } from "@/features/billing/components/discount-selector"
import { EncounterContextBar } from "@/features/billing/components/encounter-context-bar"
import {
	useApplyDiscountMutation,
	useFinalizeInvoiceMutation,
	useGenerateInvoiceMutation,
	useInvoicesQuery,
} from "../api/invoices.hooks"
import { computeInvoiceTotals } from "../lib/invoice-utils"

interface InvoicePageProps {
	encounterId: string
	facilityId: string
	patientId: string
}

export function InvoicePage({ encounterId, facilityId, patientId }: InvoicePageProps) {
	const router = useRouter()
	const [discountType, setDiscountType] = useState<DiscountType>("NONE")
	const [discountAmount, setDiscountAmount] = useState(0)
	const [discountReason, setDiscountReason] = useState("")
	const [discountConfirmOpen, setDiscountConfirmOpen] = useState(false)

	const { data: invoicesData, isLoading } = useInvoicesQuery(encounterId, facilityId)
	const { mutate: generateInvoice, isPending: generating } = useGenerateInvoiceMutation()
	const { mutate: finalizeInvoice, isPending: finalizing } = useFinalizeInvoiceMutation()
	const { mutate: applyDiscount, isPending: applyingDiscount } = useApplyDiscountMutation()

	const invoice = invoicesData?.invoices?.[0] ?? null
	const lineItems = (invoice as (typeof invoice & { lineItems?: unknown[] }) | null)?.lineItems ?? []

	const totals = computeInvoiceTotals({
		subtotal: Number(invoice?.subtotal ?? 0),
		discountAmount: discountType !== "NONE" ? discountAmount : 0,
		philhealthCoverage: Number(invoice?.philhealthCoverage ?? 0),
	})

	if (isLoading) {
		return <div className="space-y-4 px-4"><EncounterContextBar /><Skeleton className="h-48 w-full" /></div>
	}

	if (!invoice) {
		return (
			<div className="space-y-4 px-4">
				<EncounterContextBar />
				<Card>
					<CardContent className="py-8 text-center">
						<p className="text-sm text-muted-foreground mb-4">No invoice generated yet.</p>
						<Button
							onClick={() => generateInvoice({ facilityId, encounterId, patientId })}
							disabled={generating}
						>
							{generating ? "Generating..." : "Generate Invoice"}
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<>
		<div className="space-y-4">
			<EncounterContextBar />

			<div className="px-4 space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-lg font-semibold">Invoice #{invoice.invoiceNumber}</h1>
						<p className="text-sm text-muted-foreground capitalize">{invoice.status}</p>
					</div>
					{invoice.status === "draft" && (
						<Button
							onClick={() => finalizeInvoice({ id: invoice.id })}
							disabled={finalizing}
						>
							{finalizing ? "Finalizing..." : "Finalize Invoice"}
						</Button>
					)}
				</div>

				{/* Line items */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Services / Items</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Description</TableHead>
									<TableHead className="w-20 text-right">Qty</TableHead>
									<TableHead className="w-32 text-right">Unit Price</TableHead>
									<TableHead className="w-32 text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(lineItems as Array<{ id: string; description: string; quantity: string; unitPrice: string; totalAmount: string }>).map(item => (
									<TableRow key={item.id}>
										<TableCell className="text-sm">{item.description}</TableCell>
										<TableCell className="text-right tabular-nums text-sm">{Number(item.quantity)}</TableCell>
										<TableCell className="text-right tabular-nums text-sm">
											₱{Number(item.unitPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
										</TableCell>
										<TableCell className="text-right tabular-nums text-sm font-medium">
											₱{Number(item.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{/* Discount */}
				{invoice.status === "draft" && (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Discount</CardTitle>
						</CardHeader>
						<CardContent>
							<DiscountSelector
								value={discountType}
								onChange={setDiscountType}
								manualAmount={discountAmount}
								onManualAmountChange={setDiscountAmount}
								manualReason={discountReason}
								onManualReasonChange={setDiscountReason}
								maxManualDiscount={Number(invoice.subtotal)}
							/>
							{discountType !== "NONE" && (
								<Button
									className="mt-3"
									variant="outline"
									size="sm"
									disabled={applyingDiscount || (discountType === "MANUAL" && !discountReason.trim())}
									onClick={() => {
										if (discountType === "MANUAL") {
											setDiscountConfirmOpen(true)
										} else {
											applyDiscount({
												invoiceId: invoice.id,
												type: discountType,
												reason: discountReason || undefined,
											})
										}
									}}
								>
									Apply Discount
								</Button>
							)}
						</CardContent>
					</Card>
				)}

				{/* Totals */}
				<Card>
					<CardContent className="pt-4 space-y-1.5 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Subtotal</span>
							<span className="tabular-nums">₱{totals.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
						</div>
						{totals.discountAmount > 0 && (
							<div className="flex justify-between text-green-700">
								<span>Discount ({discountType})</span>
								<span className="tabular-nums">-₱{totals.discountAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
							</div>
						)}
						{totals.philhealthCoverage > 0 && (
							<div className="flex justify-between text-blue-700">
								<span>PhilHealth Coverage</span>
								<span className="tabular-nums">-₱{totals.philhealthCoverage.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
							</div>
						)}
						<div className="flex justify-between border-t pt-1.5 font-bold">
							<span>Total Patient Responsibility</span>
							<span className="tabular-nums">₱{totals.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
						</div>
					</CardContent>
				</Card>

				{invoice.status !== "draft" && (
					<Alert>
						<AlertDescription>
							Invoice is {invoice.status}. Proceed to payment.
						</AlertDescription>
					</Alert>
				)}

				{(invoice.status === "finalized" || invoice.status === "partially_paid") && (
					<Button
						className="w-full"
						onClick={() => router.push(`/billing/encounters/${encounterId}/invoice/payment`)}
					>
						Record Payment
					</Button>
				)}
			</div>
		</div>

		<Dialog open={discountConfirmOpen} onOpenChange={setDiscountConfirmOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Confirm Manual Discount</DialogTitle>
					<DialogDescription>
						A manual discount of ₱{discountAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })} will be applied.
						This action is logged for audit.
					</DialogDescription>
				</DialogHeader>
				<div className="rounded-md bg-muted p-3 text-sm space-y-1">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Discount amount</span>
						<span className="tabular-nums font-medium">₱{discountAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Reason</span>
						<span className="max-w-[60%] text-right">{discountReason}</span>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setDiscountConfirmOpen(false)}>Cancel</Button>
					<Button
						disabled={applyingDiscount}
						onClick={() => {
							applyDiscount(
								{
									invoiceId: invoice!.id,
									type: "MANUAL",
									amount: discountAmount,
									reason: discountReason,
								},
								{ onSuccess: () => setDiscountConfirmOpen(false) }
							)
						}}
					>
						{applyingDiscount ? "Applying..." : "Confirm Discount"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	)
}
