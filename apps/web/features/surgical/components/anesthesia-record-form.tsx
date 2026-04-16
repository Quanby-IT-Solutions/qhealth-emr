"use client"

import { useEffect, useState } from "react"

import { Plus, Save, Trash2 } from "lucide-react"

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
	type AirwayType,
	type AsaClass,
	type IntraopVital,
	useSaveAnesthesiaRecordMutation,
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

interface FormState {
	asaClass: AsaClass
	airwayType: AirwayType
	intubationAttempts: string
	agents: AnesthesiaAgent[]
	intraopVitals: IntraopVital[]
	reversalAgent: string
	totalAnesthesiaMinutes: string
	emergenceSmooth: boolean
	complications: string
	postAnesthesiaCareNotes: string
}

function buildInitialState(existing: AnesthesiaRecord | null | undefined): FormState {
	return {
		asaClass: existing?.asaClass ?? "ASA I",
		airwayType: existing?.airwayType ?? "oral_ett",
		intubationAttempts: existing?.intubationAttempts?.toString() ?? "1",
		agents: existing?.agents ?? [],
		intraopVitals: existing?.intraopVitals ?? [],
		reversalAgent: existing?.reversalAgent ?? "",
		totalAnesthesiaMinutes: existing?.totalAnesthesiaMinutes?.toString() ?? "",
		emergenceSmooth: existing?.emergenceSmooth ?? true,
		complications: existing?.complications ?? "",
		postAnesthesiaCareNotes: existing?.postAnesthesiaCareNotes ?? "",
	}
}

const BLANK_AGENT: AnesthesiaAgent = { name: "", dose: "", route: "", time: "" }
const BLANK_VITAL: IntraopVital = { time: "", bp: "", hr: 0, spo2: 100, etco2: undefined }

interface AnesthesiaRecordFormProps {
	caseId: string
	existing: AnesthesiaRecord | null | undefined
}

export function AnesthesiaRecordForm({ caseId, existing }: AnesthesiaRecordFormProps) {
	const [form, setForm] = useState<FormState>(() => buildInitialState(existing))
	const save = useSaveAnesthesiaRecordMutation()

	useEffect(() => {
		setForm(buildInitialState(existing))
	}, [existing])

	function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((prev) => ({ ...prev, [key]: value }))
	}

	// ── Agents ────────────────────────────────────────────────────────────────

	function addAgent() {
		setField("agents", [...form.agents, { ...BLANK_AGENT }])
	}

	function updateAgent(index: number, field: keyof AnesthesiaAgent, value: string) {
		const updated = form.agents.map((a, i) => (i === index ? { ...a, [field]: value } : a))
		setField("agents", updated)
	}

	function removeAgent(index: number) {
		setField(
			"agents",
			form.agents.filter((_, i) => i !== index),
		)
	}

	// ── Vitals ────────────────────────────────────────────────────────────────

	function addVital() {
		setField("intraopVitals", [...form.intraopVitals, { ...BLANK_VITAL }])
	}

	function updateVital(index: number, field: keyof IntraopVital, value: string | number) {
		const updated = form.intraopVitals.map((v, i) =>
			i === index ? { ...v, [field]: value } : v,
		)
		setField("intraopVitals", updated)
	}

	function removeVital(index: number) {
		setField(
			"intraopVitals",
			form.intraopVitals.filter((_, i) => i !== index),
		)
	}

	// ── Submit ─────────────────────────────────────────────────────────────────

	function handleSubmit() {
		save.mutate({
			caseId,
			asaClass: form.asaClass,
			airwayType: form.airwayType,
			intubationAttempts: Number(form.intubationAttempts) || 1,
			agents: form.agents,
			intraopVitals: form.intraopVitals,
			reversalAgent: form.reversalAgent || undefined,
			totalAnesthesiaMinutes: form.totalAnesthesiaMinutes
				? Number(form.totalAnesthesiaMinutes)
				: undefined,
			emergenceSmooth: form.emergenceSmooth,
			complications: form.complications || undefined,
			postAnesthesiaCareNotes: form.postAnesthesiaCareNotes || undefined,
		})
	}

	return (
		<div className="space-y-6">
			{/* Classification */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Patient Classification</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>ASA Physical Status Class</Label>
						<Select
							value={form.asaClass}
							onValueChange={(v) => setField("asaClass", v as AsaClass)}
						>
							<SelectTrigger>
								<SelectValue />
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
					<div className="space-y-1.5">
						<Label>Current ASA Classification</Label>
						<div className="flex h-10 items-center">
							<Badge variant="secondary" className="text-sm">
								{form.asaClass}: {ASA_DESCRIPTIONS[form.asaClass]}
							</Badge>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Airway */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Airway Management</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>Airway Device</Label>
						<Select
							value={form.airwayType}
							onValueChange={(v) => setField("airwayType", v as AirwayType)}
						>
							<SelectTrigger>
								<SelectValue />
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
						<Label>Intubation Attempts</Label>
						<Input
							type="number"
							min={1}
							value={form.intubationAttempts}
							onChange={(e) => setField("intubationAttempts", e.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Agents */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">Anesthetic Agents</CardTitle>
					<Button variant="outline" size="sm" onClick={addAgent}>
						<Plus className="mr-1.5 size-3.5" />
						Add Agent
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					{form.agents.length === 0 ? (
						<p className="text-muted-foreground px-4 py-6 text-center text-sm">
							No agents added. Click &ldquo;Add Agent&rdquo; to begin.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Agent Name</TableHead>
									<TableHead>Dose</TableHead>
									<TableHead>Route</TableHead>
									<TableHead>Time</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{form.agents.map((agent, i) => (
									<TableRow key={i}>
										<TableCell>
											<Input
												value={agent.name}
												onChange={(e) =>
													updateAgent(i, "name", e.target.value)
												}
												placeholder="e.g. Propofol"
											/>
										</TableCell>
										<TableCell>
											<Input
												value={agent.dose}
												onChange={(e) =>
													updateAgent(i, "dose", e.target.value)
												}
												placeholder="e.g. 2 mg/kg"
											/>
										</TableCell>
										<TableCell>
											<Input
												value={agent.route}
												onChange={(e) =>
													updateAgent(i, "route", e.target.value)
												}
												placeholder="e.g. IV"
											/>
										</TableCell>
										<TableCell>
											<Input
												value={agent.time}
												onChange={(e) =>
													updateAgent(i, "time", e.target.value)
												}
												placeholder="HH:MM"
											/>
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => removeAgent(i)}
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
					<CardTitle className="text-base">Intraoperative Vitals Timeline</CardTitle>
					<Button variant="outline" size="sm" onClick={addVital}>
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
											/>
										</TableCell>
										<TableCell>
											<Input
												value={vital.bp}
												onChange={(e) =>
													updateVital(i, "bp", e.target.value)
												}
												placeholder="120/80"
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
											/>
										</TableCell>
										<TableCell>
											<Input
												type="number"
												min={0}
												max={100}
												value={vital.spo2 || ""}
												onChange={(e) =>
													updateVital(
														i,
														"spo2",
														Number(e.target.value),
													)
												}
												placeholder="98"
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
														e.target.value ? Number(e.target.value) : undefined as unknown as number,
													)
												}
												placeholder="35"
											/>
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => removeVital(i)}
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
						/>
					</div>
					<div className="flex items-center gap-3">
						<Checkbox
							id="emergence-smooth"
							checked={form.emergenceSmooth}
							onCheckedChange={(v) => setField("emergenceSmooth", !!v)}
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
						/>
					</div>
					<div className="space-y-1.5 sm:col-span-2">
						<Label>PACU Notes</Label>
						<Textarea
							rows={2}
							value={form.postAnesthesiaCareNotes}
							onChange={(e) => setField("postAnesthesiaCareNotes", e.target.value)}
							placeholder="Post-anesthesia care unit notes…"
						/>
					</div>
				</CardContent>
			</Card>

			<Separator />

			<div className="flex justify-end">
				<Button onClick={handleSubmit} disabled={save.isPending}>
					<Save className="mr-2 size-4" />
					{save.isPending ? "Saving…" : "Save Anesthesia Record"}
				</Button>
			</div>
		</div>
	)
}
