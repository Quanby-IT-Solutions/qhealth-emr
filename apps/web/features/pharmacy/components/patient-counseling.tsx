"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, PenLine } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import { SignatureCanvas } from "@/features/nursing/components/consent-capture"

// ============================================================================
// Counseling checklist items (structured per PhilHealth and PSPhA guidance)
// ============================================================================

interface CounselingItem {
	id: string
	category: string
	text: string
}

const COUNSELING_ITEMS: CounselingItem[] = [
	// Indication
	{
		id: "indication",
		category: "Indication",
		text: "Purpose of the medication — what condition/symptom it treats",
	},
	// Dosage & Administration
	{
		id: "dose",
		category: "Dosage & Administration",
		text: "Dose, frequency, and duration of therapy",
	},
	{
		id: "timing",
		category: "Dosage & Administration",
		text: "When and how to take/use the medication (with food, water, etc.)",
	},
	{
		id: "route",
		category: "Dosage & Administration",
		text: "Route of administration (oral, topical, injection, etc.)",
	},
	{
		id: "missed_dose",
		category: "Dosage & Administration",
		text: "What to do if a dose is missed",
	},
	// Precautions
	{
		id: "pregnancy",
		category: "Precautions",
		text: "Use during pregnancy or breastfeeding (if applicable)",
	},
	{
		id: "activities",
		category: "Precautions",
		text: "Activities to avoid (driving, alcohol, sun exposure)",
	},
	{
		id: "contraindications",
		category: "Precautions",
		text: "Conditions where drug should not be used",
	},
	// Side Effects
	{
		id: "common_se",
		category: "Side Effects",
		text: "Common, expected side effects and how to manage them",
	},
	{
		id: "serious_se",
		category: "Side Effects",
		text: "Serious or uncommon side effects requiring medical attention",
	},
	// Drug Interactions
	{
		id: "drug_drug",
		category: "Drug Interactions",
		text: "Interactions with other medications (including OTC and herbal)",
	},
	{
		id: "food_drug",
		category: "Drug Interactions",
		text: "Food-drug interactions (e.g., grapefruit, dairy, vitamin K)",
	},
	// Storage
	{
		id: "storage",
		category: "Storage",
		text: "Proper storage conditions (temperature, light, moisture)",
	},
	{ id: "disposal", category: "Storage", text: "Safe disposal of unused or expired medication" },
	// When to Seek Help
	{
		id: "seek_help",
		category: "When to Seek Help",
		text: "Signs and symptoms that warrant contacting a physician or pharmacist",
	},
	{
		id: "emergency",
		category: "When to Seek Help",
		text: "Emergency situations — overdose, severe allergic reaction, anaphylaxis",
	},
]

// ============================================================================
// Grouped checklist
// ============================================================================

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
	return arr.reduce(
		(acc, item) => {
			const k = key(item)
			if (!acc[k]) acc[k] = []
			acc[k]!.push(item)
			return acc
		},
		{} as Record<string, T[]>
	)
}

// ============================================================================
// Export type for parent to consume
// ============================================================================

export interface CounselingRecord {
	checkedItems: string[]
	additionalNotes: string
	patientSignatureDataUrl: string
	counseledAt: string
}

// ============================================================================
// Main Component
// ============================================================================

interface PatientCounselingProps {
	patientName?: string
	medications?: string[]
	onComplete?: (record: CounselingRecord) => void
	onCancel?: () => void
}

export function PatientCounseling({
	patientName,
	medications = [],
	onComplete,
	onCancel,
}: PatientCounselingProps) {
	const [checked, setChecked] = useState<Set<string>>(new Set())
	const [notes, setNotes] = useState("")
	const [signature, setSignature] = useState("")
	const [saving, setSaving] = useState(false)
	const [done, setDone] = useState(false)

	const grouped = groupBy(COUNSELING_ITEMS, i => i.category)
	const categories = Object.keys(grouped)

	function toggle(id: string) {
		setChecked(prev => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	function selectAll() {
		setChecked(new Set(COUNSELING_ITEMS.map(i => i.id)))
	}

	const canSave = checked.size > 0 && signature !== ""

	async function handleSave() {
		setSaving(true)
		await new Promise(r => setTimeout(r, 400))
		const record: CounselingRecord = {
			checkedItems: Array.from(checked),
			additionalNotes: notes,
			patientSignatureDataUrl: signature,
			counseledAt: new Date().toISOString(),
		}
		setSaving(false)
		setDone(true)
		onComplete?.(record)
	}

	if (done) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center py-10 text-center">
					<CheckCircle2 className="mb-3 size-12 text-green-500" />
					<p className="font-semibold">Counseling Documented</p>
					<p className="text-muted-foreground mt-1 text-sm">
						Patient acknowledgment recorded. Counseling log saved.
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h3 className="flex items-center gap-2 font-semibold">
					<PenLine className="size-4" />
					Patient Medication Counseling
				</h3>
				{patientName && (
					<p className="text-muted-foreground mt-0.5 text-sm">Patient: {patientName}</p>
				)}
				{medications.length > 0 && (
					<p className="text-muted-foreground mt-0.5 text-xs">
						Medications: {medications.join(", ")}
					</p>
				)}
			</div>

			{/* Checklist */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<CardTitle className="text-sm">Counseling Checklist</CardTitle>
					<Button variant="ghost" size="sm" onClick={selectAll}>
						Select All
					</Button>
				</CardHeader>
				<CardContent className="space-y-5">
					{categories.map((cat, idx) => (
						<div key={cat}>
							{idx > 0 && <Separator className="mb-4" />}
							<p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
								{cat}
							</p>
							<div className="space-y-2">
								{grouped[cat]!.map(item => (
									<div key={item.id} className="flex items-start gap-2">
										<Checkbox
											id={item.id}
											checked={checked.has(item.id)}
											onCheckedChange={() => toggle(item.id)}
											className="mt-0.5"
										/>
										<Label htmlFor={item.id} className="cursor-pointer text-sm leading-snug">
											{item.text}
										</Label>
									</div>
								))}
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			{/* Additional notes */}
			<div className="space-y-1">
				<Label className="text-xs">Additional Counseling Notes</Label>
				<Textarea
					rows={3}
					placeholder="Specific patient concerns, language barrier notes, caregiver present, etc."
					value={notes}
					onChange={e => setNotes(e.target.value)}
				/>
			</div>

			{/* Patient acknowledgment signature */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Patient Acknowledgment Signature</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground mb-3 text-xs">
						I confirm that the pharmacist has provided medication counseling and that I understand
						the information given.
					</p>
					<SignatureCanvas
						label={`Patient / Authorized Representative Signature${patientName ? ` (${patientName})` : ""}`}
						onCapture={setSignature}
						onClear={() => setSignature("")}
					/>
				</CardContent>
			</Card>

			{/* Validation hint */}
			{!canSave && checked.size === 0 && (
				<p className="text-muted-foreground text-xs">
					Check at least one counseling item and obtain patient signature to proceed.
				</p>
			)}

			{/* Actions */}
			<div className="flex justify-end gap-2">
				{onCancel && (
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<Button onClick={handleSave} disabled={!canSave || saving}>
					{saving && <Loader2 className="mr-2 size-4 animate-spin" />}
					Save Counseling Record
				</Button>
			</div>
		</div>
	)
}
