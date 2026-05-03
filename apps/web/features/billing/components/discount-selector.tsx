"use client"

import { Label } from "@/core/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Textarea } from "@/core/components/ui/textarea"
import { MoneyInput } from "./money-input"

export type DiscountType = "NONE" | "SENIOR" | "PWD" | "SOLO_PARENT" | "MANUAL"

interface DiscountSelectorProps {
	value: DiscountType
	onChange: (type: DiscountType) => void
	manualAmount: number
	onManualAmountChange: (amount: number) => void
	manualReason: string
	onManualReasonChange: (reason: string) => void
	/** Max allowed manual discount amount (from facility master data) */
	maxManualDiscount?: number
	disabled?: boolean
}

const DISCOUNT_OPTIONS: Array<{ value: DiscountType; label: string; description: string }> = [
	{ value: "NONE", label: "No discount", description: "Full price applies" },
	{ value: "SENIOR", label: "Senior Citizen (20%)", description: "R.A. 9994 — mutually exclusive" },
	{ value: "PWD", label: "PWD (20%)", description: "R.A. 10754 — mutually exclusive" },
	{ value: "SOLO_PARENT", label: "Solo Parent (10%)", description: "R.A. 8972 — mutually exclusive" },
	{ value: "MANUAL", label: "Manual override", description: "Requires justification and manager approval" },
]

export function DiscountSelector({
	value,
	onChange,
	manualAmount,
	onManualAmountChange,
	manualReason,
	onManualReasonChange,
	maxManualDiscount,
	disabled = false,
}: DiscountSelectorProps) {
	const exceedsMax =
		value === "MANUAL" && maxManualDiscount !== undefined && manualAmount > maxManualDiscount

	return (
		<div className="space-y-3">
			<p className="text-xs text-muted-foreground">
				Only one discount type applies per invoice. Senior, PWD, and Solo Parent discounts are
				mutually exclusive per Philippine law.
			</p>

			<RadioGroup
				value={value}
				onValueChange={v => onChange(v as DiscountType)}
				disabled={disabled}
				aria-label="Discount type"
			>
				{DISCOUNT_OPTIONS.map(opt => (
					<div key={opt.value} className="flex items-start gap-3">
						<RadioGroupItem value={opt.value} id={`discount-${opt.value}`} className="mt-0.5" />
						<Label htmlFor={`discount-${opt.value}`} className="flex flex-col gap-0.5 cursor-pointer">
							<span className="text-sm font-medium">{opt.label}</span>
							<span className="text-xs text-muted-foreground">{opt.description}</span>
						</Label>
					</div>
				))}
			</RadioGroup>

			{value === "MANUAL" && (
				<div className="ml-6 space-y-3 rounded-md border p-3">
					<div className="space-y-1">
						<Label htmlFor="manual-discount-amount" className="text-sm">
							Discount amount
						</Label>
						<MoneyInput
							id="manual-discount-amount"
							value={manualAmount}
							onChange={onManualAmountChange}
							disabled={disabled}
							aria-describedby={exceedsMax ? "manual-discount-error" : undefined}
						/>
						{exceedsMax && (
							<p id="manual-discount-error" className="text-xs text-destructive" role="alert">
								Exceeds maximum allowed manual discount of ₱
								{maxManualDiscount?.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
							</p>
						)}
					</div>

					<div className="space-y-1">
						<Label htmlFor="manual-discount-reason" className="text-sm">
							Justification <span className="text-destructive" aria-hidden>*</span>
						</Label>
						<Textarea
							id="manual-discount-reason"
							value={manualReason}
							onChange={e => onManualReasonChange(e.target.value)}
							placeholder="Enter reason for manual discount..."
							rows={2}
							disabled={disabled}
							required
							aria-required="true"
						/>
					</div>
				</div>
			)}
		</div>
	)
}
