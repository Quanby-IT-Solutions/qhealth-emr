"use client"

import { useEffect, useState } from "react"

import { Save } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"

import { type OperationRecord, useSaveOperationRecordMutation } from "../api/surgical.hooks"

interface OperationRecordFormProps {
	caseId: string
	surgeonStaffId: string
	existing: OperationRecord | null | undefined
	canEdit?: boolean
}

interface FormState {
	preOpDiagnosis: string
	postOpDiagnosis: string
	procedurePerformed: string
	operativeTechnique: string
	findings: string
	specimens: string
	estimatedBloodLoss: string
	fluidIn: string
	fluidOut: string
	incisionDatetime: string
	closureDatetime: string
	firstAssistantStaffId: string
	secondAssistantStaffId: string
	scrubNurseStaffId: string
	circulatingNurseStaffId: string
	instrumentCountCorrect: boolean
	swabCountCorrect: boolean
	complications: string
}

function buildInitialState(existing: OperationRecord | null | undefined): FormState {
	return {
		preOpDiagnosis: existing?.preOpDiagnosis ?? "",
		postOpDiagnosis: existing?.postOpDiagnosis ?? "",
		procedurePerformed: existing?.procedurePerformed ?? "",
		operativeTechnique: existing?.operativeTechnique ?? "",
		findings: existing?.findings ?? "",
		specimens: existing?.specimens ?? "",
		estimatedBloodLoss: existing?.estimatedBloodLoss?.toString() ?? "",
		fluidIn: existing?.fluidIn?.toString() ?? "",
		fluidOut: existing?.fluidOut?.toString() ?? "",
		incisionDatetime: existing?.incisionDatetime?.slice(0, 16) ?? "",
		closureDatetime: existing?.closureDatetime?.slice(0, 16) ?? "",
		firstAssistantStaffId: existing?.firstAssistantStaffId ?? "",
		secondAssistantStaffId: existing?.secondAssistantStaffId ?? "",
		scrubNurseStaffId: existing?.scrubNurseStaffId ?? "",
		circulatingNurseStaffId: existing?.circulatingNurseStaffId ?? "",
		instrumentCountCorrect: existing?.instrumentCountCorrect ?? false,
		swabCountCorrect: existing?.swabCountCorrect ?? false,
		complications: existing?.complications ?? "",
	}
}

export function OperationRecordForm({ caseId, surgeonStaffId, existing, canEdit = true }: OperationRecordFormProps) {
	const [form, setForm] = useState<FormState>(() => buildInitialState(existing))
	const save = useSaveOperationRecordMutation()

	useEffect(() => {
		setForm(buildInitialState(existing))
	}, [existing])

	function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((prev) => ({ ...prev, [key]: value }))
	}

	function handleSubmit() {
		save.mutate({
			caseId,
			surgeonStaffId,
			preOpDiagnosis: form.preOpDiagnosis,
			postOpDiagnosis: form.postOpDiagnosis || undefined,
			procedurePerformed: form.procedurePerformed,
			operativeTechnique: form.operativeTechnique || undefined,
			findings: form.findings || undefined,
			specimens: form.specimens || undefined,
			estimatedBloodLoss: form.estimatedBloodLoss ? Number(form.estimatedBloodLoss) : undefined,
			fluidIn: form.fluidIn ? Number(form.fluidIn) : undefined,
			fluidOut: form.fluidOut ? Number(form.fluidOut) : undefined,
			incisionDatetime: form.incisionDatetime || undefined,
			closureDatetime: form.closureDatetime || undefined,
			firstAssistantStaffId: form.firstAssistantStaffId || undefined,
			secondAssistantStaffId: form.secondAssistantStaffId || undefined,
			scrubNurseStaffId: form.scrubNurseStaffId || undefined,
			circulatingNurseStaffId: form.circulatingNurseStaffId || undefined,
			instrumentCountCorrect: form.instrumentCountCorrect,
			swabCountCorrect: form.swabCountCorrect,
			complications: form.complications || undefined,
		})
	}

	const canSubmit =
		form.preOpDiagnosis.trim() && form.procedurePerformed.trim() && !save.isPending

	return (
		<div className="space-y-6">
			{/* Diagnoses */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Diagnoses</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>
							Pre-operative Diagnosis <span className="text-destructive">*</span>
						</Label>
						<Textarea
							rows={2}
							value={form.preOpDiagnosis}
							onChange={(e) => setField("preOpDiagnosis", e.target.value)}
							placeholder="Pre-op diagnosis"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Post-operative Diagnosis</Label>
						<Textarea
							rows={2}
							value={form.postOpDiagnosis}
							onChange={(e) => setField("postOpDiagnosis", e.target.value)}
							placeholder="Post-op diagnosis"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Procedure */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Procedure Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-1.5">
						<Label>
							Procedure Performed <span className="text-destructive">*</span>
						</Label>
						<Input
							value={form.procedurePerformed}
							onChange={(e) => setField("procedurePerformed", e.target.value)}
							placeholder="e.g. Laparoscopic appendectomy"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Operative Technique</Label>
						<Textarea
							rows={4}
							value={form.operativeTechnique}
							onChange={(e) => setField("operativeTechnique", e.target.value)}
							placeholder="Describe operative technique…"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Findings</Label>
						<Textarea
							rows={3}
							value={form.findings}
							onChange={(e) => setField("findings", e.target.value)}
							placeholder="Intraoperative findings…"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Specimens Sent</Label>
						<Textarea
							rows={2}
							value={form.specimens}
							onChange={(e) => setField("specimens", e.target.value)}
							placeholder="Specimen type and destination…"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Complications</Label>
						<Textarea
							rows={2}
							value={form.complications}
							onChange={(e) => setField("complications", e.target.value)}
							placeholder="Note any intraoperative complications…"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Fluid & Blood */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Fluid Balance & Times</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="space-y-1.5">
						<Label>EBL (mL)</Label>
						<Input
							type="number"
							min={0}
							value={form.estimatedBloodLoss}
							onChange={(e) => setField("estimatedBloodLoss", e.target.value)}
							placeholder="0"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Fluid In (mL)</Label>
						<Input
							type="number"
							min={0}
							value={form.fluidIn}
							onChange={(e) => setField("fluidIn", e.target.value)}
							placeholder="0"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Fluid Out (mL)</Label>
						<Input
							type="number"
							min={0}
							value={form.fluidOut}
							onChange={(e) => setField("fluidOut", e.target.value)}
							placeholder="0"
						/>
					</div>
					<div className="col-span-full grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label>Incision Time</Label>
							<Input
								type="datetime-local"
								value={form.incisionDatetime}
								onChange={(e) => setField("incisionDatetime", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Closure Time</Label>
							<Input
								type="datetime-local"
								value={form.closureDatetime}
								onChange={(e) => setField("closureDatetime", e.target.value)}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Personnel */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Surgical Team</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>1st Assistant Staff ID</Label>
						<Input
							value={form.firstAssistantStaffId}
							onChange={(e) => setField("firstAssistantStaffId", e.target.value)}
							placeholder="Staff ID"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>2nd Assistant Staff ID</Label>
						<Input
							value={form.secondAssistantStaffId}
							onChange={(e) => setField("secondAssistantStaffId", e.target.value)}
							placeholder="Staff ID"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Scrub Nurse Staff ID</Label>
						<Input
							value={form.scrubNurseStaffId}
							onChange={(e) => setField("scrubNurseStaffId", e.target.value)}
							placeholder="Staff ID"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Circulating Nurse Staff ID</Label>
						<Input
							value={form.circulatingNurseStaffId}
							onChange={(e) => setField("circulatingNurseStaffId", e.target.value)}
							placeholder="Staff ID"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Safety Counts */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Surgical Safety Counts</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center gap-3">
						<Checkbox
							id="instrument-count"
							checked={form.instrumentCountCorrect}
							onCheckedChange={(v) => setField("instrumentCountCorrect", !!v)}
						/>
						<Label htmlFor="instrument-count">Instrument count correct</Label>
					</div>
					<div className="flex items-center gap-3">
						<Checkbox
							id="swab-count"
							checked={form.swabCountCorrect}
							onCheckedChange={(v) => setField("swabCountCorrect", !!v)}
						/>
						<Label htmlFor="swab-count">Swab/sponge count correct</Label>
					</div>
				</CardContent>
			</Card>

			<Separator />

			<div className="flex justify-end">
				<Button onClick={handleSubmit} disabled={!canSubmit || !canEdit}>
					<Save className="mr-2 size-4" />
					{save.isPending ? "Saving…" : "Save Operation Record"}
				</Button>
			</div>
		</div>
	)
}
