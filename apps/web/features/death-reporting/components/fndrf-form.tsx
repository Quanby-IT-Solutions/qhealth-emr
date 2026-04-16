"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { CheckCircle2, RefreshCw } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import type { CreateFndrfInput } from "@/features/death-reporting/api/death-reporting.hooks"
import {
	useCreateFndrfMutation,
	useFndrfQuery,
	useUpdateFndrfMutation,
} from "@/features/death-reporting/api/death-reporting.hooks"

// ============================================================================
// Signature canvas (shared pattern)
// ============================================================================

interface SignatureCanvasProps {
	onCapture: (dataUrl: string) => void
	disabled?: boolean
}

function SignatureCanvas({ onCapture, disabled }: SignatureCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const drawing = useRef(false)

	const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const rect = canvasRef.current!.getBoundingClientRect()
		return { x: e.clientX - rect.left, y: e.clientY - rect.top }
	}

	const onPointerDown = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (disabled) return
			drawing.current = true
			const ctx = canvasRef.current!.getContext("2d")!
			const { x, y } = getPos(e)
			ctx.beginPath()
			ctx.moveTo(x, y)
		},
		[disabled]
	)

	const onPointerMove = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (!drawing.current || disabled) return
			const ctx = canvasRef.current!.getContext("2d")!
			const { x, y } = getPos(e)
			ctx.lineTo(x, y)
			ctx.strokeStyle = "#1e293b"
			ctx.lineWidth = 2
			ctx.lineCap = "round"
			ctx.stroke()
		},
		[disabled]
	)

	const onPointerUp = useCallback(() => {
		if (!drawing.current) return
		drawing.current = false
		onCapture(canvasRef.current!.toDataURL("image/png"))
	}, [onCapture])

	const clear = () => {
		const canvas = canvasRef.current!
		canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height)
		onCapture("")
	}

	return (
		<div className="space-y-1">
			<canvas
				ref={canvasRef}
				width={540}
				height={130}
				className="cursor-crosshair touch-none rounded border bg-white dark:bg-neutral-900"
				style={{ maxWidth: "100%" }}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerLeave={onPointerUp}
			/>
			{!disabled && (
				<Button type="button" variant="ghost" size="sm" onClick={clear}>
					<RefreshCw className="mr-1 size-3" />
					Clear
				</Button>
			)}
		</div>
	)
}

// ============================================================================
// Helper — checkbox row
// ============================================================================

interface CheckRowProps {
	id: string
	label: string
	checked: boolean
	onChange: (v: boolean) => void
	disabled?: boolean
}

function CheckRow({ id, label, checked, onChange, disabled }: CheckRowProps) {
	return (
		<label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
			<input
				id={id}
				type="checkbox"
				className="size-4 accent-primary"
				checked={checked}
				onChange={e => onChange(e.target.checked)}
				disabled={disabled}
			/>
			{label}
		</label>
	)
}

// ============================================================================
// Default form state
// ============================================================================

type FormState = Omit<CreateFndrfInput, "encounterId" | "patientId" | "facilityId">

function emptyForm(): FormState {
	return {
		newbornName: "",
		newbornMrn: "",
		newbornDateOfBirth: "",
		gestationalAgeWeeks: 0,
		birthWeightGrams: 0,
		deliveryType: "svd",
		apgarScore1Min: null,
		apgarScore5Min: null,
		motherName: "",
		motherAge: 0,
		motherGravidity: 0,
		motherParity: 0,
		motherAncVisits: null,
		dateOfDeath: "",
		ageAtDeathHours: null,
		ageAtDeathDays: null,
		placeOfDeath: "",
		causePrematurity: false,
		causeBirthAsphyxia: false,
		causeSepsis: false,
		causeCongenitalAnomaly: false,
		causeRds: false,
		causeOther: "",
		contributingRemarks: "",
		physicianName: "",
		physicianLicenseNo: "",
		physicianSignatureDataUrl: "",
		certificationDate: new Date().toISOString().slice(0, 10),
	}
}

// ============================================================================
// Main component
// ============================================================================

interface FndrfFormProps {
	encounterId: string
	patientId: string
	facilityId: string
	initialNewbornName?: string
	initialNewbornMrn?: string
	initialNewbornDateOfBirth?: string
}

export function FndrfForm({
	encounterId,
	patientId,
	facilityId,
	initialNewbornName,
	initialNewbornMrn,
	initialNewbornDateOfBirth,
}: FndrfFormProps) {
	const { data: existing } = useFndrfQuery(encounterId)
	const createMutation = useCreateFndrfMutation()
	const updateMutation = useUpdateFndrfMutation()

	const [editing, setEditing] = useState(false)
	const [form, setForm] = useState<FormState>(emptyForm)
	const [submitted, setSubmitted] = useState(false)

	useEffect(() => {
		if (existing) {
			setForm({
				newbornName: existing.newbornName,
				newbornMrn: existing.newbornMrn,
				newbornDateOfBirth: existing.newbornDateOfBirth,
				gestationalAgeWeeks: existing.gestationalAgeWeeks,
				birthWeightGrams: existing.birthWeightGrams,
				deliveryType: existing.deliveryType,
				apgarScore1Min: existing.apgarScore1Min,
				apgarScore5Min: existing.apgarScore5Min,
				motherName: existing.motherName,
				motherAge: existing.motherAge,
				motherGravidity: existing.motherGravidity,
				motherParity: existing.motherParity,
				motherAncVisits: existing.motherAncVisits,
				dateOfDeath: existing.dateOfDeath,
				ageAtDeathHours: existing.ageAtDeathHours,
				ageAtDeathDays: existing.ageAtDeathDays,
				placeOfDeath: existing.placeOfDeath,
				causePrematurity: existing.causePrematurity,
				causeBirthAsphyxia: existing.causeBirthAsphyxia,
				causeSepsis: existing.causeSepsis,
				causeCongenitalAnomaly: existing.causeCongenitalAnomaly,
				causeRds: existing.causeRds,
				causeOther: existing.causeOther ?? "",
				contributingRemarks: existing.contributingRemarks ?? "",
				physicianName: existing.physicianName,
				physicianLicenseNo: existing.physicianLicenseNo,
				physicianSignatureDataUrl: existing.physicianSignatureDataUrl,
				certificationDate: existing.certificationDate,
			})
		} else {
			setForm(prev => ({
				...prev,
				newbornName: initialNewbornName ?? "",
				newbornMrn: initialNewbornMrn ?? "",
				newbornDateOfBirth: initialNewbornDateOfBirth ?? "",
			}))
		}
	}, [existing, initialNewbornName, initialNewbornMrn, initialNewbornDateOfBirth])

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
		setForm(prev => ({ ...prev, [key]: value }))

	const isReadOnly = !!existing && !editing
	const isPending = createMutation.isPending || updateMutation.isPending

	const requiredFields: (keyof FormState)[] = [
		"newbornName",
		"newbornMrn",
		"newbornDateOfBirth",
		"dateOfDeath",
		"placeOfDeath",
		"physicianName",
		"physicianLicenseNo",
		"physicianSignatureDataUrl",
		"certificationDate",
	]

	const isValid = requiredFields.every(f => !!form[f])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!isValid) return

		const payload: CreateFndrfInput = {
			...form,
			encounterId,
			patientId,
			facilityId,
			causeOther: form.causeOther || null,
			contributingRemarks: form.contributingRemarks || null,
		}

		if (existing) {
			await updateMutation.mutateAsync({ id: existing.id, ...payload })
		} else {
			await createMutation.mutateAsync(payload)
		}

		setEditing(false)
		setSubmitted(true)
	}

	if (submitted && !editing) {
		return (
			<Card className="border-green-300">
				<CardContent className="flex items-center gap-3 py-6">
					<CheckCircle2 className="size-6 text-green-600" />
					<div>
						<p className="font-medium text-green-700">FNDRF Submitted</p>
						<p className="text-sm text-muted-foreground">
							Facility Neonatal Death Review Form has been saved.
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="ml-auto"
						onClick={() => { setEditing(true); setSubmitted(false) }}
					>
						Edit
					</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Facility Neonatal Death Review Form (FNDRF)</h2>
					<p className="text-sm text-muted-foreground">
						DOH-mandated neonatal death review documentation
					</p>
				</div>
				{existing && !editing && (
					<div className="flex items-center gap-2">
						<Badge className="bg-green-100 text-green-800">Submitted</Badge>
						<Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
							Edit
						</Button>
					</div>
				)}
			</div>

			{/* Section 1 – Newborn Info */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 1 — Newborn Information</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>Newborn Name *</Label>
						<Input
							value={form.newbornName}
							onChange={e => set("newbornName", e.target.value)}
							disabled={isReadOnly}
							required
						/>
					</div>
					<div className="space-y-1.5">
						<Label>MRN *</Label>
						<Input
							value={form.newbornMrn}
							onChange={e => set("newbornMrn", e.target.value)}
							disabled={isReadOnly}
							required
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Date of Birth *</Label>
						<Input
							type="datetime-local"
							value={form.newbornDateOfBirth}
							onChange={e => set("newbornDateOfBirth", e.target.value)}
							disabled={isReadOnly}
							required
						/>
					</div>
				</CardContent>
			</Card>

			{/* Section 2 – Birth History */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 2 — Birth History</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div className="space-y-1.5">
						<Label>Gestational Age (weeks)</Label>
						<Input
							type="number"
							min={20}
							max={45}
							value={form.gestationalAgeWeeks}
							onChange={e => set("gestationalAgeWeeks", Number(e.target.value))}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Birth Weight (grams)</Label>
						<Input
							type="number"
							min={0}
							value={form.birthWeightGrams}
							onChange={e => set("birthWeightGrams", Number(e.target.value))}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Type of Delivery</Label>
						<Select
							value={form.deliveryType}
							onValueChange={v =>
								set("deliveryType", v as FormState["deliveryType"])
							}
						>
							<SelectTrigger disabled={isReadOnly}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="svd">Spontaneous Vaginal (SVD)</SelectItem>
								<SelectItem value="cs">Cesarean Section (C/S)</SelectItem>
								<SelectItem value="forceps">Forceps-Assisted</SelectItem>
								<SelectItem value="vacuum">Vacuum-Assisted</SelectItem>
								<SelectItem value="other">Other</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label>APGAR Score — 1 min</Label>
						<Input
							type="number"
							min={0}
							max={10}
							value={form.apgarScore1Min ?? ""}
							onChange={e =>
								set("apgarScore1Min", e.target.value ? Number(e.target.value) : null)
							}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>APGAR Score — 5 min</Label>
						<Input
							type="number"
							min={0}
							max={10}
							value={form.apgarScore5Min ?? ""}
							onChange={e =>
								set("apgarScore5Min", e.target.value ? Number(e.target.value) : null)
							}
							disabled={isReadOnly}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Section 3 – Maternal Information */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 3 — Maternal Information</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div className="space-y-1.5 sm:col-span-2">
						<Label>Mother&apos;s Full Name</Label>
						<Input
							value={form.motherName}
							onChange={e => set("motherName", e.target.value)}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Mother&apos;s Age</Label>
						<Input
							type="number"
							min={10}
							max={70}
							value={form.motherAge}
							onChange={e => set("motherAge", Number(e.target.value))}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Gravidity</Label>
						<Input
							type="number"
							min={0}
							value={form.motherGravidity}
							onChange={e => set("motherGravidity", Number(e.target.value))}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Parity</Label>
						<Input
							type="number"
							min={0}
							value={form.motherParity}
							onChange={e => set("motherParity", Number(e.target.value))}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>ANC Visits</Label>
						<Input
							type="number"
							min={0}
							value={form.motherAncVisits ?? ""}
							onChange={e =>
								set("motherAncVisits", e.target.value ? Number(e.target.value) : null)
							}
							disabled={isReadOnly}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Section 4 – Death Circumstances */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 4 — Death Circumstances</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>Date & Time of Death *</Label>
						<Input
							type="datetime-local"
							value={form.dateOfDeath}
							onChange={e => set("dateOfDeath", e.target.value)}
							disabled={isReadOnly}
							required
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Age at Death (hours)</Label>
						<Input
							type="number"
							min={0}
							value={form.ageAtDeathHours ?? ""}
							onChange={e =>
								set("ageAtDeathHours", e.target.value ? Number(e.target.value) : null)
							}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Age at Death (days)</Label>
						<Input
							type="number"
							min={0}
							value={form.ageAtDeathDays ?? ""}
							onChange={e =>
								set("ageAtDeathDays", e.target.value ? Number(e.target.value) : null)
							}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Place of Death *</Label>
						<Input
							placeholder="e.g., NICU, Delivery Room"
							value={form.placeOfDeath}
							onChange={e => set("placeOfDeath", e.target.value)}
							disabled={isReadOnly}
							required
						/>
					</div>
				</CardContent>
			</Card>

			{/* Section 5 – Cause of Death */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 5 — Cause of Death</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2">
					<CheckRow
						id="cause-prematurity"
						label="Prematurity"
						checked={form.causePrematurity}
						onChange={v => set("causePrematurity", v)}
						disabled={isReadOnly}
					/>
					<CheckRow
						id="cause-asphyxia"
						label="Birth Asphyxia"
						checked={form.causeBirthAsphyxia}
						onChange={v => set("causeBirthAsphyxia", v)}
						disabled={isReadOnly}
					/>
					<CheckRow
						id="cause-sepsis"
						label="Neonatal Sepsis"
						checked={form.causeSepsis}
						onChange={v => set("causeSepsis", v)}
						disabled={isReadOnly}
					/>
					<CheckRow
						id="cause-congenital"
						label="Congenital Anomaly"
						checked={form.causeCongenitalAnomaly}
						onChange={v => set("causeCongenitalAnomaly", v)}
						disabled={isReadOnly}
					/>
					<CheckRow
						id="cause-rds"
						label="Respiratory Distress Syndrome (RDS)"
						checked={form.causeRds}
						onChange={v => set("causeRds", v)}
						disabled={isReadOnly}
					/>
					<div className="space-y-1.5 sm:col-span-2">
						<Label>Other Cause</Label>
						<Input
							value={form.causeOther ?? ""}
							onChange={e => set("causeOther", e.target.value)}
							disabled={isReadOnly}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Section 6 – Contributing Remarks */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 6 — Contributing Factors / Remarks</CardTitle>
				</CardHeader>
				<CardContent>
					<Textarea
						rows={4}
						placeholder="Describe any contributing factors, clinical context, or additional remarks…"
						value={form.contributingRemarks ?? ""}
						onChange={e => set("contributingRemarks", e.target.value)}
						disabled={isReadOnly}
					/>
				</CardContent>
			</Card>

			{/* Section 7 – Physician Certification */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 7 — Physician Certification</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label>Physician Name *</Label>
							<Input
								value={form.physicianName}
								onChange={e => set("physicianName", e.target.value)}
								disabled={isReadOnly}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label>PRC License No. *</Label>
							<Input
								value={form.physicianLicenseNo}
								onChange={e => set("physicianLicenseNo", e.target.value)}
								disabled={isReadOnly}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Date of Certification *</Label>
							<Input
								type="date"
								value={form.certificationDate}
								onChange={e => set("certificationDate", e.target.value)}
								disabled={isReadOnly}
								required
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label>Physician Signature *</Label>
						{isReadOnly && form.physicianSignatureDataUrl ? (
							<img
								src={form.physicianSignatureDataUrl}
								alt="Physician signature"
								className="h-[130px] rounded border bg-white"
							/>
						) : (
							<>
								{form.physicianSignatureDataUrl ? (
									<img
										src={form.physicianSignatureDataUrl}
										alt="Current signature"
										className="mb-1 h-[130px] rounded border bg-white"
									/>
								) : null}
								<SignatureCanvas
									onCapture={url => set("physicianSignatureDataUrl", url)}
									disabled={isReadOnly}
								/>
								{!isReadOnly && !form.physicianSignatureDataUrl && (
									<p className="text-xs text-muted-foreground">
										Draw your signature above *
									</p>
								)}
							</>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Submit */}
			{!isReadOnly && (
				<div className="flex gap-3">
					<Button type="submit" disabled={!isValid || isPending}>
						{isPending ? "Saving…" : existing ? "Update FNDRF" : "Submit FNDRF"}
					</Button>
					{existing && (
						<Button type="button" variant="outline" onClick={() => setEditing(false)}>
							Cancel
						</Button>
					)}
				</div>
			)}
		</form>
	)
}
