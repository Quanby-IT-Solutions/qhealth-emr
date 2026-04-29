"use client"

import { useCallback, useRef, useState } from "react"

import { ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { Textarea } from "@/core/components/ui/textarea"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useListStaffQuery } from "@/features/admin/api/admin.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useBedListQuery } from "@/features/beds/api/beds.hooks"
import { BedSuggestionPanel } from "@/features/beds/components/bed-suggestion-panel"
import { useCreateConsentMutation } from "@/features/clinical-docs/api/clinical-docs.hooks"
import { useCreateEncounterMutation } from "@/features/encounters/api/encounters.hooks"
import { useOpdTriageQuery } from "@/features/opd-triage/api/opd-triage.hooks"

// ============================================================================
// Signature Canvas
// ============================================================================

interface SignatureCanvasProps {
	onCapture: (dataUrl: string) => void
	onClear: () => void
}

function SignatureCanvas({ onCapture, onClear }: SignatureCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const isDrawingRef = useRef(false)
	const lastPosRef = useRef<{ x: number; y: number } | null>(null)
	const hasStrokesRef = useRef(false)

	const getPos = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	): { x: number; y: number } => {
		const canvas = canvasRef.current!
		const rect = canvas.getBoundingClientRect()
		const scaleX = canvas.width / rect.width
		const scaleY = canvas.height / rect.height
		if ("touches" in e) {
			const touch = e.touches[0]
			return {
				x: (touch.clientX - rect.left) * scaleX,
				y: (touch.clientY - rect.top) * scaleY,
			}
		}
		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY,
		}
	}

	const startDrawing = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		e.preventDefault()
		isDrawingRef.current = true
		lastPosRef.current = getPos(e)
	}

	const draw = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		e.preventDefault()
		if (!isDrawingRef.current || !canvasRef.current) return
		const ctx = canvasRef.current.getContext("2d")!
		const pos = getPos(e)
		ctx.beginPath()
		ctx.moveTo(lastPosRef.current!.x, lastPosRef.current!.y)
		ctx.lineTo(pos.x, pos.y)
		ctx.strokeStyle = "#1e293b"
		ctx.lineWidth = 2
		ctx.lineCap = "round"
		ctx.stroke()
		lastPosRef.current = pos
		hasStrokesRef.current = true
	}

	const stopDrawing = useCallback(() => {
		if (!isDrawingRef.current) return
		isDrawingRef.current = false
		lastPosRef.current = null
		if (hasStrokesRef.current && canvasRef.current) {
			onCapture(canvasRef.current.toDataURL("image/png"))
		}
	}, [onCapture])

	const handleClear = () => {
		if (!canvasRef.current) return
		const ctx = canvasRef.current.getContext("2d")!
		ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
		hasStrokesRef.current = false
		onClear()
	}

	return (
		<div className="space-y-1">
			<div className="relative rounded-md border bg-white">
				<canvas
					ref={canvasRef}
					width={540}
					height={130}
					className="w-full cursor-crosshair touch-none rounded-md"
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={stopDrawing}
					onMouseLeave={stopDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={stopDrawing}
				/>
			</div>
			<div className="flex justify-end">
				<Button type="button" variant="ghost" size="sm" onClick={handleClear}>
					Clear
				</Button>
			</div>
		</div>
	)
}

// ============================================================================
// Types
// ============================================================================

type TabValue = "OPD" | "ER" | "IPD"

interface CreateEncounterFormProps {
	patientId: string
	patientName: string
	defaultType?: "inpatient" | "outpatient" | "emergency"
	triageId?: string
}

function tabFromDefaultType(defaultType: "inpatient" | "outpatient" | "emergency" | undefined): TabValue {
	switch (defaultType) {
		case "outpatient":
			return "OPD"
		case "emergency":
			return "ER"
		case "inpatient":
			return "IPD"
		default:
			return "OPD"
	}
}

function encounterTypeFromTab(tab: TabValue): "outpatient" | "emergency" | "inpatient" {
	switch (tab) {
		case "OPD":
			return "outpatient"
		case "ER":
			return "emergency"
		case "IPD":
			return "inpatient"
	}
}

function tabLabel(tab: TabValue): string {
	switch (tab) {
		case "OPD":
			return "Outpatient (OPD)"
		case "ER":
			return "Emergency (ER)"
		case "IPD":
			return "Inpatient (IPD)"
	}
}

// ============================================================================
// Create Encounter Form
// ============================================================================

export function CreateEncounterForm({
	patientId,
	patientName,
	defaultType,
	triageId,
}: CreateEncounterFormProps) {
	const router = useRouter()
	const { data: profile } = useMyProfile()
	const facilityId = useActiveFacilityId()
	const staffId = profile?.staffProfiles?.[0]?.id ?? ""

	const createEncounter = useCreateEncounterMutation()
	const createConsent = useCreateConsentMutation()

	const { data: bedData } = useBedListQuery({ facilityId: facilityId ?? "" })
	const { data: triageData } = useOpdTriageQuery(triageId ?? "", { enabled: !!triageId })
	const { data: staffData } = useListStaffQuery({
		facilityId: facilityId ?? "",
		isActive: true,
		limit: 100,
	})

	const clinicianOptions = (staffData?.data ?? []).flatMap(user =>
		user.staffProfiles
			.filter(sp => sp.facilityId === facilityId && sp.isActive)
			.map(sp => ({
				staffProfileId: sp.id,
				name: user.name,
				department: sp.department,
			}))
	)

	const availableBeds = (bedData?.wards ?? []).flatMap(ward =>
		ward.beds
			.filter(bed => bed.status === "available")
			.map(bed => ({ ...bed, wardName: ward.name, wardType: ward.wardType }))
	)

	// ── Step: "details" | "consent" ─────────────────────────────────────────
	const [step, setStep] = useState<"details" | "consent">("details")

	// ── Details step state ───────────────────────────────────────────────────
	const [activeTab, setActiveTab] = useState<TabValue>(tabFromDefaultType(defaultType))
	const [chiefComplaint, setChiefComplaint] = useState("")
	const [clinicianStaffId, setClinicianStaffId] = useState("")
	const [bedId, setBedId] = useState("")

	const [triagedPrefilled, setTriagedPrefilled] = useState(false)
	if (triageData && !triagedPrefilled) {
		setChiefComplaint(prev => prev || triageData.chiefComplaint)
		setTriagedPrefilled(true)
	}

	// ── Consent step state ───────────────────────────────────────────────────
	const [signedByName, setSignedByName] = useState("")
	const [relationship, setRelationship] = useState<
		"self" | "parent" | "guardian" | "spouse" | "other"
	>("self")
	const [rightsAcknowledged, setRightsAcknowledged] = useState(false)
	const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)

	// ── OPD queue confirmation state ─────────────────────────────────────────
	const [assignedQueueNumber, setAssignedQueueNumber] = useState<number | null>(null)
	const [createdEncounterId, setCreatedEncounterId] = useState<string | null>(null)

	// ── Derived ──────────────────────────────────────────────────────────────
	const encounterType = encounterTypeFromTab(activeTab)

	const detailsValid = activeTab !== "OPD" || !!clinicianStaffId

	const consentValid =
		!!signedByName.trim() && rightsAcknowledged && !!signatureDataUrl

	// ── Queue confirmation screen ────────────────────────────────────────────
	if (assignedQueueNumber != null && createdEncounterId) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>OPD Encounter Created</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex flex-col items-center gap-3 py-4">
						<p className="text-muted-foreground text-sm">Queue number assigned for {patientName}</p>
						<Badge className="px-8 py-4 text-5xl font-bold tabular-nums" variant="default">
							{assignedQueueNumber}
						</Badge>
						<p className="text-muted-foreground text-xs">Hand this number to the patient</p>
					</div>
					<div className="flex gap-3">
						<Button
							onClick={() =>
								router.push(`/patients/${patientId}/encounters/${createdEncounterId}`)
							}
						>
							View Encounter
						</Button>
						<Button variant="outline" onClick={() => router.push(`/patients/search`)}>
							Next Patient
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	// ── Consent step ─────────────────────────────────────────────────────────
	if (step === "consent") {
		const handleCreateEncounter = async () => {
			if (!facilityId) return

			const encounter = await createEncounter.mutateAsync({
				facilityId,
				patientId,
				encounterType,
				chiefComplaint: chiefComplaint || undefined,
				admittingStaffId: staffId,
				attendingStaffId: staffId || undefined,
				bedId: bedId || undefined,
				triageIntakeId: triageId || undefined,
				clinicianStaffId:
					encounterType === "outpatient" ? (clinicianStaffId || undefined) : undefined,
			})

			const consentPayload = {
				facilityId,
				encounterId: encounter.id,
				patientId,
				consentType: "dpa" as "general",
				signedByName: signedByName.trim(),
				relationship,
				content: JSON.stringify({ rightsAcknowledged }),
				signatureData: signatureDataUrl,
			}

			if (encounter.queueNumber != null) {
				setAssignedQueueNumber(encounter.queueNumber)
				setCreatedEncounterId(encounter.id)
				createConsent.mutate(consentPayload)
				return
			}

			await createConsent.mutateAsync(consentPayload)
			router.push(`/patients/${patientId}/encounters/${encounter.id}`)
		}

		const isPending = createEncounter.isPending || createConsent.isPending

		return (
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<ShieldCheck className="size-5 text-blue-600" />
							<CardTitle>Data Privacy Act (DPA) Consent</CardTitle>
						</div>
						<p className="text-muted-foreground text-sm">
							{tabLabel(activeTab)} — {patientName}
						</p>
					</CardHeader>
					<CardContent>
						<ScrollArea className="max-h-[60vh] pr-2">
							<div className="space-y-5 py-2">
								<div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
									<p className="font-semibold">Privacy Notice</p>
									<p className="mt-1">
										This facility collects and processes personal and sensitive health information in
										compliance with RA 10173 (Data Privacy Act of 2012). Your information will be
										used only for the purposes you consent to below and will not be shared with third
										parties without your explicit consent unless required by law.
									</p>
								</div>

								<div className="space-y-2">
									<Label className="font-semibold">Rights of the Data Subject</Label>
									<ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
										<li>Right to be informed of how your data will be used</li>
										<li>Right to access your personal data held by this facility</li>
										<li>Right to correct inaccurate data</li>
										<li>Right to object to processing in certain circumstances</li>
										<li>Right to withdraw consent at any time</li>
										<li>Right to data portability upon reasonable request</li>
										<li>Right to file a complaint with the National Privacy Commission</li>
									</ul>
								</div>

								<Separator />

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-1.5">
										<Label>
											Signed By (Full Name) <span className="text-red-500">*</span>
										</Label>
										<Input
											placeholder="Full name of data subject or representative…"
											value={signedByName}
											onChange={e => setSignedByName(e.target.value)}
										/>
									</div>
									<div className="space-y-1.5">
										<Label>Relationship to Patient</Label>
										<Select
											value={relationship}
											onValueChange={v =>
												setRelationship(
													v as "self" | "parent" | "guardian" | "spouse" | "other"
												)
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="self">Self (Patient)</SelectItem>
												<SelectItem value="parent">Parent</SelectItem>
												<SelectItem value="guardian">Legal Guardian</SelectItem>
												<SelectItem value="spouse">Spouse</SelectItem>
												<SelectItem value="other">Other Authorized Representative</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="flex items-start gap-2">
									<Checkbox
										id="rights-ack"
										checked={rightsAcknowledged}
										onCheckedChange={v => setRightsAcknowledged(!!v)}
									/>
									<label htmlFor="rights-ack" className="cursor-pointer text-sm leading-snug">
										I have read and understood the Privacy Notice and my rights as a data subject
										under RA 10173. I freely and voluntarily give my consent to the collection and
										processing of my personal health information.
									</label>
								</div>

								<div className="space-y-1.5">
									<Label>
										Digital Signature <span className="text-red-500">*</span>
									</Label>
									<p className="text-xs text-muted-foreground">
										Sign in the box below using your mouse or touchscreen.
									</p>
									<SignatureCanvas
										onCapture={dataUrl => setSignatureDataUrl(dataUrl)}
										onClear={() => setSignatureDataUrl(null)}
									/>
									{signatureDataUrl && (
										<p className="text-xs text-green-600">✓ Signature captured</p>
									)}
								</div>
							</div>
						</ScrollArea>
					</CardContent>
				</Card>

				<div className="flex gap-3">
					<Button onClick={handleCreateEncounter} disabled={!consentValid || isPending}>
						{isPending ? "Creating…" : "Create Encounter"}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => setStep("details")}
						disabled={isPending}
					>
						Back
					</Button>
				</div>
			</div>
		)
	}

	// ── Details step ─────────────────────────────────────────────────────────
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>New Encounter — {patientName}</CardTitle>
				</CardHeader>
				<CardContent>
					<Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabValue)}>
						<TabsList className="mb-4">
							<TabsTrigger value="OPD">OPD</TabsTrigger>
							<TabsTrigger value="ER">ER</TabsTrigger>
							<TabsTrigger value="IPD">IPD</TabsTrigger>
						</TabsList>

						<TabsContent value="OPD" className="space-y-4">
							<div className="space-y-1.5">
								<Label>
									Attending Clinician <span className="text-red-500">*</span>
								</Label>
								<Select
									value={clinicianStaffId}
									onValueChange={v => setClinicianStaffId(v ?? "")}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select a clinician…" />
									</SelectTrigger>
									<SelectContent>
										{clinicianOptions.map(opt => (
											<SelectItem key={opt.staffProfileId} value={opt.staffProfileId}>
												{opt.name}
												{opt.department ? ` — ${opt.department}` : ""}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label>Chief Complaint</Label>
								<Textarea
									rows={3}
									value={chiefComplaint}
									onChange={e => setChiefComplaint(e.target.value)}
								/>
							</div>
						</TabsContent>

						<TabsContent value="ER" className="space-y-4">
							<div className="space-y-1.5">
								<Label>Chief Complaint</Label>
								<Textarea
									rows={3}
									value={chiefComplaint}
									onChange={e => setChiefComplaint(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Bed Assignment</Label>
								<BedSuggestionPanel
									encounterType="emergency"
									availableBeds={availableBeds}
									selectedBedId={bedId}
									onSelect={id => setBedId(id)}
								/>
							</div>
						</TabsContent>

						<TabsContent value="IPD" className="space-y-4">
							<div className="space-y-1.5">
								<Label>Chief Complaint</Label>
								<Textarea
									rows={3}
									value={chiefComplaint}
									onChange={e => setChiefComplaint(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Bed Assignment</Label>
								<BedSuggestionPanel
									encounterType="inpatient"
									availableBeds={availableBeds}
									selectedBedId={bedId}
									onSelect={id => setBedId(id)}
								/>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			<div className="flex gap-3">
				<Button onClick={() => setStep("consent")} disabled={!detailsValid}>
					Next: Capture Consent
				</Button>
				<Button type="button" variant="outline" onClick={() => router.back()}>
					Cancel
				</Button>
			</div>
		</div>
	)
}
