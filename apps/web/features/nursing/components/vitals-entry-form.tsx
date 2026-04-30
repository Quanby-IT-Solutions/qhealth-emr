"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useCreateVitalMutation, useVitalsQuery } from "@/features/nursing/api/nursing.hooks"

import { NewsScoreBadge, computeNewsScore } from "./news-score-badge"

function formatDateTime(dateStr: string | null | undefined) {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

interface VitalsEntryFormProps {
	encounterId: string
	facilityId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

const EMPTY_FIELDS = {
	temperature: "",
	bpSystolic: "",
	bpDiastolic: "",
	heartRate: "",
	respiratoryRate: "",
	spo2: "",
	painScore: "",
	gcs: "",
	weight: "",
	height: "",
	consciousnessAlert: true,
}

export function VitalsEntryForm({
	encounterId,
	facilityId,
	open,
	onOpenChange,
}: VitalsEntryFormProps) {
	const [fields, setFields] = useState(EMPTY_FIELDS)
	const createVital = useCreateVitalMutation()

	const newsResult = computeNewsScore({
		respiratoryRate: fields.respiratoryRate ? Number(fields.respiratoryRate) : null,
		spo2: fields.spo2 ? Number(fields.spo2) : null,
		temperature: fields.temperature ? Number(fields.temperature) : null,
		bpSystolic: fields.bpSystolic ? Number(fields.bpSystolic) : null,
		heartRate: fields.heartRate ? Number(fields.heartRate) : null,
		consciousnessAlert: fields.consciousnessAlert,
	})

	const hasVitalData =
		fields.respiratoryRate ||
		fields.spo2 ||
		fields.temperature ||
		fields.bpSystolic ||
		fields.heartRate

	function handleChange(key: keyof typeof EMPTY_FIELDS, value: string | boolean) {
		setFields(prev => ({ ...prev, [key]: value }))
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		createVital.mutate(
			{
				facilityId,
				encounterId,
				temperature: fields.temperature ? Number(fields.temperature) : undefined,
				bpSystolic: fields.bpSystolic ? Number(fields.bpSystolic) : undefined,
				bpDiastolic: fields.bpDiastolic ? Number(fields.bpDiastolic) : undefined,
				heartRate: fields.heartRate ? Number(fields.heartRate) : undefined,
				respiratoryRate: fields.respiratoryRate
					? Number(fields.respiratoryRate)
					: undefined,
				spo2: fields.spo2 ? Number(fields.spo2) : undefined,
				painScore: fields.painScore ? Number(fields.painScore) : undefined,
				weight: fields.weight ? Number(fields.weight) : undefined,
				height: fields.height ? Number(fields.height) : undefined,
			},
			{
				onSuccess: () => {
					setFields(EMPTY_FIELDS)
					onOpenChange(false)
				},
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Record Vital Signs</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Live NEWS display */}
					{hasVitalData && (
						<div className="bg-muted/50 flex items-center gap-3 rounded-md p-3">
							<span className="text-sm font-medium">Calculated NEWS:</span>
							<NewsScoreBadge score={newsResult.score} riskLevel={newsResult.riskLevel} />
						</div>
					)}

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label htmlFor="temperature">Temperature (°C)</Label>
							<Input
								id="temperature"
								type="number"
								step="0.1"
								placeholder="36.5"
								value={fields.temperature}
								onChange={e => handleChange("temperature", e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="bpSystolic">BP Systolic (mmHg)</Label>
							<Input
								id="bpSystolic"
								type="number"
								placeholder="120"
								value={fields.bpSystolic}
								onChange={e => handleChange("bpSystolic", e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="bpDiastolic">BP Diastolic (mmHg)</Label>
							<Input
								id="bpDiastolic"
								type="number"
								placeholder="80"
								value={fields.bpDiastolic}
								onChange={e => handleChange("bpDiastolic", e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="heartRate">Heart Rate (bpm)</Label>
							<Input
								id="heartRate"
								type="number"
								placeholder="70"
								value={fields.heartRate}
								onChange={e => handleChange("heartRate", e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="respiratoryRate">Resp Rate (/min)</Label>
							<Input
								id="respiratoryRate"
								type="number"
								placeholder="16"
								value={fields.respiratoryRate}
								onChange={e => handleChange("respiratoryRate", e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="spo2">SpO₂ (%)</Label>
							<Input
								id="spo2"
								type="number"
								step="0.1"
								min="0"
								max="100"
								placeholder="98"
								value={fields.spo2}
								onChange={e => handleChange("spo2", e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="painScore">Pain Score (0–10)</Label>
							<Input
								id="painScore"
								type="number"
								min="0"
								max="10"
								placeholder="0"
								value={fields.painScore}
								onChange={e => handleChange("painScore", e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="gcs">GCS (3–15)</Label>
							<Input
								id="gcs"
								type="number"
								min="3"
								max="15"
								placeholder="15"
								value={fields.gcs}
								onChange={e => handleChange("gcs", e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="weight">Weight (kg)</Label>
							<Input
								id="weight"
								type="number"
								step="0.1"
								placeholder="70"
								value={fields.weight}
								onChange={e => handleChange("weight", e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="height">Height (cm)</Label>
							<Input
								id="height"
								type="number"
								placeholder="170"
								value={fields.height}
								onChange={e => handleChange("height", e.target.value)}
							/>
						</div>
					</div>

					{/* Consciousness (AVPU) */}
					<div>
						<Label>Consciousness (AVPU)</Label>
						<div className="mt-1 flex gap-2">
							{(["Alert", "Voice", "Pain", "Unresponsive"] as const).map(level => (
								<button
									key={level}
									type="button"
									onClick={() =>
										handleChange("consciousnessAlert", level === "Alert")
									}
									className={`rounded-md border px-3 py-1 text-sm ${
										(level === "Alert") === fields.consciousnessAlert
											? "bg-primary text-primary-foreground border-primary"
											: "bg-background text-foreground hover:bg-muted"
									}`}
								>
									{level}
								</button>
							))}
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={createVital.isPending}>
							{createVital.isPending ? "Saving…" : "Save Vitals"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}

// ============================================================================
// Vitals history table (used in vitals tab panel)
// ============================================================================

interface VitalsPanelProps {
	encounterId: string
	facilityId: string
	readOnly?: boolean
}

export function VitalsPanel({ encounterId, facilityId, readOnly }: VitalsPanelProps) {
	const [open, setOpen] = useState(false)
	const vitals = useVitalsQuery({ encounterId, facilityId })

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Vital Signs</h3>
				{!readOnly && (
					<Button size="sm" onClick={() => setOpen(true)}>
						Record Vitals
					</Button>
				)}
			</div>

			{!readOnly && (
				<VitalsEntryForm
					encounterId={encounterId}
					facilityId={facilityId}
					open={open}
					onOpenChange={setOpen}
				/>
			)}

			{vitals.isLoading ? (
				<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
			) : !vitals.data?.data?.length ? (
				<div className="text-muted-foreground py-8 text-center text-sm">
					No vital signs recorded yet.
				</div>
			) : (
				<div className="overflow-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Recorded</TableHead>
								<TableHead>Temp (°C)</TableHead>
								<TableHead>BP</TableHead>
								<TableHead>HR</TableHead>
								<TableHead>RR</TableHead>
								<TableHead>SpO₂</TableHead>
								<TableHead>Pain</TableHead>
								<TableHead>NEWS</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{vitals.data.data.map(v => (
								<TableRow key={v.id}>
									<TableCell className="whitespace-nowrap">
										{formatDateTime(v.recordedAt)}
									</TableCell>
									<TableCell>{v.temperature ?? "—"}</TableCell>
									<TableCell>
										{v.bpSystolic != null && v.bpDiastolic != null
											? `${v.bpSystolic}/${v.bpDiastolic}`
											: "—"}
									</TableCell>
									<TableCell>{v.heartRate ?? "—"}</TableCell>
									<TableCell>{v.respiratoryRate ?? "—"}</TableCell>
									<TableCell>{v.spo2 != null ? `${v.spo2}%` : "—"}</TableCell>
									<TableCell>{v.painScore ?? "—"}</TableCell>
									<TableCell>
										<NewsScoreBadge
											score={v.newsScore}
											riskLevel={v.newsRiskLevel}
										/>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	)
}
