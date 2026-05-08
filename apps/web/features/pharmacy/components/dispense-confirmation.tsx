"use client"

import { useState } from "react"

import { CheckCircle2, Loader2 } from "lucide-react"

import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"

import {
	type PharmacyOrderDetail,
	useDispenseOrderMutation,
	useVerifyPharmacyOrderMutation,
} from "../api/pharmacy.hooks"

// ── Patient education checklist ───────────────────────────────────────────────

const EDUCATION_ITEMS: Array<{ key: string; label: string }> = [
	{ key: "purpose", label: "Purpose and expected benefits of medication" },
	{ key: "dose_instructions", label: "How and when to take (dose, timing, with/without food)" },
	{ key: "side_effects", label: "Common and serious side effects to watch for" },
	{ key: "adherence", label: "Importance of completing the full course" },
	{ key: "missed_dose", label: "What to do if a dose is missed" },
	{ key: "drug_interactions", label: "Drug and food interactions to avoid" },
	{ key: "storage", label: "Proper storage conditions (temperature, light, moisture)" },
	{ key: "disposal", label: "Safe disposal of unused medication" },
]

const CS_EDUCATION_ITEMS: Array<{ key: string; label: string }> = [
	{ key: "controlled_warning", label: "Controlled substance — potential for dependence explained" },
	{ key: "no_share", label: "Medication must not be shared with others" },
	{ key: "secure_storage", label: "Must be stored securely, out of reach of children" },
]

// ── Main component ────────────────────────────────────────────────────────────

interface DispenseConfirmationProps {
	order: PharmacyOrderDetail
	overrideNotes?: string
	onSuccess: () => void
	onCancel: () => void
}

export function DispenseConfirmation({
	order,
	overrideNotes,
	onSuccess,
	onCancel,
}: DispenseConfirmationProps) {
	const verify = useVerifyPharmacyOrderMutation()
	const dispense = useDispenseOrderMutation()

	const [quantity, setQuantity] = useState<string>("")
	const [quantityUnit, setQuantityUnit] = useState(order.doseForm || "tablet")
	const [lotNumber, setLotNumber] = useState("")
	const [expiryDate, setExpiryDate] = useState("")
	const [counselingNotes, setCounselingNotes] = useState("")
	const [education, setEducation] = useState<Set<string>>(new Set())

	function toggleEducation(key: string) {
		setEducation((prev) => {
			const next = new Set(prev)
			if (next.has(key)) next.delete(key)
			else next.add(key)
			return next
		})
	}

	function selectAll() {
		const allKeys = [
			...EDUCATION_ITEMS,
			...(order.isControlledSubstance ? CS_EDUCATION_ITEMS : []),
		].map((i) => i.key)
		setEducation(new Set(allKeys))
	}

	function handleSubmit() {
		verify.mutate(
			{
				medicationOrderId: order.id,
				action: "approved",
				overrideNotes: overrideNotes || undefined,
			},
			{
				onSuccess: () => {
					dispense.mutate(
						{
							medicationOrderId: order.id,
							dispensedQuantity: Number(quantity),
							quantityUnit,
							lotNumber: lotNumber || undefined,
							expiryDate: expiryDate || undefined,
							counselingNotes: counselingNotes || undefined,
							patientEducation: Array.from(education),
						},
						{
							onSuccess: () => {
								toast.success("Order approved and dispensed")
								onSuccess()
							},
							onError: (err) =>
								toast.error(
									err instanceof Error ? err.message : "Dispense failed"
								),
						}
					)
				},
				onError: (err) =>
					toast.error(
						err instanceof Error ? err.message : "Failed to approve order"
					),
			}
		)
	}

	const isBusy = verify.isPending || dispense.isPending

	const isValid = quantity.trim() !== "" && Number(quantity) > 0

	return (
		<div className="space-y-6">
			{/* Drug summary */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">Dispensing Confirmation</CardTitle>
						{order.isControlledSubstance && (
							<Badge variant="outline">Controlled S{order.pdeaSchedule}</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="rounded-md bg-muted p-3">
						<p className="font-medium">
							{order.genericName}
							{order.brandName ? ` (${order.brandName})` : ""}
						</p>
						<p className="text-muted-foreground text-sm">
							{order.dose} {order.doseUnit} · {order.route} · {order.frequency}
							{order.durationDays ? ` · ${order.durationDays} days` : ""}
						</p>
						<p className="text-muted-foreground text-xs mt-1">
							Patient:{" "}
							<strong>
								{order.patientName}
							</strong>{" "}
							· MRN: {order.patientMrn}
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Dispense details */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">Dispense Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="dispQty" className="mb-1 block text-sm">
								Dispensed Quantity <span className="text-red-500">*</span>
							</Label>
							<div className="flex gap-2">
								<Input
									id="dispQty"
									type="number"
									min="0"
									step="1"
									placeholder="0"
									value={quantity}
									onChange={(e) => setQuantity(e.target.value)}
									className="w-24"
								/>
								<Input
									aria-label="Unit"
									placeholder="unit (e.g. tablet)"
									value={quantityUnit}
									onChange={(e) => setQuantityUnit(e.target.value)}
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="lotNum" className="mb-1 block text-sm">
								Lot / Batch Number
							</Label>
							<Input
								id="lotNum"
								placeholder="Optional"
								value={lotNumber}
								onChange={(e) => setLotNumber(e.target.value)}
							/>
						</div>

						<div>
							<Label htmlFor="expDate" className="mb-1 block text-sm">
								Expiry Date
							</Label>
							<Input
								id="expDate"
								type="date"
								value={expiryDate}
								onChange={(e) => setExpiryDate(e.target.value)}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="counselingNotes" className="mb-1 block text-sm">
							Counseling Notes
						</Label>
						<Textarea
							id="counselingNotes"
							rows={3}
							placeholder="Document patient counseling session, questions raised, understanding confirmed…"
							value={counselingNotes}
							onChange={(e) => setCounselingNotes(e.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Patient education checklist */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-medium">
							Patient Education Checklist
						</CardTitle>
						<Button variant="ghost" size="sm" onClick={selectAll}>
							Select All
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-2">
					<p className="text-muted-foreground mb-3 text-xs">
						Check all topics covered during patient counseling.
					</p>

					{EDUCATION_ITEMS.map((item) => (
						<div key={item.key} className="flex items-center gap-2">
							<Checkbox
								id={`edu-${item.key}`}
								checked={education.has(item.key)}
								onCheckedChange={() => toggleEducation(item.key)}
							/>
							<Label htmlFor={`edu-${item.key}`} className="cursor-pointer text-sm font-normal">
								{item.label}
							</Label>
						</div>
					))}

					{order.isControlledSubstance && (
						<>
							<Separator className="my-2" />
							<p className="text-xs font-semibold uppercase text-orange-700">
								Controlled Substance Counseling
							</p>
							{CS_EDUCATION_ITEMS.map((item) => (
								<div key={item.key} className="flex items-center gap-2">
									<Checkbox
										id={`edu-${item.key}`}
										checked={education.has(item.key)}
										onCheckedChange={() => toggleEducation(item.key)}
									/>
									<Label
										htmlFor={`edu-${item.key}`}
										className="cursor-pointer text-sm font-normal text-orange-800"
									>
										{item.label}
									</Label>
								</div>
							))}
						</>
					)}

					<p className="text-muted-foreground pt-2 text-xs">
						{education.size} /{" "}
						{EDUCATION_ITEMS.length +
							(order.isControlledSubstance ? CS_EDUCATION_ITEMS.length : 0)}{" "}
						topics covered
					</p>
				</CardContent>
			</Card>

			{/* Actions */}
			<div className="flex items-center gap-3">
				<Button
					onClick={handleSubmit}
					disabled={!isValid || isBusy}
				>
					{isBusy ? (
						<Loader2 className="mr-1.5 size-4 animate-spin" />
					) : (
						<CheckCircle2 className="mr-1.5 size-4" />
					)}
					{verify.isPending ? "Approving…" : dispense.isPending ? "Dispensing…" : "Approve & Dispense"}
				</Button>
				<Button variant="outline" onClick={onCancel} disabled={isBusy}>
					Cancel
				</Button>
			</div>
		</div>
	)
}
