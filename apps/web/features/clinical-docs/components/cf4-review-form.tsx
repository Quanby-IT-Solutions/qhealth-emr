"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiagnosisEntry {
	code: string
	description: string
}

interface CF4Data {
	claimType: "inpatient" | "outpatient" | "er"
	facilityLevel: "primary" | "secondary" | "tertiary"
	primaryDiagnosis: DiagnosisEntry
	secondaryDiagnoses: DiagnosisEntry[]
	procedureCodes: string[]
	roomType: "private" | "semi_private" | "ward"
	admissionDate: string
	dischargeDate: string
	dischargeStatus: "improved" | "recovered" | "transferred" | "expired" | "hama"
	totalRoomAndBoard: string
	totalProfessionalFee: string
	totalMedicines: string
	totalLaboratory: string
	totalImaging: string
	totalOtherCharges: string
}

interface CF4ReviewFormProps {
	encounterId: string
	patientName: string
	/** Pre-populated values extracted from encounter data. */
	initialValues?: Partial<CF4Data>
	onSubmit: (data: CF4Data) => void
	onCancel: () => void
	isSubmitting?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toPhpAmount(value: string): string {
	const n = parseFloat(value)
	if (isNaN(n)) return "₱ 0.00"
	return n.toLocaleString("en-PH", { style: "currency", currency: "PHP" })
}

function totalCharges(data: CF4Data): number {
	return [
		data.totalRoomAndBoard,
		data.totalProfessionalFee,
		data.totalMedicines,
		data.totalLaboratory,
		data.totalImaging,
		data.totalOtherCharges,
	].reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
}

const CLAIM_TYPES = [
	{ value: "inpatient", label: "Inpatient (IP)" },
	{ value: "outpatient", label: "Outpatient (OP)" },
	{ value: "er", label: "Emergency Room (ER)" },
] as const

const FACILITY_LEVELS = [
	{ value: "primary", label: "Level 1 — Primary Care" },
	{ value: "secondary", label: "Level 2 — Secondary" },
	{ value: "tertiary", label: "Level 3 — Tertiary" },
] as const

const ROOM_TYPES = [
	{ value: "private", label: "Private Room" },
	{ value: "semi_private", label: "Semi-Private" },
	{ value: "ward", label: "Ward" },
] as const

const DISCHARGE_STATUSES = [
	{ value: "improved", label: "Improved" },
	{ value: "recovered", label: "Recovered" },
	{ value: "transferred", label: "Transferred" },
	{ value: "expired", label: "Expired" },
	{ value: "hama", label: "HAMA (Discharged Against Medical Advice)" },
] as const

const EMPTY_DIAGNOSIS: DiagnosisEntry = { code: "", description: "" }

function defaultCF4(init: Partial<CF4Data>): CF4Data {
	return {
		claimType: init.claimType ?? "inpatient",
		facilityLevel: init.facilityLevel ?? "primary",
		primaryDiagnosis: init.primaryDiagnosis ?? { ...EMPTY_DIAGNOSIS },
		secondaryDiagnoses: init.secondaryDiagnoses ?? [],
		procedureCodes: init.procedureCodes ?? [""],
		roomType: init.roomType ?? "ward",
		admissionDate: init.admissionDate ?? "",
		dischargeDate: init.dischargeDate ?? "",
		dischargeStatus: init.dischargeStatus ?? "improved",
		totalRoomAndBoard: init.totalRoomAndBoard ?? "",
		totalProfessionalFee: init.totalProfessionalFee ?? "",
		totalMedicines: init.totalMedicines ?? "",
		totalLaboratory: init.totalLaboratory ?? "",
		totalImaging: init.totalImaging ?? "",
		totalOtherCharges: init.totalOtherCharges ?? "",
	}
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * CF4 (PhilHealth Claim Form 4) review component.
 * Shows auto-extracted encounter data pre-populated in editable fields.
 */
export function CF4ReviewForm({
	encounterId,
	patientName,
	initialValues = {},
	onSubmit,
	onCancel,
	isSubmitting = false,
}: CF4ReviewFormProps) {
	const [data, setData] = useState<CF4Data>(() => defaultCF4(initialValues))

	function set<K extends keyof CF4Data>(key: K, value: CF4Data[K]) {
		setData(prev => ({ ...prev, [key]: value }))
	}

	function updatePrimary(field: keyof DiagnosisEntry, value: string) {
		setData(prev => ({
			...prev,
			primaryDiagnosis: { ...prev.primaryDiagnosis, [field]: value },
		}))
	}

	function updateSecondary(index: number, field: keyof DiagnosisEntry, value: string) {
		setData(prev => {
			const arr = [...prev.secondaryDiagnoses]
			arr[index] = { ...arr[index]!, [field]: value }
			return { ...prev, secondaryDiagnoses: arr }
		})
	}

	function addSecondaryDiag() {
		if (data.secondaryDiagnoses.length >= 4) return
		setData(prev => ({
			...prev,
			secondaryDiagnoses: [...prev.secondaryDiagnoses, { ...EMPTY_DIAGNOSIS }],
		}))
	}

	function removeSecondaryDiag(index: number) {
		setData(prev => ({
			...prev,
			secondaryDiagnoses: prev.secondaryDiagnoses.filter((_, i) => i !== index),
		}))
	}

	function updateProcedureCode(index: number, value: string) {
		setData(prev => {
			const arr = [...prev.procedureCodes]
			arr[index] = value
			return { ...prev, procedureCodes: arr }
		})
	}

	function addProcedureCode() {
		setData(prev => ({ ...prev, procedureCodes: [...prev.procedureCodes, ""] }))
	}

	function removeProcedureCode(index: number) {
		setData(prev => ({
			...prev,
			procedureCodes: prev.procedureCodes.filter((_, i) => i !== index),
		}))
	}

	const isValid =
		data.claimType &&
		data.facilityLevel &&
		data.primaryDiagnosis.code.trim() &&
		data.admissionDate &&
		data.dischargeDate

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
						PhilHealth CF4 — Claim Form
					</h3>
					<p className="text-base font-medium mt-0.5">{patientName}</p>
					<p className="text-xs text-muted-foreground">Encounter: {encounterId}</p>
				</div>
				<Badge variant="secondary">Auto-extracted — Review before submitting</Badge>
			</div>

			<Separator />

			{/* Claim & Facility */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div className="space-y-1.5">
					<Label>Claim Type *</Label>
					<Select value={data.claimType} onValueChange={v => set("claimType", v as CF4Data["claimType"])}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{CLAIM_TYPES.map(c => (
								<SelectItem key={c.value} value={c.value}>
									{c.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label>Facility Level *</Label>
					<Select value={data.facilityLevel} onValueChange={v => set("facilityLevel", v as CF4Data["facilityLevel"])}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{FACILITY_LEVELS.map(f => (
								<SelectItem key={f.value} value={f.value}>
									{f.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label>Room Type</Label>
					<Select value={data.roomType} onValueChange={v => set("roomType", v as CF4Data["roomType"])}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ROOM_TYPES.map(r => (
								<SelectItem key={r.value} value={r.value}>
									{r.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Dates & Discharge Status */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div className="space-y-1.5">
					<Label>Admission Date *</Label>
					<Input
						type="date"
						value={data.admissionDate}
						onChange={e => set("admissionDate", e.target.value)}
					/>
				</div>

				<div className="space-y-1.5">
					<Label>Discharge Date *</Label>
					<Input
						type="date"
						value={data.dischargeDate}
						onChange={e => set("dischargeDate", e.target.value)}
					/>
				</div>

				<div className="space-y-1.5">
					<Label>Discharge Status</Label>
					<Select value={data.dischargeStatus} onValueChange={v => set("dischargeStatus", v as CF4Data["dischargeStatus"])}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{DISCHARGE_STATUSES.map(s => (
								<SelectItem key={s.value} value={s.value}>
									{s.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<Separator />

			{/* Primary Diagnosis */}
			<div className="space-y-3">
				<h4 className="text-sm font-semibold">Primary Diagnosis (ICD-10) *</h4>
				<div className="grid grid-cols-[1fr_2fr] gap-3">
					<div className="space-y-1.5">
						<Label>ICD-10 Code</Label>
						<Input
							placeholder="e.g. J18.9"
							value={data.primaryDiagnosis.code}
							onChange={e => updatePrimary("code", e.target.value.toUpperCase())}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Description</Label>
						<Input
							placeholder="Pneumonia, unspecified organism"
							value={data.primaryDiagnosis.description}
							onChange={e => updatePrimary("description", e.target.value)}
						/>
					</div>
				</div>
			</div>

			{/* Secondary Diagnoses */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h4 className="text-sm font-semibold">
						Secondary Diagnoses ({data.secondaryDiagnoses.length}/4)
					</h4>
					{data.secondaryDiagnoses.length < 4 && (
						<Button size="sm" variant="outline" type="button" onClick={addSecondaryDiag}>
							+ Add
						</Button>
					)}
				</div>
				{data.secondaryDiagnoses.map((diag, i) => (
					<div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-3 items-end">
						<div className="space-y-1.5">
							<Label className="text-xs">ICD-10 Code</Label>
							<Input
								placeholder="e.g. I10"
								value={diag.code}
								onChange={e => updateSecondary(i, "code", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Description</Label>
							<Input
								placeholder="Essential hypertension"
								value={diag.description}
								onChange={e => updateSecondary(i, "description", e.target.value)}
							/>
						</div>
						<Button
							size="sm"
							variant="ghost"
							type="button"
							className="text-destructive hover:text-destructive"
							onClick={() => removeSecondaryDiag(i)}
						>
							Remove
						</Button>
					</div>
				))}
				{data.secondaryDiagnoses.length === 0 && (
					<p className="text-muted-foreground text-sm">No secondary diagnoses added.</p>
				)}
			</div>

			{/* Procedure Codes */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h4 className="text-sm font-semibold">Procedure Codes (CPT / ICD-10-PCS)</h4>
					<Button size="sm" variant="outline" type="button" onClick={addProcedureCode}>
						+ Add
					</Button>
				</div>
				{data.procedureCodes.map((code, i) => (
					<div key={i} className="flex items-center gap-2">
						<Input
							placeholder="e.g. 99213"
							value={code}
							className="max-w-[200px]"
							onChange={e => updateProcedureCode(i, e.target.value)}
						/>
						{data.procedureCodes.length > 1 && (
							<Button
								size="sm"
								variant="ghost"
								type="button"
								className="text-destructive hover:text-destructive"
								onClick={() => removeProcedureCode(i)}
							>
								Remove
							</Button>
						)}
					</div>
				))}
			</div>

			<Separator />

			{/* Charges breakdown */}
			<div className="space-y-3">
				<h4 className="text-sm font-semibold">Charges Breakdown (PHP)</h4>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
					{(
						[
							["totalRoomAndBoard", "Room & Board"],
							["totalProfessionalFee", "Professional Fees"],
							["totalMedicines", "Medicines & Supplies"],
							["totalLaboratory", "Laboratory"],
							["totalImaging", "Imaging / Radiology"],
							["totalOtherCharges", "Other Charges"],
						] as const
					).map(([field, label]) => (
						<div key={field} className="space-y-1.5">
							<Label className="text-xs">{label}</Label>
							<Input
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								value={data[field]}
								onChange={e => set(field, e.target.value)}
							/>
						</div>
					))}
				</div>

				{/* Total */}
				<div className="flex items-center justify-end gap-3 rounded-md bg-muted/50 px-4 py-2 mt-2">
					<span className="text-sm font-medium">Total Charges:</span>
					<span className="font-mono font-semibold text-base">
						{toPhpAmount(String(totalCharges(data)))}
					</span>
				</div>
			</div>

			<Separator />

			{/* Actions */}
			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button
					type="button"
					disabled={!isValid || isSubmitting}
					onClick={() => onSubmit(data)}
				>
					{isSubmitting ? "Submitting…" : "Submit CF4"}
				</Button>
			</div>
		</div>
	)
}
