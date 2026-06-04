"use client"

import { forwardRef } from "react"

import { cn } from "@/core/lib/utils"

interface ReceiptLineItem {
	description: string
	quantity: number
	unitPrice: number
	totalAmount: number
}

interface ReceiptPayment {
	method: string
	amount: number
	reference?: string
}

interface ReceiptTemplateProps {
	facilityName: string
	facilityAddress?: string
	facilityTin?: string
	receiptNumber: string
	issuedAt: string
	/** Patient details */
	patientName: string
	patientMrn: string
	encounterId: string
	/** Line items */
	lineItems: ReceiptLineItem[]
	subtotal: number
	discount?: number
	discountLabel?: string
	philhealthCoverage?: number
	vat?: number
	total: number
	payments: ReceiptPayment[]
	change?: number
	/** Cashier / biller name */
	issuedBy: string
	className?: string
}

const formatter = (amount: number) =>
	amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
	(
		{
			facilityName,
			facilityAddress,
			facilityTin,
			receiptNumber,
			issuedAt,
			patientName,
			patientMrn,
			encounterId,
			lineItems,
			subtotal,
			discount,
			discountLabel,
			philhealthCoverage,
			vat,
			total,
			payments,
			change,
			issuedBy,
			className,
		},
		ref
	) => {
		return (
			<>
				{/* Print styles injected as a style tag inside the component */}
				<style>{`
					@media print {
						@page { size: A4 portrait; margin: 1cm; }
						body * { visibility: hidden !important; }
						.receipt-print-area, .receipt-print-area * { visibility: visible !important; }
						.receipt-print-area { position: fixed !important; inset: 0; }
						.no-print { display: none !important; }
					}
				`}</style>

				<div
					ref={ref}
					className={cn(
						"receipt-print-area mx-auto max-w-md space-y-4 rounded-lg border bg-white p-6 font-mono text-sm text-black",
						className
					)}
					aria-label="Payment receipt"
				>
					{/* Header */}
					<div className="space-y-1 text-center">
						<p className="text-base font-bold tracking-wide uppercase">{facilityName}</p>
						{facilityAddress && <p className="text-xs">{facilityAddress}</p>}
						{facilityTin && <p className="text-xs">TIN: {facilityTin}</p>}
						<p className="mt-2 text-xs font-semibold uppercase">Official Receipt</p>
					</div>

					<hr className="border-dashed border-black/40" />

					{/* Receipt meta */}
					<div className="space-y-0.5 text-xs">
						<div className="flex justify-between">
							<span>Receipt No:</span>
							<span className="font-semibold">{receiptNumber}</span>
						</div>
						<div className="flex justify-between">
							<span>Date:</span>
							<span>
								{new Date(issuedAt).toLocaleString("en-PH", {
									year: "numeric",
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						</div>
					</div>

					<hr className="border-dashed border-black/40" />

					{/* Patient block */}
					<div className="space-y-0.5 text-xs">
						<div className="flex justify-between">
							<span>Patient:</span>
							<span className="font-medium">{patientName}</span>
						</div>
						<div className="flex justify-between">
							<span>MRN:</span>
							<span>{patientMrn}</span>
						</div>
						<div className="flex justify-between">
							<span>Encounter:</span>
							<span className="max-w-[140px] truncate">{encounterId}</span>
						</div>
					</div>

					<hr className="border-dashed border-black/40" />

					{/* Line items */}
					<div className="space-y-1">
						<p className="text-xs font-semibold uppercase">Services / Items</p>
						{lineItems.map((item, idx) => (
							<div key={idx} className="text-xs">
								<p className="truncate">{item.description}</p>
								<div className="flex justify-between pl-2 text-black/70">
									<span>
										{item.quantity} × ₱{formatter(item.unitPrice)}
									</span>
									<span>₱{formatter(item.totalAmount)}</span>
								</div>
							</div>
						))}
					</div>

					<hr className="border-dashed border-black/40" />

					{/* Totals */}
					<div className="space-y-0.5 text-xs">
						<div className="flex justify-between">
							<span>Subtotal</span>
							<span>₱{formatter(subtotal)}</span>
						</div>
						{discount !== undefined && discount > 0 && (
							<div className="flex justify-between text-green-700">
								<span>{discountLabel ?? "Discount"}</span>
								<span>-₱{formatter(discount)}</span>
							</div>
						)}
						{philhealthCoverage !== undefined && philhealthCoverage > 0 && (
							<div className="flex justify-between text-blue-700">
								<span>PhilHealth Coverage</span>
								<span>-₱{formatter(philhealthCoverage)}</span>
							</div>
						)}
						{vat !== undefined && vat > 0 && (
							<div className="flex justify-between">
								<span>VAT</span>
								<span>₱{formatter(vat)}</span>
							</div>
						)}
						<div className="flex justify-between border-t border-black/40 pt-1 font-bold">
							<span>TOTAL</span>
							<span>₱{formatter(total)}</span>
						</div>
					</div>

					<hr className="border-dashed border-black/40" />

					{/* Payments */}
					<div className="space-y-0.5 text-xs">
						<p className="font-semibold uppercase">Payment</p>
						{payments.map((p, idx) => (
							<div key={idx} className="flex justify-between">
								<span>
									{p.method}
									{p.reference ? ` (${p.reference})` : ""}
								</span>
								<span>₱{formatter(p.amount)}</span>
							</div>
						))}
						{change !== undefined && change > 0 && (
							<div className="flex justify-between font-medium">
								<span>Change</span>
								<span>₱{formatter(change)}</span>
							</div>
						)}
					</div>

					<hr className="border-dashed border-black/40" />

					{/* Barcode placeholder (encounter ID) */}
					<div className="text-center text-xs">
						<p className="font-mono text-[10px] tracking-widest">{encounterId}</p>
						<p className="mt-0.5 text-[9px] text-black/60 uppercase">Encounter ID</p>
					</div>

					<hr className="border-dashed border-black/40" />

					{/* Footer */}
					<div className="space-y-1 text-center text-[10px] text-black/70">
						<p>Cashier: {issuedBy}</p>
						<p>This is your official receipt. Thank you.</p>
					</div>
				</div>
			</>
		)
	}
)

ReceiptTemplate.displayName = "ReceiptTemplate"
