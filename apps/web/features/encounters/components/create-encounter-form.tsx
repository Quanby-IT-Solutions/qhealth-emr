"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
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
import { Separator } from "@/core/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { Textarea } from "@/core/components/ui/textarea"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useBedListQuery } from "@/features/beds/api/beds.hooks"
import { BedSuggestionPanel } from "@/features/beds/components/bed-suggestion-panel"
import { DpaStatusBadge } from "@/features/clinical-docs/components/dpa-status-badge"
import {
	useCaptureDpaConsentMutation,
	useCreateEncounterMutation,
} from "@/features/encounters/api/encounters.hooks"
import {
	ConsentCaptureModal,
	type ConsentCapturePayload,
} from "@/features/encounters/components/consent-capture-modal"
import { useOpdTriageQuery } from "@/features/opd-triage/api/opd-triage.hooks"
import { useListCliniciansQuery } from "@/features/patients/api/patients.hooks"

type EncounterType = "emergency" | "inpatient" | "outpatient"
type TabValue = "ER" | "IPD" | "OPD"

interface CreateEncounterFormProps {
	defaultType?: EncounterType
	patientId: string
	patientName: string
	triageId?: string
}

interface EncounterFormErrors {
	attendingStaffId?: string
	bedId?: string
	clinicianStaffId?: string
	staffContext?: string
	submit?: string
	triageIntakeId?: string
}

interface StaffOption {
	department: string | null
	name: string
	staffProfileId: string
}

function tabFromDefaultType(defaultType: EncounterType | undefined): TabValue {
	switch (defaultType) {
		case "emergency":
			return "ER"
		case "inpatient":
			return "IPD"
		case "outpatient":
		default:
			return "OPD"
	}
}

function encounterTypeFromTab(tab: TabValue): EncounterType {
	switch (tab) {
		case "ER":
			return "emergency"
		case "IPD":
			return "inpatient"
		case "OPD":
			return "outpatient"
	}
}

function encounterTypeLabel(tab: TabValue): string {
	switch (tab) {
		case "ER":
			return "Emergency"
		case "IPD":
			return "Inpatient"
		case "OPD":
			return "Outpatient"
	}
}

function formatDateTime(value: Date | string | null | undefined): string {
	if (!value) {
		return "Unavailable"
	}

	return new Date(value).toLocaleString("en-PH", {
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		month: "short",
		year: "numeric",
	})
}

function readErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		if (error.message.trim().startsWith("{")) {
			try {
				const parsed = JSON.parse(error.message) as {
					error?: string
					message?: string
				}
				return parsed.message ?? parsed.error ?? error.message
			} catch {
				return error.message
			}
		}

		return error.message
	}

	if (!error || typeof error !== "object") {
		return ""
	}

	const record = error as Record<string, unknown>

	for (const key of ["message", "error", "data", "cause", "response"]) {
		const value = record[key]
		if (typeof value === "string" && value.trim().length > 0) {
			return value
		}
		if (value && typeof value === "object") {
			const nested = readErrorMessage(value)
			if (nested) {
				return nested
			}
		}
	}

	return ""
}

function getCreateEncounterErrorMessage(error: unknown): string {
	const message = readErrorMessage(error).toLowerCase()

	if (message.includes("consent_required") || message.includes("dpa consent is required")) {
		return "DPA consent is required. Please capture consent first."
	}

	if (message.includes("patient") && message.includes("not found")) {
		return "Patient not found."
	}

	if (
		message.includes("bed") &&
		(message.includes("occupied") || message.includes("not available"))
	) {
		return "Selected bed is no longer available."
	}

	if (message.includes("triage intake")) {
		return "The linked triage intake is no longer available. Start a new OPD triage intake and try again."
	}

	return "Failed to create encounter. Please try again."
}

function FieldErrorText({ message }: { message?: string }) {
	if (!message) {
		return null
	}

	return <p className="text-destructive text-sm">{message}</p>
}

function StaffSelectField({
	error,
	label,
	onValueChange,
	options,
	placeholder,
	value,
}: {
	error?: string
	label: string
	onValueChange: (value: string | null) => void
	options: StaffOption[]
	placeholder: string
	value: string
}) {
	return (
		<div className="space-y-1.5">
			<Label>
				{label} <span className="text-red-500">*</span>
			</Label>
			<Select value={value} onValueChange={onValueChange}>
				<SelectTrigger className="w-full">
					<SelectValue>
						{value ? null : <span className="text-muted-foreground">{placeholder}</span>}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{options.map(option => (
						<SelectItem key={option.staffProfileId} value={option.staffProfileId}>
							{option.name}
							{option.department ? ` — ${option.department}` : ""}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<FieldErrorText message={error} />
		</div>
	)
}

export function CreateEncounterForm({
	defaultType,
	patientId,
	patientName,
	triageId,
}: CreateEncounterFormProps) {
	const router = useRouter()
	const facilityId = useActiveFacilityId()
	const { data: profile } = useMyProfile()
	const createEncounter = useCreateEncounterMutation()
	const captureDpaConsent = useCaptureDpaConsentMutation()

	const activeStaffProfile =
		profile?.staffProfiles?.find(staffProfile => {
			if (!facilityId) {
				return staffProfile.isActive
			}

			return staffProfile.facilityId === facilityId && staffProfile.isActive
		}) ?? profile?.staffProfiles?.[0]

	const staffId = activeStaffProfile?.id ?? ""

	const { data: bedData } = useBedListQuery({ facilityId: facilityId ?? "" })
	const { data: clinicianData } = useListCliniciansQuery(facilityId)
	const { data: triageData, isLoading: isTriageLoading } = useOpdTriageQuery(triageId ?? "", {
		enabled: !!triageId,
	})

	const clinicianOptions = (clinicianData?.data ?? [])
		.map(clinician => ({
			department: clinician.department,
			name: clinician.name,
			staffProfileId: clinician.staffProfileId,
		}))
		.sort((left, right) => left.name.localeCompare(right.name))

	const availableBeds = (bedData?.wards ?? []).flatMap(ward =>
		ward.beds
			.filter(bed => bed.status === "available")
			.map(bed => ({ ...bed, wardName: ward.name, wardType: ward.wardType }))
	)

	const [activeTab, setActiveTab] = useState<TabValue>(tabFromDefaultType(defaultType))
	const [chiefComplaint, setChiefComplaint] = useState("")
	const [clinicianStaffId, setClinicianStaffId] = useState("")
	const [attendingStaffId, setAttendingStaffId] = useState("")
	const [bedId, setBedId] = useState("")
	const [admissionDatetime, setAdmissionDatetime] = useState("")
	const [isConsentModalOpen, setIsConsentModalOpen] = useState(false)
	const [consentError, setConsentError] = useState<string | null>(null)
	const [errors, setErrors] = useState<EncounterFormErrors>({})
	const [hasPrefilledTriageDefaults, setHasPrefilledTriageDefaults] = useState(false)

	const encounterType = encounterTypeFromTab(activeTab)
	const selectedBed = availableBeds.find(bed => bed.id === bedId) ?? null
	const isSubmitting = createEncounter.isPending || captureDpaConsent.isPending

	useEffect(() => {
		if (!triageData || hasPrefilledTriageDefaults) {
			return
		}

		setChiefComplaint(currentValue => currentValue || triageData.chiefComplaint)
		if (triageData.clinicianStaffId) {
			setClinicianStaffId(currentValue => currentValue || triageData.clinicianStaffId || "")
		}
		setHasPrefilledTriageDefaults(true)
	}, [hasPrefilledTriageDefaults, triageData])

	function clearError(field: keyof EncounterFormErrors) {
		setErrors(currentErrors => {
			if (!currentErrors[field]) {
				return currentErrors
			}

			return {
				...currentErrors,
				[field]: undefined,
			}
		})
	}

	function handleTabChange(nextTabValue: string) {
		const nextTab = nextTabValue as TabValue
		if (nextTab === activeTab) {
			return
		}

		setActiveTab(nextTab)
		setClinicianStaffId("")
		setAttendingStaffId("")
		setBedId("")
		setAdmissionDatetime("")
		setErrors({})
	}

	function validateForm(): boolean {
		const nextErrors: EncounterFormErrors = {}

		if (!facilityId || !staffId) {
			nextErrors.staffContext =
				"Your active staff profile could not be resolved for this facility. Refresh the page and try again."
		}

		if (encounterType === "outpatient") {
			if (!triageId) {
				nextErrors.triageIntakeId =
					"An OPD triage intake is required before creating an outpatient encounter."
			}
			if (!clinicianStaffId) {
				nextErrors.clinicianStaffId = "Select the attending clinician for this OPD encounter."
			}
		}

		if (encounterType === "emergency" || encounterType === "inpatient") {
			if (!attendingStaffId) {
				nextErrors.attendingStaffId = "Select the attending provider before continuing."
			}
		}

		if (encounterType === "inpatient" && !bedId) {
			nextErrors.bedId = "Select an available bed before creating this inpatient encounter."
		}

		setErrors(nextErrors)
		return Object.keys(nextErrors).length === 0
	}

	async function handleConsentCaptured(consentPayload: ConsentCapturePayload) {
		if (!facilityId || !staffId) {
			return
		}

		setConsentError(null)

		try {
			await captureDpaConsent.mutateAsync({
				facilityId,
				patientId,
				consentType: "dpa",
				signedByName: consentPayload.signedByName,
				relationship: consentPayload.relationship,
				signatureData: consentPayload.signatureData,
			})
		} catch (error) {
			// Consent failed — keep modal open, show error inside it
			const message =
				getCreateEncounterErrorMessage(error) || "Failed to save DPA consent. Please try again."
			setConsentError(message)
			toast.error(message)
			return
		}

		// Consent saved — close modal and create the encounter
		setIsConsentModalOpen(false)
		setErrors(currentErrors => ({ ...currentErrors, submit: undefined }))

		try {
			const encounterInput = {
				facilityId,
				patientId,
				encounterType,
				chiefComplaint: chiefComplaint.trim() || undefined,
				admittingStaffId: staffId,
				attendingStaffId:
					encounterType === "emergency" || encounterType === "inpatient"
						? attendingStaffId
						: undefined,
				bedId: encounterType === "inpatient" ? bedId : undefined,
				admissionDatetime: admissionDatetime || undefined,
				clinicianStaffId: encounterType === "outpatient" ? clinicianStaffId : undefined,
				triageIntakeId: encounterType === "outpatient" ? triageId : undefined,
				consentCaptured: true,
			} as Parameters<typeof createEncounter.mutateAsync>[0]

			const encounter = await createEncounter.mutateAsync(encounterInput)

			if (encounter.encounterType === "outpatient" && encounter.queueNumber !== null) {
				toast.success(`Encounter created — Queue #${encounter.queueNumber}`)
			} else {
				toast.success("Encounter created")
			}

			router.push(`/patients/${patientId}/encounters/${encounter.id}`)
		} catch (error) {
			const message = getCreateEncounterErrorMessage(error)
			setErrors(currentErrors => ({ ...currentErrors, submit: message }))
			toast.error(message)
		}
	}

	function handleCreateClick() {
		if (isSubmitting) {
			return
		}

		if (!validateForm()) {
			return
		}

		setIsConsentModalOpen(true)
	}

	return (
		<>
			<Card>
				<CardHeader className="space-y-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div className="space-y-1">
							<CardTitle>New Encounter</CardTitle>
							<p className="text-muted-foreground text-sm">{patientName}</p>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="outline">{encounterTypeLabel(activeTab)}</Badge>
							<DpaStatusBadge patientId={patientId} />
						</div>
					</div>

					{errors.staffContext ? (
						<Alert variant="destructive">
							<AlertCircle className="size-4" />
							<AlertTitle>Staff Context Required</AlertTitle>
							<AlertDescription>{errors.staffContext}</AlertDescription>
						</Alert>
					) : null}

					{errors.submit ? (
						<Alert variant="destructive">
							<AlertCircle className="size-4" />
							<AlertTitle>Unable to Create Encounter</AlertTitle>
							<AlertDescription>{errors.submit}</AlertDescription>
						</Alert>
					) : null}
				</CardHeader>

				<CardContent className="space-y-6">
					<Tabs value={activeTab} onValueChange={handleTabChange}>
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="OPD">OPD</TabsTrigger>
							<TabsTrigger value="ER">ER</TabsTrigger>
							<TabsTrigger value="IPD">IPD</TabsTrigger>
						</TabsList>

						<TabsContent value="OPD" className="mt-4 space-y-4">
							{triageId && isTriageLoading ? (
								<div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
									Loading the linked OPD triage intake...
								</div>
							) : triageData ? (
								<div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-950/20">
									<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
										<div>
											<p className="font-medium text-sky-950 dark:text-sky-100">
												Linked Triage Intake
											</p>
											<p className="text-sm text-sky-800 dark:text-sky-200">
												Chief complaint and clinician defaults were pulled from the OPD triage
												workflow.
											</p>
										</div>
										<Badge
											variant="outline"
											className="border-sky-300 text-sky-800 dark:border-sky-700 dark:text-sky-200"
										>
											{triageData.status === "pending_registration"
												? "Pending registration"
												: "Already registered"}
										</Badge>
									</div>

									<div className="grid gap-3 text-sm md:grid-cols-2">
										<div>
											<p className="text-sky-700 dark:text-sky-300">Arrival Time</p>
											<p className="font-medium text-sky-950 dark:text-sky-100">
												{formatDateTime(triageData.arrivalTime)}
											</p>
										</div>
										<div>
											<p className="text-sky-700 dark:text-sky-300">Chief Complaint</p>
											<p className="font-medium text-sky-950 dark:text-sky-100">
												{triageData.chiefComplaint}
											</p>
										</div>
									</div>
								</div>
							) : (
								<Alert className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
									<AlertCircle className="size-4" />
									<AlertTitle>OPD registration starts with triage</AlertTitle>
									<AlertDescription>
										Launch this flow from OPD triage so the intake can be linked before encounter
										creation.
									</AlertDescription>
								</Alert>
							)}

							<StaffSelectField
								label="Attending Clinician"
								options={clinicianOptions}
								placeholder="Select a clinician"
								value={clinicianStaffId}
								onValueChange={value => {
									setClinicianStaffId(value ?? "")
									clearError("clinicianStaffId")
								}}
								error={errors.clinicianStaffId}
							/>

							<FieldErrorText message={errors.triageIntakeId} />
						</TabsContent>

						<TabsContent value="ER" className="mt-4 space-y-4">
							<StaffSelectField
								label="Attending Provider"
								options={clinicianOptions}
								placeholder="Select an attending provider"
								value={attendingStaffId}
								onValueChange={value => {
									setAttendingStaffId(value ?? "")
									clearError("attendingStaffId")
								}}
								error={errors.attendingStaffId}
							/>

							<div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
								Pre-encounter and triage acuity linkage can be added here when the ER
								pre-registration workflow is wired into encounter creation.
							</div>
						</TabsContent>

						<TabsContent value="IPD" className="mt-4 space-y-4">
							<StaffSelectField
								label="Attending Provider"
								options={clinicianOptions}
								placeholder="Select an attending provider"
								value={attendingStaffId}
								onValueChange={value => {
									setAttendingStaffId(value ?? "")
									clearError("attendingStaffId")
								}}
								error={errors.attendingStaffId}
							/>

							<div className="space-y-1.5">
								<Label>Available Bed</Label>
								<BedSuggestionPanel
									encounterType="inpatient"
									availableBeds={availableBeds}
									selectedBedId={bedId}
									onSelect={value => {
										setBedId(value)
										clearError("bedId")
									}}
								/>
								{selectedBed ? (
									<p className="text-muted-foreground text-sm">
										Selected: {selectedBed.wardName} — Bed {selectedBed.bedNumber}
									</p>
								) : null}
								<FieldErrorText message={errors.bedId} />
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="admission-datetime">Admission Datetime</Label>
								<Input
									id="admission-datetime"
									type="datetime-local"
									value={admissionDatetime}
									onChange={event => setAdmissionDatetime(event.target.value)}
								/>
								<p className="text-muted-foreground text-sm">
									Leave this blank to use the server timestamp at creation time.
								</p>
							</div>
						</TabsContent>
					</Tabs>

					<Separator />

					<div className="space-y-1.5">
						<Label htmlFor="encounter-chief-complaint">Chief Complaint</Label>
						<Textarea
							id="encounter-chief-complaint"
							rows={4}
							placeholder="Summarize the patient's presenting concern"
							value={chiefComplaint}
							onChange={event => setChiefComplaint(event.target.value)}
						/>
						<p className="text-muted-foreground text-sm">
							This field is shared across encounter types and stays in place when you switch tabs.
						</p>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row">
						<Button type="button" onClick={handleCreateClick} disabled={isSubmitting}>
							{isSubmitting ? "Creating Encounter..." : "Create Encounter"}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => router.back()}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
					</div>
				</CardContent>
			</Card>

			<ConsentCaptureModal
				open={isConsentModalOpen}
				patientName={patientName}
				submitting={isSubmitting}
				error={consentError}
				onCancel={() => {
					setIsConsentModalOpen(false)
					setConsentError(null)
				}}
				onConsented={payload => void handleConsentCaptured(payload)}
			/>
		</>
	)
}
