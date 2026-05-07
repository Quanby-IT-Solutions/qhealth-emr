"use client"

import { useEffect, useState } from "react"

import { CheckCircle2, Plus, Save, Trash2 } from "lucide-react"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Textarea } from "@/core/components/ui/textarea"

import {
	type AnesthesiaAgent,
	type AnesthesiaRecord,
	type AnesthesiaType,
	type AirwayType,
	type AsaClass,
	type InductionAgent,
	type IntraopMedication,
	type IntraopVital,
	type IntubationGrade,
	type MaintenanceAgent,
	type MuscleRelaxant,
	useSaveAnesthesiaRecordMutation,
	useSignAnesthesiaRecordMutation,
} from "../api/surgical.hooks"

const ASA_OPTIONS: AsaClass[] = [
	"ASA I",
	"ASA II",
	"ASA III",
	"ASA IV",
	"ASA V",
	"ASA VI",
]

const ASA_DESCRIPTIONS: Record<AsaClass, string> = {
	"ASA I": "Normal healthy patient",
	"ASA II": "Mild systemic disease",
	"ASA III": "Severe systemic disease",
	"ASA IV": "Severe systemic disease, constant threat to life",
	"ASA V": "Moribund; not expected to survive without operation",
	"ASA VI": "Brain-dead organ donor",
}

const AIRWAY_OPTIONS: { value: AirwayType; label: string }[] = [
	{ value: "oral_ett", label: "Oral ETT" },
	{ value: "nasal_ett", label: "Nasal ETT" },
	{ value: "lma", label: "LMA" },
	{ value: "awake_fiber_optic", label: "Awake Fiber Optic" },
	{ value: "tracheostomy", label: "Tracheostomy" },
]

const ANESTHESIA_TYPE_OPTIONS: { value: AnesthesiaType; label: string }[] = [
	{ value: "general", label: "General" },
	{ value: "regional", label: "Regional" },
	{ value: "local", label: "Local" },
	{ value: "sedation", label: "Sedation" },
]

const INTUBATION_GRADE_OPTIONS: { value: IntubationGrade; label: string }[] = [
	{ value: "CL1", label: "CL Grade I" },
	{ value: "CL2", label: "CL Grade II" },
	{ value: "CL3", label: "CL Grade III" },
	{ value: "CL4", label: "CL Grade IV" },
	{ value: "not_applicable", label: "N/A" },
]

interface FormState {
	asaClass: AsaClass | undefined
	anesthesiaType: AnesthesiaType | undefined
	airwayType: AirwayType | undefined
	intubationGrade: IntubationGrade | undefined
	difficultAirway: boolean
	airwayManagement: string
	intubationAttempts: string
	inductionAgents: InductionAgent[]
	maintenanceAgents: MaintenanceAgent[]
	muscleRelaxants: MuscleRelaxant[]
	intraopMedications: IntraopMedication[]
	intraopVitals: IntraopVital[]
	reversalAgent: string
	totalAnesthesiaMinutes: string
	emergenceSmooth: boolean | undefined
	complications: string
	postAnesthesiaCareNotes: string
}

function mapLegacyAgentsToMedications(agents: AnesthesiaAgent[] | null | undefined): IntraopMedication[] {
	return (agents ?? []).map((agent) => ({
		name: agent.name,
		dose: agent.dose,
		route: agent.route,
		time: agent.time,
		indication: "",
	}))
}

function mapMedicationsToLegacyAgents(medications: IntraopMedication[]): AnesthesiaAgent[] {
	return medications.map((medication) => ({
		name: medication.name,
		dose: medication.dose,
		route: medication.route,
		time: medication.time,
	}))
}

function buildInitialState(existing: AnesthesiaRecord | null | undefined): FormState {
	return {
		asaClass: existing?.asaClass ?? undefined,
		anesthesiaType: existing?.anesthesiaType ?? undefined,
		airwayType: existing?.airwayType ?? undefined,
		intubationGrade: existing?.intubationGrade ?? undefined,
		difficultAirway: existing?.difficultAirway ?? false,
		airwayManagement: existing?.airwayManagement ?? "",
		intubationAttempts: existing?.intubationAttempts?.toString() ?? "",
		inductionAgents: existing?.inductionAgents ?? [],
		maintenanceAgents: existing?.maintenanceAgents ?? [],
		muscleRelaxants: existing?.muscleRelaxants ?? [],
		intraopMedications: existing?.intraopMedications ?? mapLegacyAgentsToMedications(existing?.agents),
		intraopVitals: existing?.intraopVitals ?? [],
		reversalAgent: existing?.reversalAgent ?? "",
		totalAnesthesiaMinutes: existing?.totalAnesthesiaMinutes?.toString() ?? "",
		emergenceSmooth: existing?.emergenceSmooth ?? undefined,
		complications: existing?.complications ?? "",
		postAnesthesiaCareNotes: existing?.postAnesthesiaCareNotes ?? "",
	}
}

const BLANK_INDUCTION: InductionAgent = { agent: "", dose: "", time: "" }
const BLANK_MAINTENANCE: MaintenanceAgent = { agent: "", dose: "", time: "" }
const BLANK_RELAXANT: MuscleRelaxant = { agent: "", dose: "", time: "" }
const BLANK_MEDICATION: IntraopMedication = { name: "", dose: "", route: "", time: "", indication: "" }
const BLANK_VITAL: IntraopVital = { time: "", bp: "", hr: 0, spo2: 100, etco2: undefined, temp: undefined }

interface AnesthesiaRecordFormProps {
	caseId: string
	existing: AnesthesiaRecord | null | undefined
	canEdit?: boolean
	canSign?: boolean
}

export function AnesthesiaRecordForm({
	caseId,
	existing,
	canEdit = true,
	canSign = false,
}: AnesthesiaRecordFormProps) {
	const [form, setForm] = useState<FormState>(() => buildInitialState(existing))
	const [showSignConfirm, setShowSignConfirm] = useState(false)
	const save = useSaveAnesthesiaRecordMutation()
	const sign = useSignAnesthesiaRecordMutation()

	const isSigned = existing?.status === "signed"
	const fieldsDisabled = isSigned || !canEdit || save.isPending || sign.isPending

	useEffect(() => {
		setForm(buildInitialState(existing))
	}, [existing])

	function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((prev) => ({ ...prev, [key]: value }))
	}

	// ── Induction Agents ───────────────────────────────────────────────────────

	function addInduction() {
		setField("inductionAgents", [...form.inductionAgents, { ...BLANK_INDUCTION }])
	}

	function updateInduction(index: number, field: keyof InductionAgent, value: string) {
		setField(
			"inductionAgents",
			form.inductionAgents.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
		)
	}

	function removeInduction(index: number) {
		setField(
			"inductionAgents",
			form.inductionAgents.filter((_, i) => i !== index),
		)
	}

	// ── Maintenance Agents ─────────────────────────────────────────────────────

	function addMaintenance() {
		setField("maintenanceAgents", [...form.maintenanceAgents, { ...BLANK_MAINTENANCE }])
	}

	function updateMaintenance(index: number, field: keyof MaintenanceAgent, value: string) {
		setField(
			"maintenanceAgents",
			form.maintenanceAgents.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
		)
	}

	function removeMaintenance(index: number) {
		setField(
			"maintenanceAgents",
			form.maintenanceAgents.filter((_, i) => i !== index),
		)
	}

	// ── Muscle Relaxants ───────────────────────────────────────────────────────

	function addRelaxant() {
		setField("muscleRelaxants", [...form.muscleRelaxants, { ...BLANK_RELAXANT }])
	}

	function updateRelaxant(index: number, field: keyof MuscleRelaxant, value: string) {
		setField(
			"muscleRelaxants",
			form.muscleRelaxants.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
		)
	}

	function removeRelaxant(index: number) {
		setField(
			"muscleRelaxants",
			form.muscleRelaxants.filter((_, i) => i !== index),
		)
	}

	// ── Intraop Medications ────────────────────────────────────────────────────

	function addMedication() {
		setField("intraopMedications", [...form.intraopMedications, { ...BLANK_MEDICATION }])
	}

	function updateMedication(index: number, field: keyof IntraopMedication, value: string) {
		setField(
			"intraopMedications",
			form.intraopMedications.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
		)
	}

	function removeMedication(index: number) {
		setField(
			"intraopMedications",
			form.intraopMedications.filter((_, i) => i !== index),
		)
	}

	// ── Vitals ─────────────────────────────────────────────────────────────────

	function addVital() {
		setField("intraopVitals", [...form.intraopVitals, { ...BLANK_VITAL }])
	}

	function updateVital(
		index: number,
		field: keyof IntraopVital,
		value: string | number | undefined,
	) {
		setField(
			"intraopVitals",
			form.intraopVitals.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
		)
	}

	function removeVital(index: number) {
		setField(
			"intraopVitals",
			form.intraopVitals.filter((_, i) => i !== index),
		)
	}

	function buildPayload() {
		return {
			caseId,
			asaClass: form.asaClass,
			anesthesiaType: form.anesthesiaType,
			airwayType: form.airwayType,
			airwayManagement: form.airwayManagement || undefined,
			intubationAttempts: form.intubationAttempts ? Number(form.intubationAttempts) : undefined,
			intubationGrade: form.intubationGrade,
			difficultAirway: form.difficultAirway,
			agents: mapMedicationsToLegacyAgents(form.intraopMedications),
			inductionAgents: form.inductionAgents,
			maintenanceAgents: form.maintenanceAgents,
			muscleRelaxants: form.muscleRelaxants,
			intraopMedications: form.intraopMedications,
			intraopVitals: form.intraopVitals,
			reversalAgent: form.reversalAgent || undefined,
			totalAnesthesiaMinutes: form.totalAnesthesiaMinutes
				? Number(form.totalAnesthesiaMinutes)
				: undefined,
			emergenceSmooth: form.emergenceSmooth,
			complications: form.complications || undefined,
			postAnesthesiaCareNotes: form.postAnesthesiaCareNotes || undefined,
		}
	}

	// ── Submit ─────────────────────────────────────────────────────────────────

	async function handleSave() {
		return save.mutateAsync(buildPayload())
	}

	function handleSign() {
		setShowSignConfirm(true)
	}

	async function confirmSign() {
		if (canEdit) {
			await handleSave()
		} else if (!existing) {
			return
		}

		await sign.mutateAsync({ caseId })
		setShowSignConfirm(false)
	}

	return (
		<div className="space-y-6">
			{/* Signed banner */}
			{isSigned && (
				<div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
					<CheckCircle2 className="size-4 shrink-0" />
					<span className="font-medium">Anesthesia record signed</span>
					{existing?.signedAt && (
						<span className="text-green-700">
							&middot;{" "}
							{new Date(existing.signedAt).toLocaleString("en-PH", {
								dateStyle: "medium",
								timeStyle: "short",
							})}
						</span>
					)}
				</div>
			)}

			{/* Classification */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Patient Classification</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>Anesthesia Type</Label>
						<Select
							value={form.anesthesiaType ?? ""}
							onValueChange={(v) => setField("anesthesiaType", v as AnesthesiaType)}
							disabled={fieldsDisabled}
						>
							<SelectTrigger>
								<SelectValue>
									{ANESTHESIA_TYPE_OPTIONS.find(o => o.value === form.anesthesiaType)?.label ?? "Select type…"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{ANESTHESIA_TYPE_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label>ASA Physical Status Class</Label>
						<Select
							value={form.asaClass ?? ""}
							onValueChange={(v) => setField("asaClass", v as AsaClass)}
							disabled={fieldsDisabled}
						>
							<SelectTrigger>
								<SelectValue>
									{form.asaClass ?? "Select class…"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{ASA_OPTIONS.map((cls) => (
									<SelectItem key={cls} value={cls}>
										{cls} — {ASA_DESCRIPTIONS[cls]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{!isSigned && form.asaClass && (
						<div className="flex h-10 items-center sm:col-span-2">
							<Badge variant="secondary" className="text-sm">
								{form.asaClass}: {ASA_DESCRIPTIONS[form.asaClass]}
							</Badge>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Airway */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Airway Management</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-3">
						<div className="space-y-1.5">
							<Label>Airway Device</Label>
							<Select
								value={form.airwayType ?? ""}
								onValueChange={(v) => setField("airwayType", v as AirwayType)}
								disabled={fieldsDisabled}
							>
								<SelectTrigger>
									<SelectValue>
									{AIRWAY_OPTIONS.find(o => o.value === form.airwayType)?.label ?? "Select device…"}
								</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{AIRWAY_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label>Cormack-Lehane Grade</Label>
							<Select
								value={form.intubationGrade ?? ""}
								onValueChange={(v) => setField("intubationGrade", v as IntubationGrade)}
								disabled={fieldsDisabled}
							>
								<SelectTrigger>
									<SelectValue>
									{INTUBATION_GRADE_OPTIONS.find(o => o.value === form.intubationGrade)?.label ?? "Select grade…"}
								</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{INTUBATION_GRADE_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label>Intubation Attempts</Label>
							<Input
								type="number"
								min={1}
								value={form.intubationAttempts}
								onChange={(e) => setField("intubationAttempts", e.target.value)}
								disabled={fieldsDisabled}
							/>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Checkbox
							id="difficult-airway"
							checked={form.difficultAirway}
							onCheckedChange={(v) => setField("difficultAirway", !!v)}
							disabled={fieldsDisabled}
						/>
						<Label htmlFor="difficult-airway">Difficult airway documented</Label>
					</div>
					<div className="space-y-1.5">
						<Label>Airway Notes</Label>
						<Textarea
							rows={2}
							value={form.airwayManagement}
							onChange={(e) => setField("airwayManagement", e.target.value)}
							placeholder="Additional airway management notes…"
							disabled={fieldsDisabled}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Anesthetic Agents — three sub-sections */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Anesthetic Agents</CardTitle>
				</CardHeader>
				<CardContent className="space-y-0 p-0">
					{/* Induction */}
					<div className="px-6 pt-4 pb-4">
						<p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
							Induction Agents
						</p>
						{form.inductionAgents.length > 0 && (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Agent</TableHead>
										<TableHead>Dose</TableHead>
										<TableHead>Time</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{form.inductionAgents.map((a, i) => (
										<TableRow key={i}>
											<TableCell>
												<Input
													value={a.agent}
													onChange={(e) =>
														updateInduction(i, "agent", e.target.value)
													}
													placeholder="e.g. Propofol"
													disabled={fieldsDisabled}
												/>
											</TableCell>
											<TableCell>
												<Input
													value={a.dose}
													onChange={(e) =>
														updateInduction(i, "dose", e.target.value)
													}
													placeholder="e.g. 2 mg/kg"
													disabled={fieldsDisabled}
												/>
											</TableCell>
											<TableCell>
												<Input
													value={a.time ?? ""}
													onChange={(e) =>
														updateInduction(i, "time", e.target.value)
													}
													placeholder="HH:MM"
													disabled={fieldsDisabled}
												/>
											</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => removeInduction(i)}
													disabled={fieldsDisabled}
												>
													<Trash2 className="size-3.5 text-destructive" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={addInduction}
							disabled={fieldsDisabled}
							className="mt-2"
						>
							<Plus className="mr-1.5 size-3.5" />
							Add Induction Agent
						</Button>
					</div>

					<Separator />

					{/* Maintenance */}
					<div className="px-6 pt-4 pb-4">
						<p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
							Maintenance Agents
						</p>
						{form.maintenanceAgents.length > 0 && (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Agent</TableHead>
										<TableHead>Dose / Concentration</TableHead>
										<TableHead>Time</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{form.maintenanceAgents.map((a, i) => (
										<TableRow key={i}>
											<TableCell>
												<Input
													value={a.agent}
													onChange={(e) =>
														updateMaintenance(i, "agent", e.target.value)
													}
													placeholder="e.g. Sevoflurane"
													disabled={fieldsDisabled}
												/>
											</TableCell>
											<TableCell>
												<Input
													value={a.dose}
													onChange={(e) =>
														updateMaintenance(i, "dose", e.target.value)
													}
													placeholder="e.g. 2% in O₂/Air"
													disabled={fieldsDisabled}
												/>
											</TableCell>
											<TableCell>
												<Input
													value={a.time ?? ""}
													onChange={(e) =>
														updateMaintenance(i, "time", e.target.value)
													}
													placeholder="HH:MM"
													disabled={fieldsDisabled}
												/>
											</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => removeMaintenance(i)}
													disabled={fieldsDisabled}
												>
													<Trash2 className="size-3.5 text-destructive" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={addMaintenance}
							disabled={fieldsDisabled}
							className="mt-2"
						>
							<Plus className="mr-1.5 size-3.5" />
							Add Maintenance Agent
						</Button>
					</div>

					<Separator />

					{/* Muscle Relaxants */}
					<div className="px-6 pt-4 pb-4">
						<p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
							Muscle Relaxants
						</p>
						{form.muscleRelaxants.length > 0 && (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Agent</TableHead>
										<TableHead>Dose</TableHead>
										<TableHead>Time</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{form.muscleRelaxants.map((a, i) => (
										<TableRow key={i}>
											<TableCell>
												<Input
													value={a.agent}
													onChange={(e) =>
														updateRelaxant(i, "agent", e.target.value)
													}
													placeholder="e.g. Rocuronium"
													disabled={fieldsDisabled}
												/>
											</TableCell>
											<TableCell>
												<Input
													value={a.dose}
													onChange={(e) =>
														updateRelaxant(i, "dose", e.target.value)
													}
													placeholder="e.g. 0.6 mg/kg"
													disabled={fieldsDisabled}
												/>
											</TableCell>
											<TableCell>
												<Input
													value={a.time ?? ""}
													onChange={(e) =>
														updateRelaxant(i, "time", e.target.value)
													}
													placeholder="HH:MM"
													disabled={fieldsDisabled}
												/>
											</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => removeRelaxant(i)}
													disabled={fieldsDisabled}
												>
													<Trash2 className="size-3.5 text-destructive" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={addRelaxant}
							disabled={fieldsDisabled}
							className="mt-2"
						>
							<Plus className="mr-1.5 size-3.5" />
							Add Muscle Relaxant
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Intraoperative Medications */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">Intraoperative Medications</CardTitle>
					<Button
						variant="outline"
						size="sm"
						onClick={addMedication}
						disabled={fieldsDisabled}
					>
						<Plus className="mr-1.5 size-3.5" />
						Add Medication
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					{form.intraopMedications.length === 0 ? (
						<p className="text-muted-foreground px-4 py-6 text-center text-sm">
							No medications recorded. Click &ldquo;Add Medication&rdquo; to begin.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Medication</TableHead>
									<TableHead>Dose</TableHead>
									<TableHead>Route</TableHead>
									<TableHead>Time</TableHead>
									<TableHead>Indication</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{form.intraopMedications.map((m, i) => (
									<TableRow key={i}>
										<TableCell>
											<Input
												value={m.name}
												onChange={(e) =>
													updateMedication(i, "name", e.target.value)
												}
												placeholder="e.g. Cefazolin"
												disabled={fieldsDisabled}
											/>
										</TableCell>
										<TableCell>
											<Input
												value={m.dose}
												onChange={(e) =>
													updateMedication(i, "dose", e.target.value)
												}
												placeholder="e.g. 1g"
												disabled={fieldsDisabled}
											/>
										</TableCell>
										<TableCell>
											<Input
												value={m.route}
												onChange={(e) =>
													updateMedication(i, "route", e.target.value)
												}
												placeholder="e.g. IV"
												disabled={fieldsDisabled}
											/>
										</TableCell>
										<TableCell>
											<Input
												value={m.time}
												onChange={(e) =>
													updateMedication(i, "time", e.target.value)
												}
												placeholder="HH:MM"
												disabled={fieldsDisabled}
											/>
										</TableCell>
										<TableCell>
											<Input
												value={m.indication ?? ""}
												onChange={(e) =>
													updateMedication(i, "indication", e.target.value)
												}
												placeholder="Optional"
												disabled={fieldsDisabled}
											/>
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => removeMedication(i)}
												disabled={fieldsDisabled}
											>
												<Trash2 className="size-3.5 text-destructive" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Intraop Vitals */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">Intraoperative Vitals Flowsheet</CardTitle>
					<Button
						variant="outline"
						size="sm"
						onClick={addVital}
						disabled={fieldsDisabled}
					>
						<Plus className="mr-1.5 size-3.5" />
						Add Entry
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					{form.intraopVitals.length === 0 ? (
						<p className="text-muted-foreground px-4 py-6 text-center text-sm">
							No vitals recorded. Click &ldquo;Add Entry&rdquo; to begin.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Time</TableHead>
									<TableHead>BP (mmHg)</TableHead>
									<TableHead>HR (bpm)</TableHead>
									<TableHead>SpO₂ (%)</TableHead>
									<TableHead>EtCO₂ (mmHg)</TableHead>
									<TableHead>Temp (°C)</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{form.intraopVitals.map((vital, i) => (
									<TableRow key={i}>
										<TableCell>
											<Input
												value={vital.time}
												onChange={(e) =>
													updateVital(i, "time", e.target.value)
												}
												placeholder="HH:MM"
												disabled={fieldsDisabled}
											/>
										</TableCell>
										<TableCell>
											<Input
												value={vital.bp}
												onChange={(e) =>
													updateVital(i, "bp", e.target.value)
												}
												placeholder="120/80"
												disabled={fieldsDisabled}
											/>
										</TableCell>
										<TableCell>
											<Input
												type="number"
												min={0}
												value={vital.hr || ""}
												onChange={(e) =>
													updateVital(i, "hr", Number(e.target.value))
												}
												placeholder="72"
												disabled={fieldsDisabled}
											/>
										</TableCell>
										<TableCell>
											<Input
												type="number"
												min={0}
												max={100}
												value={vital.spo2 || ""}
												onChange={(e) =>
													updateVital(i, "spo2", Number(e.target.value))
												}
												placeholder="98"
												disabled={fieldsDisabled}
											/>
										</TableCell>
										<TableCell>
											<Input
												type="number"
												min={0}
												value={vital.etco2 ?? ""}
												onChange={(e) =>
													updateVital(
														i,
														"etco2",
														e.target.value
															? Number(e.target.value)
															: undefined,
													)
												}
												placeholder="35"
												disabled={fieldsDisabled}
											/>
										</TableCell>
										<TableCell>
											<Input
												type="number"
												min={30}
												max={45}
												step={0.1}
												value={vital.temp ?? ""}
												onChange={(e) =>
													updateVital(
														i,
														"temp",
														e.target.value
															? Number(e.target.value)
															: undefined,
													)
												}
												placeholder="36.5"
												disabled={fieldsDisabled}
											/>
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => removeVital(i)}
												disabled={fieldsDisabled}
											>
												<Trash2 className="size-3.5 text-destructive" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Post-op */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Post-Anesthesia</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>Reversal Agent</Label>
						<Input
							value={form.reversalAgent}
							onChange={(e) => setField("reversalAgent", e.target.value)}
							placeholder="e.g. Neostigmine"
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Total Anesthesia Time (min)</Label>
						<Input
							type="number"
							min={0}
							value={form.totalAnesthesiaMinutes}
							onChange={(e) => setField("totalAnesthesiaMinutes", e.target.value)}
							placeholder="0"
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="flex items-center gap-3">
						<Checkbox
							id="emergence-smooth"
							checked={form.emergenceSmooth ?? false}
							onCheckedChange={(v) => setField("emergenceSmooth", !!v)}
							disabled={fieldsDisabled}
						/>
						<Label htmlFor="emergence-smooth">Smooth emergence from anesthesia</Label>
					</div>
					<div className="space-y-1.5 sm:col-span-2">
						<Label>Complications</Label>
						<Textarea
							rows={2}
							value={form.complications}
							onChange={(e) => setField("complications", e.target.value)}
							placeholder="Any anesthesia-related complications…"
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5 sm:col-span-2">
						<Label>PACU Notes</Label>
						<Textarea
							rows={2}
							value={form.postAnesthesiaCareNotes}
							onChange={(e) => setField("postAnesthesiaCareNotes", e.target.value)}
							placeholder="Post-anesthesia care unit notes…"
							disabled={fieldsDisabled}
						/>
					</div>
				</CardContent>
			</Card>

			<Separator />

			<div className="flex justify-end gap-3">
				{!isSigned && (
					<Button
						onClick={() => {
							void handleSave()
						}}
						disabled={save.isPending || !canEdit || isSigned}
						variant="outline"
					>
						<Save className="mr-2 size-4" />
						{save.isPending ? "Saving…" : "Save Draft"}
					</Button>
				)}
				{canSign && !isSigned && (
					<Button
						className="bg-green-700 hover:bg-green-800"
						onClick={handleSign}
						disabled={sign.isPending || save.isPending || (!existing && !canEdit)}
					>
						<CheckCircle2 className="mr-2 size-4" />
						{sign.isPending ? "Signing…" : "Sign Anesthesia Record"}
					</Button>
				)}
			</div>

			<AlertDialog open={showSignConfirm} onOpenChange={setShowSignConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Sign and lock anesthesia record?</AlertDialogTitle>
						<AlertDialogDescription>
							Signing will permanently lock this record and cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmSign}
							className="bg-green-700 hover:bg-green-800"
						>
							Sign Record
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
