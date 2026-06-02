"use client"

import { useState } from "react"

import { CheckCircle2, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Calendar } from "@/core/components/ui/calendar"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/core/components/ui/popover"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"

import type { FormularyItem, FormularyStatus } from "./formulary-management"

// ============================================================================
// Helpers
// ============================================================================

function DatePicker({
	label,
	value,
	onChange,
}: {
	label: string
	value: string
	onChange: (v: string) => void
}) {
	const dateValue = value ? new Date(value) : undefined

	return (
		<div className="space-y-1">
			<Label className="text-xs">{label}</Label>
			<Popover>
				<PopoverTrigger
					render={<Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm" />}
				>
						{dateValue ? dateValue.toLocaleDateString("en-PH") : "Select date…"}
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-0">
					<Calendar
						mode="single"
						selected={dateValue}
						onSelect={(d) => onChange(d ? d.toISOString().slice(0, 10) : "")}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}

// ============================================================================
// FormularyNoteEditor
// ============================================================================

interface FormularyNoteEditorProps {
	item: FormularyItem | null
	onSave: (item: FormularyItem) => void
	onCancel: () => void
}

export function FormularyNoteEditor({ item, onSave, onCancel }: FormularyNoteEditorProps) {
	const [isSaving, setIsSaving] = useState(false)
	const [saved, setSaved] = useState(false)

	// Form state
	const [genericName, setGenericName] = useState(item?.genericName ?? "")
	const [brandNamesRaw, setBrandNamesRaw] = useState((item?.brandNames ?? []).join(", "))
	const [drugClass, setDrugClass] = useState(item?.drugClass ?? "")
	const [dosageFormsRaw, setDosageFormsRaw] = useState((item?.dosageForms ?? []).join("; "))
	const [status, setStatus] = useState<FormularyStatus>(item?.status ?? "on_formulary")
	const [restriction, setRestriction] = useState(item?.restriction ?? "")
	const [alternativesRaw, setAlternativesRaw] = useState((item?.alternatives ?? []).join(", "))
	const [costNote, setCostNote] = useState(item?.costNote ?? "")
	const [clinicalRationale, setClinicalRationale] = useState(item?.clinicalRationale ?? "")
	const [effectiveDate, setEffectiveDate] = useState(item?.effectiveDate ?? "")
	const [discontinueDate, setDiscontinueDate] = useState(item?.discontinueDate ?? "")

	async function handleSave() {
		if (!genericName.trim()) return
		setIsSaving(true)

		// Simulate async save (replace with real mutation)
		await new Promise((r) => setTimeout(r, 600))

		const updated: FormularyItem = {
			id: item?.id ?? crypto.randomUUID(),
			genericName: genericName.trim(),
			brandNames: brandNamesRaw
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean),
			drugClass: drugClass.trim(),
			dosageForms: dosageFormsRaw
				.split(";")
				.map((s) => s.trim())
				.filter(Boolean),
			status,
			restriction: restriction.trim() || undefined,
			alternatives: alternativesRaw
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean),
			costNote: costNote.trim() || undefined,
			clinicalRationale: clinicalRationale.trim() || undefined,
			effectiveDate: effectiveDate || undefined,
			discontinueDate: discontinueDate || undefined,
			updatedAt: new Date().toISOString(),
		}

		setIsSaving(false)
		setSaved(true)
		onSave(updated)
	}

	if (saved) {
		return (
			<div className="flex flex-col items-center py-10 text-center">
				<CheckCircle2 className="size-12 text-green-500 mb-3" />
				<p className="font-semibold">Saved</p>
				<p className="text-sm text-muted-foreground mt-1">Formulary entry updated.</p>
			</div>
		)
	}

	return (
		<div className="space-y-5">
			{/* Drug identifiers */}
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1">
					<Label className="text-xs">Generic Name *</Label>
					<Input
						value={genericName}
						onChange={(e) => setGenericName(e.target.value)}
						placeholder="e.g., Amoxicillin"
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-xs">Brand Name(s) (comma-separated)</Label>
					<Input
						value={brandNamesRaw}
						onChange={(e) => setBrandNamesRaw(e.target.value)}
						placeholder="e.g., Amoxil, Trimox"
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-xs">Drug Class</Label>
					<Input
						value={drugClass}
						onChange={(e) => setDrugClass(e.target.value)}
						placeholder="e.g., Penicillin Antibiotic"
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-xs">Dosage Forms (semicolon-separated)</Label>
					<Input
						value={dosageFormsRaw}
						onChange={(e) => setDosageFormsRaw(e.target.value)}
						placeholder="e.g., 500mg capsule; 250mg/5mL suspension"
					/>
				</div>
			</div>

			<Separator />

			{/* Formulary status */}
			<div className="space-y-1">
				<Label className="text-xs">Formulary Status</Label>
				<Select value={status} onValueChange={(v) => setStatus(v as FormularyStatus)}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="on_formulary">On Formulary</SelectItem>
						<SelectItem value="restricted">Restricted</SelectItem>
						<SelectItem value="off_formulary">Off Formulary</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{(status === "restricted" || status === "off_formulary") && (
				<div className="space-y-1">
					<Label className="text-xs">
						{status === "restricted" ? "Restriction Criteria" : "Reason for Removal"}
					</Label>
					<Textarea
						rows={3}
						value={restriction}
						onChange={(e) => setRestriction(e.target.value)}
						placeholder="Specify approval requirements, criteria for use, or reason for off-formulary status…"
					/>
				</div>
			)}

			<div className="space-y-1">
				<Label className="text-xs">Alternative Drug(s) (comma-separated)</Label>
				<Input
					value={alternativesRaw}
					onChange={(e) => setAlternativesRaw(e.target.value)}
					placeholder="e.g., Piperacillin-Tazobactam, Ceftriaxone"
				/>
			</div>

			<Separator />

			{/* Cost & Clinical notes */}
			<div className="space-y-1">
				<Label className="text-xs">Cost Note</Label>
				<Textarea
					rows={2}
					value={costNote}
					onChange={(e) => setCostNote(e.target.value)}
					placeholder="PhilHealth coverage status, cost considerations, generic availability…"
				/>
			</div>

			<div className="space-y-1">
				<Label className="text-xs">Clinical Rationale</Label>
				<Textarea
					rows={3}
					value={clinicalRationale}
					onChange={(e) => setClinicalRationale(e.target.value)}
					placeholder="Evidence-based rationale, local antibiogram data, committee decision…"
				/>
			</div>

			<Separator />

			{/* Effective / discontinue dates */}
			<div className="grid gap-4 sm:grid-cols-2">
				<DatePicker
					label="Effective Date"
					value={effectiveDate}
					onChange={setEffectiveDate}
				/>
				<DatePicker
					label="Discontinue Date (if applicable)"
					value={discontinueDate}
					onChange={setDiscontinueDate}
				/>
			</div>

			{/* Actions */}
			<div className="flex justify-between items-center pt-2">
				{item && (
					<Button
						variant="ghost"
						size="sm"
						className="text-destructive hover:text-destructive"
						onClick={onCancel}
					>
						<Trash2 className="mr-1.5 size-3.5" />
						Archive
					</Button>
				)}
				<div className="flex gap-2 ml-auto">
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={isSaving || !genericName.trim()}>
						{isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</div>
		</div>
	)
}
