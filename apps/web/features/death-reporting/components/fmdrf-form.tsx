"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, RefreshCw } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useCreateFmdrfMutation,
	useFmdrfQuery,
	useMarkDeathReportReleasedMutation,
	useUpdateFmdrfMutation,
	type CreateFmdrfInput,
} from "@/features/death-reporting/api/death-reporting.hooks"

// ============================================================================
// Signature canvas
// ============================================================================

interface SignatureCanvasProps {
	onCapture: (dataUrl: string) => void
	disabled?: boolean
	initialDataUrl?: string
}

function SignatureCanvas({ onCapture, disabled, initialDataUrl }: SignatureCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const drawing = useRef(false)
	const initialized = useRef(false)

	useEffect(() => {
		if (!initialDataUrl || initialized.current || !canvasRef.current) return
		initialized.current = true
		const img = new window.Image()
		img.onload = () => {
			canvasRef.current?.getContext("2d")?.drawImage(img, 0, 0)
		}
		img.src = initialDataUrl
	}, [initialDataUrl])

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
		initialized.current = false
		onCapture("")
	}

	return (
		<div className="space-y-1">
			<div className="relative inline-block">
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
			</div>
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
				className="accent-primary size-4"
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

type FormState = Omit<CreateFmdrfInput, "encounterId" | "patientId" | "facilityId">

function toDatetimeLocalValue(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function emptyForm(): FormState {
	return {
		patientName: "",
		patientMrn: "",
		patientAge: 0,
		patientAddress: "",
		dateOfDeath: "",
		placeOfDeath: "",
		causeOfDeathImmediate: "",
		causeOfDeathAntecedent: "",
		causeOfDeathUnderlying: "",
		causeOfDeathContributing: "",
		gravidity: 0,
		parity: 0,
		lastMenstrualPeriod: "",
		gestationalAgeWeeks: null,
		antenatalCare: false,
		antenatalVisitCount: null,
		complicationType: "",
		factorHemorrhage: false,
		factorSepsis: false,
		factorEclampsia: false,
		factorObstructedLabor: false,
		factorUnsafeAbortion: false,
		factorOther: "",
		avoidableFactors: false,
		avoidableRemark: "",
		physicianName: "",
		physicianLicenseNo: "",
		physicianSignatureDataUrl: "",
		certificationDate: new Date().toISOString().slice(0, 10),
	}
}

// ============================================================================
// Main component
// ============================================================================

interface FmdrfFormProps {
	encounterId: string
	patientId: string
	facilityId: string
	/** Prefill values from encounter context */
	initialPatientName?: string
	initialPatientMrn?: string
	initialPatientAge?: number
	initialPatientAddress?: string | null
	initialPlaceOfDeath?: string | null
}

export function FmdrfForm({
	encounterId,
	patientId,
	facilityId,
	initialPatientName,
	initialPatientMrn,
	initialPatientAge,
	initialPatientAddress,
	initialPlaceOfDeath,
}: FmdrfFormProps) {
	const { data: existing } = useFmdrfQuery(encounterId)
	const createMutation = useCreateFmdrfMutation()
	const updateMutation = useUpdateFmdrfMutation()
	const markReleasedMutation = useMarkDeathReportReleasedMutation()

	const { data: profile } = useMyProfile()
	const activeStaffProfile =
		profile?.staffProfiles?.find(p =>
			p.roles.some((r: { id: string }) => r.id === profile?.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]
	const defaultPhysicianName = profile?.user?.name ?? ""
	const defaultPhysicianLicenseNo = activeStaffProfile?.prcLicenseNumber ?? ""
	const staffProfileId = activeStaffProfile?.id ?? null
	const permissions = profile?.activeRole?.permissions ?? []
	const canEdit = (permissions as Array<{ module: string; action: string }>).some(
		p => p.module === "death_reporting" && p.action === "edit"
	)

	const [editing, setEditing] = useState(false)
	const [form, setForm] = useState<FormState>(emptyForm)
	const [submitted, setSubmitted] = useState(false)

	// Populate form from existing report or prefill values
	useEffect(() => {
		if (existing) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setForm({
				patientName: existing.patientName,
				patientMrn: existing.patientMrn,
				patientAge: existing.patientAge,
				patientAddress: existing.patientAddress,
				dateOfDeath: toDatetimeLocalValue(existing.dateOfDeath),
				placeOfDeath: existing.placeOfDeath,
				causeOfDeathImmediate: existing.causeOfDeathImmediate,
				causeOfDeathAntecedent: existing.causeOfDeathAntecedent,
				causeOfDeathUnderlying: existing.causeOfDeathUnderlying,
				causeOfDeathContributing: existing.causeOfDeathContributing ?? "",
				gravidity: existing.gravidity,
				parity: existing.parity,
				lastMenstrualPeriod: existing.lastMenstrualPeriod ?? "",
				gestationalAgeWeeks: existing.gestationalAgeWeeks,
				antenatalCare: existing.antenatalCare,
				antenatalVisitCount: existing.antenatalVisitCount,
				complicationType: existing.complicationType ?? "",
				factorHemorrhage: existing.factorHemorrhage,
				factorSepsis: existing.factorSepsis,
				factorEclampsia: existing.factorEclampsia,
				factorObstructedLabor: existing.factorObstructedLabor,
				factorUnsafeAbortion: existing.factorUnsafeAbortion,
				factorOther: existing.factorOther ?? "",
				avoidableFactors: existing.avoidableFactors,
				avoidableRemark: existing.avoidableRemark ?? "",
				physicianName: existing.physicianName,
				physicianLicenseNo: existing.physicianLicenseNo,
				physicianSignatureDataUrl: existing.physicianSignatureDataUrl,
				certificationDate: existing.certificationDate,
			})
		} else {
			setForm(prev => ({
				...prev,
				patientName: prev.patientName || initialPatientName || "",
				patientMrn: prev.patientMrn || initialPatientMrn || "",
				patientAge: prev.patientAge || initialPatientAge || 0,
				patientAddress: prev.patientAddress || initialPatientAddress || "",
				placeOfDeath: prev.placeOfDeath || initialPlaceOfDeath || "",
				physicianName: prev.physicianName || defaultPhysicianName,
				physicianLicenseNo: prev.physicianLicenseNo || defaultPhysicianLicenseNo,
			}))
		}
	}, [
		existing,
		initialPatientName,
		initialPatientMrn,
		initialPatientAge,
		initialPatientAddress,
		initialPlaceOfDeath,
		defaultPhysicianName,
		defaultPhysicianLicenseNo,
	])

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
		setForm(prev => ({ ...prev, [key]: value }))

	const isReadOnly = !!existing && !editing
	const isPending = createMutation.isPending || updateMutation.isPending

	const requiredFields: (keyof FormState)[] = [
		"patientName",
		"patientMrn",
		"patientAge",
		"patientAddress",
		"dateOfDeath",
		"placeOfDeath",
		"causeOfDeathImmediate",
		"causeOfDeathUnderlying",
		"physicianName",
		"physicianLicenseNo",
		"physicianSignatureDataUrl",
		"certificationDate",
	]

	const isValid = requiredFields.every(f => {
		const value = form[f]
		return typeof value === "number" ? value > 0 : !!value
	})

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!isValid) return

		const payload: CreateFmdrfInput = {
			...form,
			encounterId,
			patientId,
			facilityId,
			causeOfDeathContributing: form.causeOfDeathContributing || null,
			lastMenstrualPeriod: form.lastMenstrualPeriod || null,
			complicationType: form.complicationType || null,
			factorOther: form.factorOther || null,
			avoidableRemark: form.avoidableRemark || null,
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
						<p className="font-medium text-green-700">FMDRF Submitted</p>
						<p className="text-muted-foreground text-sm">
							Facility Maternal Death Review Form has been submitted for MNDRS review.
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="ml-auto"
						onClick={() => {
							setEditing(true)
							setSubmitted(false)
						}}
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
					<h2 className="text-lg font-semibold">Facility Maternal Death Review Form (FMDRF)</h2>
					<p className="text-muted-foreground text-sm">
						DOH-mandated maternal death review documentation
					</p>
				</div>
				{existing && !editing && (
					<div className="flex items-center gap-2">
						{existing.status === "draft" && (
							<Badge className="bg-amber-100 text-amber-800">Draft</Badge>
						)}
						{existing.status === "completed" && (
							<Badge className="bg-green-100 text-green-800">Completed</Badge>
						)}
						{existing.status === "submitted" && (
							<Badge className="bg-blue-100 text-blue-800">Submitted</Badge>
						)}
						{existing.status === "draft" && canEdit && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={markReleasedMutation.isPending || !staffProfileId}
								onClick={() => {
									if (!staffProfileId) return
									void markReleasedMutation.mutateAsync({
										id: existing.id,
										encounterId,
									})
								}}
							>
								{markReleasedMutation.isPending ? "Marking…" : "Mark as Completed"}
							</Button>
						)}
						<Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
							Edit
						</Button>
					</div>
				)}
			</div>

			{/* Section 1 – Patient Demographics */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 1 — Patient Demographics</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>Full Name *</Label>
						<Input
							value={form.patientName}
							onChange={e => set("patientName", e.target.value)}
							disabled={isReadOnly}
							required
						/>
					</div>
					<div className="space-y-1.5">
						<Label>MRN *</Label>
						<Input
							value={form.patientMrn}
							onChange={e => set("patientMrn", e.target.value)}
							disabled={isReadOnly}
							required
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Age at Death *</Label>
						<Input
							type="number"
							min={0}
							max={120}
							value={form.patientAge || ""}
							onChange={e => set("patientAge", Number(e.target.value))}
							disabled={isReadOnly}
							required
						/>
					</div>
					<div className="space-y-1.5 sm:col-span-2">
						<Label>Address *</Label>
						<Input
							value={form.patientAddress}
							onChange={e => set("patientAddress", e.target.value)}
							disabled={isReadOnly}
							required
						/>
					</div>
				</CardContent>
			</Card>

			{/* Section 2 – Death Details */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 2 — Death Details</CardTitle>
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
						<Label>Place of Death *</Label>
						<Input
							placeholder="e.g., Emergency Department, Ward 3"
							value={form.placeOfDeath}
							onChange={e => set("placeOfDeath", e.target.value)}
							disabled={isReadOnly}
							required
						/>
					</div>
					<div className="space-y-1.5 sm:col-span-2">
						<Label>Immediate Cause of Death (ICD-10) *</Label>
						<Input
							placeholder="e.g., J18.9 — Pneumonia"
							value={form.causeOfDeathImmediate}
							onChange={e => set("causeOfDeathImmediate", e.target.value)}
							disabled={isReadOnly}
							required
						/>
					</div>
					<div className="space-y-1.5 sm:col-span-2">
						<Label>Antecedent Cause</Label>
						<Input
							placeholder="Condition giving rise to immediate cause"
							value={form.causeOfDeathAntecedent}
							onChange={e => set("causeOfDeathAntecedent", e.target.value)}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5 sm:col-span-2">
						<Label>Underlying Cause *</Label>
						<Input
							placeholder="Disease/injury initiating chain of events"
							value={form.causeOfDeathUnderlying}
							onChange={e => set("causeOfDeathUnderlying", e.target.value)}
							disabled={isReadOnly}
							required
						/>
					</div>
					<div className="space-y-1.5 sm:col-span-2">
						<Label>Contributing Conditions</Label>
						<Input
							placeholder="Other significant conditions not directly causing death"
							value={form.causeOfDeathContributing ?? ""}
							onChange={e => set("causeOfDeathContributing", e.target.value)}
							disabled={isReadOnly}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Section 3 – Maternal History */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 3 — Maternal History</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div className="space-y-1.5">
						<Label>Gravidity</Label>
						<Input
							type="number"
							min={0}
							value={form.gravidity || ""}
							onChange={e => set("gravidity", Number(e.target.value))}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Parity</Label>
						<Input
							type="number"
							min={0}
							value={form.parity || ""}
							onChange={e => set("parity", Number(e.target.value))}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Last Menstrual Period</Label>
						<Input
							type="date"
							value={form.lastMenstrualPeriod ?? ""}
							onChange={e => set("lastMenstrualPeriod", e.target.value)}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Gestational Age (weeks)</Label>
						<Input
							type="number"
							min={0}
							max={45}
							value={form.gestationalAgeWeeks ?? ""}
							onChange={e =>
								set("gestationalAgeWeeks", e.target.value ? Number(e.target.value) : null)
							}
							disabled={isReadOnly}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Antenatal Care Received</Label>
						<Select
							value={form.antenatalCare ? "yes" : "no"}
							onValueChange={v => set("antenatalCare", v === "yes")}
						>
							<SelectTrigger disabled={isReadOnly}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="yes">Yes</SelectItem>
								<SelectItem value="no">No</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{form.antenatalCare && (
						<div className="space-y-1.5">
							<Label>ANC Visit Count</Label>
							<Input
								type="number"
								min={0}
								value={form.antenatalVisitCount ?? ""}
								onChange={e =>
									set("antenatalVisitCount", e.target.value ? Number(e.target.value) : null)
								}
								disabled={isReadOnly}
							/>
						</div>
					)}
					<div className="space-y-1.5 sm:col-span-2">
						<Label>Complication Type</Label>
						<Input
							placeholder="e.g., Antepartum hemorrhage, Eclampsia"
							value={form.complicationType ?? ""}
							onChange={e => set("complicationType", e.target.value)}
							disabled={isReadOnly}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Section 4 – Contributing Factors */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 4 — Contributing Factors</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2">
					<CheckRow
						id="factor-hemorrhage"
						label="Hemorrhage"
						checked={form.factorHemorrhage}
						onChange={v => set("factorHemorrhage", v)}
						disabled={isReadOnly}
					/>
					<CheckRow
						id="factor-sepsis"
						label="Sepsis / Infection"
						checked={form.factorSepsis}
						onChange={v => set("factorSepsis", v)}
						disabled={isReadOnly}
					/>
					<CheckRow
						id="factor-eclampsia"
						label="Eclampsia / Pre-eclampsia"
						checked={form.factorEclampsia}
						onChange={v => set("factorEclampsia", v)}
						disabled={isReadOnly}
					/>
					<CheckRow
						id="factor-labor"
						label="Obstructed Labor"
						checked={form.factorObstructedLabor}
						onChange={v => set("factorObstructedLabor", v)}
						disabled={isReadOnly}
					/>
					<CheckRow
						id="factor-abortion"
						label="Unsafe Abortion"
						checked={form.factorUnsafeAbortion}
						onChange={v => set("factorUnsafeAbortion", v)}
						disabled={isReadOnly}
					/>
					<div className="space-y-1.5 sm:col-span-2">
						<Label>Other Contributing Factor</Label>
						<Input
							value={form.factorOther ?? ""}
							onChange={e => set("factorOther", e.target.value)}
							disabled={isReadOnly}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Section 5 – Preventability */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 5 — Preventability</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<CheckRow
						id="avoidable-factors"
						label="Were avoidable factors identified?"
						checked={form.avoidableFactors}
						onChange={v => set("avoidableFactors", v)}
						disabled={isReadOnly}
					/>
					{form.avoidableFactors && (
						<div className="space-y-1.5">
							<Label>Avoidable Factor Remarks</Label>
							<Textarea
								rows={3}
								value={form.avoidableRemark ?? ""}
								onChange={e => set("avoidableRemark", e.target.value)}
								disabled={isReadOnly}
							/>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Section 6 – Physician Certification */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Section 6 — Physician Certification</CardTitle>
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
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={form.physicianSignatureDataUrl}
								alt="Physician signature"
								className="h-[130px] rounded border bg-white"
							/>
						) : (
							<>
								<SignatureCanvas
									initialDataUrl={existing?.physicianSignatureDataUrl ?? undefined}
									onCapture={url => set("physicianSignatureDataUrl", url)}
									disabled={isReadOnly}
								/>
								{!isReadOnly && !form.physicianSignatureDataUrl && (
									<p className="text-muted-foreground text-xs">Draw your signature above *</p>
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
						{isPending ? "Saving…" : existing ? "Update FMDRF" : "Submit FMDRF"}
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
