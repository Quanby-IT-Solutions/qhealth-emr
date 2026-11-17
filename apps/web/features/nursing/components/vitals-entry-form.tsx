"use client"

import { useEffect, useRef, useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { cn } from "@/core/lib/utils"
import { FaceScanVitalsButton } from "@/features/face-scan/components/face-scan-vitals-button"
import { toNursingFields, type FaceScanVitals } from "@/features/face-scan/lib/face-scan-vitals"
import {
	formatHeightFromCm,
	formatWeightFromKg,
	heightCmToFeetInches,
	isValidHeightCm,
	isValidWeightKg,
	parseHeightToCm,
	parseWeightToKg,
	type HeightUnit,
	type WeightUnit,
} from "@/features/face-scan/lib/measurement-units"
import { useCreateVitalMutation, useVitalsQuery } from "@/features/nursing/api/nursing.hooks"

import {
	ACVPU_OPTIONS,
	computeNewsScore,
	NewsScoreBadge,
	type AcvpuLevel,
} from "./news-score-badge"

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

export const EMPTY_VITAL_FIELDS = {
	temperature: "",
	bpSystolic: "",
	bpDiastolic: "",
	heartRate: "",
	respiratoryRate: "",
	spo2: "",
	spo2Scale: "scale1" as "scale1" | "scale2",
	oxygenTherapy: false,
	oxygenDeliveryDevice: "",
	oxygenFlowRate: "",
	weight: "",
	weightUnit: "kg" as WeightUnit,
	height: "",
	heightUnit: "cm" as HeightUnit,
	heightFeet: "",
	heightInches: "",
	consciousnessLevel: "A" as AcvpuLevel,
}

type VitalFieldKey = keyof typeof EMPTY_VITAL_FIELDS
export type VitalFormFields = typeof EMPTY_VITAL_FIELDS

export function mergeFaceScanIntoVitalFields(
	prev: VitalFormFields,
	vitals: FaceScanVitals
): { fields: VitalFormFields; highlightedKeys: string[] } {
	const mapped = toNursingFields(vitals)
	const highlightedKeys = Object.entries(mapped)
		.filter(([, v]) => v)
		.map(([k]) => k)
	return {
		highlightedKeys,
		fields: {
			...prev,
			...(mapped.bpSystolic ? { bpSystolic: mapped.bpSystolic } : {}),
			...(mapped.bpDiastolic ? { bpDiastolic: mapped.bpDiastolic } : {}),
			...(mapped.heartRate ? { heartRate: mapped.heartRate } : {}),
			...(mapped.respiratoryRate ? { respiratoryRate: mapped.respiratoryRate } : {}),
			...(mapped.spo2 ? { spo2: mapped.spo2 } : {}),
			...(mapped.height
				? {
						height: mapped.height,
						heightUnit: "cm" as HeightUnit,
						heightFeet: "",
						heightInches: "",
					}
				: {}),
			...(mapped.weight ? { weight: mapped.weight, weightUnit: "kg" as WeightUnit } : {}),
		},
	}
}

interface SavedVitalSign {
	id: string
	temperature: string | null
	bpSystolic: number | null
	bpDiastolic: number | null
	heartRate: number | null
	respiratoryRate: number | null
	spo2: string | null
	spo2Scale?: "scale1" | "scale2"
	oxygenTherapy?: boolean
	oxygenDeliveryDevice?: string | null
	oxygenFlowRate?: string | null
	weight: string | null
	height: string | null
	consciousnessLevel?: AcvpuLevel
	recordedAt: string
}

export function vitalSignToFormFields(vital: SavedVitalSign): Partial<VitalFormFields> {
	return {
		temperature: vital.temperature ?? "",
		bpSystolic: vital.bpSystolic != null ? String(vital.bpSystolic) : "",
		bpDiastolic: vital.bpDiastolic != null ? String(vital.bpDiastolic) : "",
		heartRate: vital.heartRate != null ? String(vital.heartRate) : "",
		respiratoryRate: vital.respiratoryRate != null ? String(vital.respiratoryRate) : "",
		spo2: vital.spo2 ?? "",
		spo2Scale: vital.spo2Scale ?? "scale1",
		oxygenTherapy: vital.oxygenTherapy ?? false,
		oxygenDeliveryDevice: vital.oxygenDeliveryDevice ?? "",
		oxygenFlowRate: vital.oxygenFlowRate ?? "",
		weight: vital.weight ?? "",
		weightUnit: "kg",
		height: vital.height ?? "",
		heightUnit: "cm",
		heightFeet: "",
		heightInches: "",
		consciousnessLevel: vital.consciousnessLevel ?? "A",
	}
}

function getLatestVital(vitals: SavedVitalSign[] | undefined): SavedVitalSign | undefined {
	if (!vitals?.length) return undefined
	return vitals.reduce((latest, vital) =>
		new Date(vital.recordedAt).getTime() > new Date(latest.recordedAt).getTime() ? vital : latest
	)
}

interface VitalsEntryFormContentProps {
	open: boolean
	encounterId: string
	facilityId: string
	faceScanAge?: number
	initialFields?: Partial<VitalFormFields>
	onSuccess?: () => void
	onCancel?: () => void
}

function VitalsEntryFormContent({
	open,
	encounterId,
	facilityId,
	faceScanAge,
	initialFields,
	onSuccess,
	onCancel,
}: VitalsEntryFormContentProps) {
	const [fields, setFields] = useState<VitalFormFields>(EMPTY_VITAL_FIELDS)
	const [highlightedFields, setHighlightedFields] = useState<Set<string>>(() => new Set())
	const lastPrefillKey = useRef<string | null>(null)
	const createVital = useCreateVitalMutation()
	const savedVitalsQuery = useVitalsQuery(
		{ encounterId, facilityId },
		{ enabled: open && !!encounterId && !!facilityId }
	)
	const standardWeightKg = parseWeightToKg(fields.weight, fields.weightUnit)
	const standardHeightCm = parseHeightToCm({
		unit: fields.heightUnit,
		cm: fields.height,
		feet: fields.heightFeet,
		inches: fields.heightInches,
	})

	useEffect(() => {
		if (!open) {
			lastPrefillKey.current = null
			return
		}

		const latest = getLatestVital(savedVitalsQuery.data?.data)
		const prefillKey = initialFields ? "initial" : (latest?.id ?? "empty")
		if (lastPrefillKey.current === prefillKey) return
		lastPrefillKey.current = prefillKey

		const prefill = initialFields ?? (latest ? vitalSignToFormFields(latest) : {})
		setFields({ ...EMPTY_VITAL_FIELDS, ...prefill })
		setHighlightedFields(new Set())
	}, [open, initialFields, savedVitalsQuery.data])

	const newsResult = computeNewsScore({
		respiratoryRate: fields.respiratoryRate ? Number(fields.respiratoryRate) : null,
		spo2: fields.spo2 ? Number(fields.spo2) : null,
		spo2Scale: fields.spo2Scale,
		oxygenTherapy: fields.oxygenTherapy,
		temperature: fields.temperature ? Number(fields.temperature) : null,
		bpSystolic: fields.bpSystolic ? Number(fields.bpSystolic) : null,
		heartRate: fields.heartRate ? Number(fields.heartRate) : null,
		consciousnessLevel: fields.consciousnessLevel,
	})

	const hasVitalData =
		fields.respiratoryRate ||
		fields.spo2 ||
		fields.temperature ||
		fields.bpSystolic ||
		fields.heartRate ||
		fields.oxygenTherapy ||
		fields.consciousnessLevel !== "A"

	function handleChange<K extends VitalFieldKey>(key: K, value: VitalFormFields[K]) {
		setFields(prev => ({ ...prev, [key]: value }))
	}

	function handleWeightUnitChange(unit: WeightUnit) {
		setFields(prev => {
			const weightKg = parseWeightToKg(prev.weight, prev.weightUnit)
			return {
				...prev,
				weightUnit: unit,
				weight: weightKg !== undefined ? formatWeightFromKg(weightKg, unit) : "",
			}
		})
	}

	function handleHeightUnitChange(unit: HeightUnit) {
		setFields(prev => {
			const heightCm = parseHeightToCm({
				unit: prev.heightUnit,
				cm: prev.height,
				feet: prev.heightFeet,
				inches: prev.heightInches,
			})
			if (unit === "cm") {
				return {
					...prev,
					heightUnit: unit,
					height: heightCm !== undefined ? formatHeightFromCm(heightCm) : "",
					heightFeet: "",
					heightInches: "",
				}
			}
			const { feet, inches } = heightCmToFeetInches(heightCm)
			return {
				...prev,
				heightUnit: unit,
				height: "",
				heightFeet: feet,
				heightInches: inches,
			}
		})
	}

	function fieldClass(key: string) {
		return highlightedFields.has(key) ? "ring-primary/40 ring-2 transition-shadow" : undefined
	}

	function applyFaceScanVitals(vitals: FaceScanVitals) {
		const { fields: merged, highlightedKeys } = mergeFaceScanIntoVitalFields(fields, vitals)
		setFields(merged)
		setHighlightedFields(new Set(highlightedKeys))
		window.setTimeout(() => setHighlightedFields(new Set()), 2000)
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
				respiratoryRate: fields.respiratoryRate ? Number(fields.respiratoryRate) : undefined,
				spo2: fields.spo2 ? Number(fields.spo2) : undefined,
				spo2Scale: fields.spo2Scale,
				oxygenTherapy: fields.oxygenTherapy,
				oxygenDeliveryDevice:
					fields.oxygenTherapy && fields.oxygenDeliveryDevice.trim()
						? fields.oxygenDeliveryDevice.trim()
						: undefined,
				oxygenFlowRate:
					fields.oxygenTherapy && fields.oxygenFlowRate ? Number(fields.oxygenFlowRate) : undefined,
				weight:
					standardWeightKg !== undefined && isValidWeightKg(standardWeightKg)
						? Number(standardWeightKg.toFixed(1))
						: undefined,
				height:
					standardHeightCm !== undefined && isValidHeightCm(standardHeightCm)
						? Number(standardHeightCm.toFixed(1))
						: undefined,
				consciousnessLevel: fields.consciousnessLevel,
			},
			{
				onSuccess: () => {
					onSuccess?.()
				},
			}
		)
	}

	return (
		<div className="space-y-4">
			<div className="border-border flex flex-col gap-2 rounded-md border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-muted-foreground text-xs">
					Camera-estimated vitals — review before saving.
				</p>
				<FaceScanVitalsButton
					facilityId={facilityId}
					encounterId={encounterId}
					age={faceScanAge}
					onComplete={applyFaceScanVitals}
				/>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				{hasVitalData && (
					<div className="bg-muted/50 flex items-center gap-3 rounded-md p-3">
						<span className="text-sm font-medium">Calculated NEWS:</span>
						<NewsScoreBadge score={newsResult.score} riskLevel={newsResult.riskLevel} />
					</div>
				)}

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
						<Label htmlFor="heartRate">Heart Rate (bpm)</Label>
						<Input
							id="heartRate"
							type="number"
							placeholder="70"
							value={fields.heartRate}
							className={fieldClass("heartRate")}
							onChange={e => handleChange("heartRate", e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="bpSystolic">BP Systolic (mmHg)</Label>
						<Input
							id="bpSystolic"
							type="number"
							placeholder="120"
							value={fields.bpSystolic}
							className={fieldClass("bpSystolic")}
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
							className={fieldClass("bpDiastolic")}
							onChange={e => handleChange("bpDiastolic", e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="respiratoryRate">Resp Rate (/min)</Label>
						<Input
							id="respiratoryRate"
							type="number"
							placeholder="16"
							value={fields.respiratoryRate}
							className={fieldClass("respiratoryRate")}
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
							className={fieldClass("spo2")}
							onChange={e => handleChange("spo2", e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="spo2Scale">SpO₂ Scale</Label>
						<Select
							value={fields.spo2Scale}
							onValueChange={value =>
								handleChange("spo2Scale", (value ?? "scale1") as VitalFormFields["spo2Scale"])
							}
						>
							<SelectTrigger id="spo2Scale" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="scale1">Scale 1</SelectItem>
								<SelectItem value="scale2">Scale 2</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Supplemental Oxygen</Label>
						<div className="mt-1 flex flex-wrap gap-2">
							<Button
								type="button"
								variant={fields.oxygenTherapy ? "default" : "outline"}
								size="sm"
								onClick={() => handleChange("oxygenTherapy", true)}
							>
								On oxygen
							</Button>
							<Button
								type="button"
								variant={!fields.oxygenTherapy ? "default" : "outline"}
								size="sm"
								onClick={() => handleChange("oxygenTherapy", false)}
							>
								Room air
							</Button>
						</div>
					</div>
					{fields.oxygenTherapy && (
						<div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
							<div>
								<Label htmlFor="oxygenDeliveryDevice">Oxygen Device</Label>
								<Input
									id="oxygenDeliveryDevice"
									placeholder="Nasal cannula"
									value={fields.oxygenDeliveryDevice}
									onChange={e => handleChange("oxygenDeliveryDevice", e.target.value)}
								/>
							</div>
							<div>
								<Label htmlFor="oxygenFlowRate">L/min</Label>
								<Input
									id="oxygenFlowRate"
									type="number"
									step="0.1"
									min="0"
									placeholder="2"
									value={fields.oxygenFlowRate}
									onChange={e => handleChange("oxygenFlowRate", e.target.value)}
								/>
							</div>
						</div>
					)}
					<div>
						<Label htmlFor="weight">Weight</Label>
						<div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-8 min-w-0 rounded-lg border bg-transparent transition-colors focus-within:ring-[3px]">
							<Input
								id="weight"
								type="number"
								step="0.1"
								min={fields.weightUnit === "kg" ? 10 : 22}
								max={fields.weightUnit === "kg" ? 500 : 1100}
								placeholder={fields.weightUnit === "kg" ? "70" : "154"}
								value={fields.weight}
								className="h-full flex-1 rounded-r-none border-0 focus-visible:ring-0"
								onChange={e => handleChange("weight", e.target.value)}
							/>
							<Select
								value={fields.weightUnit}
								onValueChange={value => handleWeightUnitChange(value as WeightUnit)}
							>
								<SelectTrigger
									aria-label="Unit selector"
									className="h-full w-20 shrink-0 rounded-none rounded-r-lg border-0 border-l px-2 focus-visible:ring-0"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="kg">kg</SelectItem>
									<SelectItem value="lb">lb</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div>
						<Label htmlFor="height">Height</Label>
						<div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-8 min-w-0 rounded-lg border bg-transparent transition-colors focus-within:ring-[3px]">
							{fields.heightUnit === "cm" ? (
								<Input
									id="height"
									type="number"
									step="0.1"
									min={50}
									max={300}
									placeholder="170"
									value={fields.height}
									className="h-full flex-1 rounded-r-none border-0 focus-visible:ring-0"
									onChange={e => handleChange("height", e.target.value)}
								/>
							) : (
								<div className="grid min-w-0 flex-1 grid-cols-2">
									<Input
										id="height"
										type="number"
										min={1}
										max={9}
										placeholder="5 ft"
										value={fields.heightFeet}
										className="h-full rounded-none border-0 focus-visible:ring-0"
										onChange={e => handleChange("heightFeet", e.target.value)}
									/>
									<Input
										aria-label="Height inches"
										type="number"
										min={0}
										max={11}
										step="0.1"
										placeholder="7 in"
										value={fields.heightInches}
										className="h-full rounded-none border-0 border-l focus-visible:ring-0"
										onChange={e => handleChange("heightInches", e.target.value)}
									/>
								</div>
							)}
							<Select
								value={fields.heightUnit}
								onValueChange={value => handleHeightUnitChange(value as HeightUnit)}
							>
								<SelectTrigger
									aria-label="Unit selector"
									className="h-full w-20 shrink-0 rounded-none rounded-r-lg border-0 border-l px-2 focus-visible:ring-0"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="cm">cm</SelectItem>
									<SelectItem value="ft-in">ft/in</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				<div>
					<Label>Consciousness (ACVPU)</Label>
					<div className="mt-1 flex flex-wrap gap-2">
						{ACVPU_OPTIONS.map(({ level, label }) => (
							<button
								key={level}
								type="button"
								onClick={() => handleChange("consciousnessLevel", level)}
								className={cn(
									"rounded-md border px-3 py-1 text-sm",
									fields.consciousnessLevel === level
										? "bg-primary text-primary-foreground border-primary"
										: "bg-background text-foreground hover:bg-muted"
								)}
							>
								{label}
							</button>
						))}
					</div>
				</div>

				<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
					{onCancel && (
						<Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancel}>
							Cancel
						</Button>
					)}
					<Button
						type="submit"
						className="w-full sm:w-auto"
						disabled={createVital.isPending || !hasVitalData}
					>
						{createVital.isPending ? "Saving…" : "Save Vitals"}
					</Button>
				</div>
			</form>
		</div>
	)
}

interface VitalsEntryFormProps {
	encounterId: string
	facilityId: string
	open: boolean
	onOpenChange: (open: boolean) => void
	faceScanAge?: number
	initialFields?: Partial<VitalFormFields>
}

/** Dialog wrapper for Record Vitals (nursing tab, clinic queue, etc.). */
export function VitalsEntryForm({
	encounterId,
	facilityId,
	open,
	onOpenChange,
	faceScanAge,
	initialFields,
}: VitalsEntryFormProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[calc(100vw-1rem)] max-w-none sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Record Vital Signs</DialogTitle>
				</DialogHeader>
				<VitalsEntryFormContent
					open={open}
					encounterId={encounterId}
					facilityId={facilityId}
					faceScanAge={faceScanAge}
					initialFields={initialFields}
					onSuccess={() => onOpenChange(false)}
					onCancel={() => onOpenChange(false)}
				/>
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
								<TableHead>O₂</TableHead>
								<TableHead>ACVPU</TableHead>
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
									<TableCell>
										{v.oxygenTherapy
											? [
													v.oxygenDeliveryDevice,
													v.oxygenFlowRate ? `${v.oxygenFlowRate} L/min` : null,
												]
													.filter(Boolean)
													.join(" · ") || "Yes"
											: "Room air"}
									</TableCell>
									<TableCell>{v.consciousnessLevel ?? "—"}</TableCell>
									<TableCell>
										<NewsScoreBadge score={v.newsScore} riskLevel={v.newsRiskLevel} />
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
