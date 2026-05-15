"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
	ArrowLeft,
	Calendar,
	Clock3,
	CreditCard,
	FileText,
	IdCard,
	Mail,
	MapPin,
	Phone,
	Plus,
	ShieldAlert,
	UserRound,
	Users,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Separator } from "@/core/components/ui/separator"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useMyActiveBreakGlassQuery } from "@/features/audit/api/audit.hooks"
import { BreakGlassCountdown, BreakGlassForm } from "@/features/audit/components/break-glass-form"
import { ConsentHistory } from "@/features/clinical-docs/components/consent-history"
import { DpaStatusBadge } from "@/features/clinical-docs/components/dpa-status-badge"
import { usePatientProfileQuery } from "@/features/patients/api/patients.hooks"
import { usePatientSummaryQuery } from "@/features/problems-allergies/api/problems-allergies.hooks"
import { ProblemsAllergiesTab } from "@/features/problems-allergies/components/problems-allergies-tab"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

function canCreateRegistrarEncounter(permSet: Set<string>) {
	return can(permSet, "adt", "create") && can(permSet, "patients", "edit")
}

function formatDate(dateVal: Date | string | null | undefined) {
	if (!dateVal) return "—"
	const d = dateVal instanceof Date ? dateVal : new Date(dateVal)
	return d.toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function formatDateTime(dateVal: Date | string | null | undefined) {
	if (!dateVal) return "—"
	const d = dateVal instanceof Date ? dateVal : new Date(dateVal)
	return d.toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function formatPatientName({
	firstName,
	middleName,
	lastName,
}: {
	firstName: string
	middleName: string | null
	lastName: string
}) {
	return [firstName, middleName, lastName].filter(Boolean).join(" ")
}

function formatSex(sex: string) {
	return sex.charAt(0).toUpperCase() + sex.slice(1)
}

function formatAddress(parts: Array<string | null | undefined>) {
	return parts.filter(Boolean).join(", ") || "—"
}

function calculateAge(dateOfBirth: string): string {
	const dob = new Date(dateOfBirth)
	const today = new Date()
	let age = today.getFullYear() - dob.getFullYear()
	const monthDiff = today.getMonth() - dob.getMonth()
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
		age--
	}
	return `${age} yrs`
}

function encounterStatusVariant(status: string) {
	switch (status) {
		case "active":
			return "default" as const
		case "discharged":
			return "secondary" as const
		case "closed":
			return "outline" as const
		case "cancelled":
			return "destructive" as const
		default:
			return "outline" as const
	}
}

function encounterTypeLabel(type: string) {
	switch (type) {
		case "outpatient":
			return "OPD"
		case "emergency":
			return "ER"
		case "inpatient":
			return "IPD"
		case "telemedicine":
			return "Telemedicine"
		default:
			return type
	}
}

function StatCell({
	icon: Icon,
	label,
	value,
	hint,
	monospace,
}: {
	icon: typeof Calendar
	label: string
	value: string
	hint?: string
	monospace?: boolean
}) {
	return (
		<div className="border-border/40 bg-background min-w-0 space-y-2 rounded-lg border px-3 py-3 sm:px-4 sm:py-4">
			<div className="text-muted-foreground flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.24em] uppercase">
				<Icon className="size-3.5 shrink-0" />
				<span className="min-w-0 truncate">{label}</span>
			</div>
			<div className="space-y-1">
				<p
					className={
						monospace
							? "break-all font-mono text-sm font-medium"
							: "break-words text-sm font-medium"
					}
				>
					{value}
				</p>
				{hint && <p className="text-muted-foreground break-words text-xs">{hint}</p>}
			</div>
		</div>
	)
}

function DetailItem({
	icon: Icon,
	label,
	value,
	monospace,
}: {
	icon: typeof MapPin
	label: string
	value: string
	monospace?: boolean
}) {
	return (
		<div className="min-w-0 space-y-2">
			<dt className="text-muted-foreground flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.24em] uppercase">
				<Icon className="size-3.5 shrink-0" />
				<span className="min-w-0 truncate">{label}</span>
			</dt>
			<dd className={monospace ? "break-all font-mono text-sm" : "break-words text-sm"}>{value}</dd>
		</div>
	)
}

interface PatientProfileProps {
	patientId: string
}

const BREAK_GLASS_REQUIRED_MESSAGE = "Break-glass required for this patient chart."

function isBreakGlassRequiredError(error: unknown) {
	if (!error || typeof error !== "object") return false

	const candidate = error as {
		status?: number
		message?: string
		data?: {
			backendCode?: string | null
		} | null
	}

	const hasBreakGlassMessage =
		candidate.message?.includes(BREAK_GLASS_REQUIRED_MESSAGE) === true ||
		String(error).includes(BREAK_GLASS_REQUIRED_MESSAGE)

	return hasBreakGlassMessage
}

function getActiveStaffProfile(
	profile:
		| {
				staffProfiles?: Array<{ id: string; facilityId: string; roles: Array<{ id: string }> }>
				activeRole?: { id: string } | null
		  }
		| undefined
) {
	return (
		profile?.staffProfiles?.find(staffProfile =>
			staffProfile.roles.some(role => role.id === profile?.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]
	)
}

export function PatientProfile({ patientId }: PatientProfileProps) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const sourceFromQuery = searchParams.get("from")
	const [source, setSource] = useState<string | null>(sourceFromQuery)
	const [breakGlassOpen, setBreakGlassOpen] = useState(false)

	useEffect(() => {
		if (sourceFromQuery === "list" || sourceFromQuery === "register") {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the navigation source into local state and session storage
			setSource(sourceFromQuery)
			sessionStorage.setItem("patientProfileSource", sourceFromQuery)
			return
		}

		const storedSource = sessionStorage.getItem("patientProfileSource")
		if (storedSource === "list" || storedSource === "register") {
			setSource(storedSource)
		}
	}, [sourceFromQuery])

	const handleBackToPrevious = () => {
		if (source === "list") {
			router.push("/patients/search")
			return
		}
		if (source === "register") {
			router.push("/patients/register")
			return
		}
		router.back()
	}
	const patientQuery = usePatientProfileQuery(patientId)
	const { data: patient, isLoading, isError, error, refetch: refetchPatient } = patientQuery
	const permSet = usePermissionSet()
	const { data: profile } = useMyProfile()
	const activeStaffProfile = getActiveStaffProfile(profile)
	const activeFacilityId = activeStaffProfile?.facilityId
	const canBreakGlass = can(permSet, "audit", "create")
	const canViewClinicalSummary = can(permSet, "clinical_docs", "view")
	const breakGlassRequired = isBreakGlassRequiredError(error)
	const { data: activeBreakGlass, refetch: refetchActiveBreakGlass } = useMyActiveBreakGlassQuery({
		facilityId: activeFacilityId,
		patientId,
		enabled: canBreakGlass,
	})
	const { data: summary } = usePatientSummaryQuery(patient ? patientId : "", {
		enabled: !!patient && canViewClinicalSummary,
	})

	useEffect(() => {
		if (breakGlassRequired && activeBreakGlass) {
			void refetchPatient()
		}
	}, [activeBreakGlass, breakGlassRequired, refetchPatient])

	useEffect(() => {
		if (!activeBreakGlass?.accessExpiresAt) return

		const expiresAtMs = new Date(activeBreakGlass.accessExpiresAt).getTime()
		const refreshDelayMs = expiresAtMs - Date.now() + 1000

		if (refreshDelayMs <= 0) {
			void refetchActiveBreakGlass()
			void refetchPatient()
			return
		}

		const timeoutId = window.setTimeout(() => {
			void refetchActiveBreakGlass()
			void refetchPatient()
		}, refreshDelayMs)

		return () => window.clearTimeout(timeoutId)
	}, [activeBreakGlass?.accessExpiresAt, refetchActiveBreakGlass, refetchPatient])

	useEffect(() => {
		if (breakGlassRequired && canBreakGlass && activeFacilityId) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- opens the required access dialog once the access context is known
			setBreakGlassOpen(true)
		}
	}, [activeFacilityId, breakGlassRequired, canBreakGlass])

	if (isLoading) {
		return (
			<div className="bg-background">
				<div className="text-muted-foreground mx-auto flex min-h-48 max-w-6xl items-center justify-center px-8 py-12">
					Loading patient profile…
				</div>
			</div>
		)
	}

	if (isError) {
		if (breakGlassRequired && canBreakGlass && activeFacilityId) {
			return (
				<div className="space-y-6">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleBackToPrevious}>
							<ArrowLeft className="size-4" />
							Back to Search
						</Button>
					</div>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<ShieldAlert className="size-4 text-orange-600" />
								Restricted Patient Record
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<p className="text-muted-foreground text-sm">
								This patient chart is outside your regular access scope. Use the break-glass dialog
								to request temporary emergency access without leaving this patient route.
							</p>
							<div className="flex flex-wrap items-center gap-3">
								<Button onClick={() => setBreakGlassOpen(true)}>
									{activeBreakGlass ? "Break-Glass Active" : "Request Break-Glass"}
								</Button>
								{activeBreakGlass?.accessExpiresAt ? (
									<BreakGlassCountdown accessExpiresAt={activeBreakGlass.accessExpiresAt} />
								) : null}
							</div>
						</CardContent>
					</Card>

					<Dialog open={breakGlassOpen} onOpenChange={setBreakGlassOpen}>
						<DialogContent className="max-w-2xl">
							<DialogHeader>
								<div className="flex items-center gap-3">
									<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
										<ShieldAlert className="size-5 text-orange-600 dark:text-orange-400" />
									</div>
									<div>
										<DialogTitle className="text-lg">Emergency Override Access</DialogTitle>
										<DialogDescription className="mt-0.5">
											Break-glass request required to access this patient record.
										</DialogDescription>
									</div>
								</div>
							</DialogHeader>
							<BreakGlassForm
								patientId={patientId}
								facilityId={activeFacilityId}
								entityType="patient"
								entityId={patientId}
								activeEvent={activeBreakGlass}
								onSuccess={() => {
									setBreakGlassOpen(false)
									void refetchPatient()
								}}
								onCancel={() => setBreakGlassOpen(false)}
							/>
						</DialogContent>
					</Dialog>
				</div>
			)
		}

		return (
			<div className="bg-background">
				<div className="text-destructive mx-auto flex min-h-48 max-w-6xl items-center justify-center px-8 py-12">
					Failed to load patient: {error.message}
				</div>
			</div>
		)
	}

	if (!patient) return null

	const patientName = formatPatientName(patient)
	const emergencyContact = patient.emergencyContactName
		? `${patient.emergencyContactName}${patient.emergencyContactPhone ? ` (${patient.emergencyContactPhone})` : ""}`
		: "—"
	const nextOfKin = patient.nextOfKinName
		? `${patient.nextOfKinName}${patient.nextOfKinRelationship ? ` — ${patient.nextOfKinRelationship}` : ""}`
		: "—"

	return (
		<div className="bg-background">
			<div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 lg:px-8">
				<div className="mb-6 flex flex-wrap items-center gap-3 sm:mb-8">
					<Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleBackToPrevious}>
						<ArrowLeft className="size-4" />
						Back to Search
					</Button>
				</div>

				<section className="mb-6 sm:mb-8">
					<div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="bg-secondary text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-full sm:size-14">
							<UserRound className="size-6" />
						</div>
						<div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div className="min-w-0 space-y-3">
								<p className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.24em] uppercase">
									Patient
								</p>
								<div className="space-y-2">
									<h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
										{patientName}
									</h1>
									<div className="flex flex-wrap items-center gap-3">
										<Badge variant="secondary" className="font-mono">
											{patient.mrn}
										</Badge>
										<span className="text-muted-foreground text-sm">
											{patient.isActive ? "Active record" : "Inactive record"}
										</span>
										{summary?.hasSevereAllergies && (
											<Badge variant="destructive">Severe Allergy</Badge>
										)}
										{summary && summary.activeAllergyCount > 0 && !summary.hasSevereAllergies && (
											<Badge variant="outline">
												{summary.activeAllergyCount} Allerg
												{summary.activeAllergyCount === 1 ? "y" : "ies"}
											</Badge>
										)}
										{canViewClinicalSummary && <DpaStatusBadge patientId={patientId} />}
									</div>
								</div>
							</div>

							{activeBreakGlass ? (
								<Button
									variant="outline"
									className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 sm:w-fit"
									onClick={() => setBreakGlassOpen(true)}
								>
									<ShieldAlert className="size-4" />
									Break-Glass Active
								</Button>
							) : null}
						</div>
					</div>
				</section>

				{activeBreakGlass ? (
					<Card className="mb-6 border-orange-300 bg-orange-50/60 shadow-sm sm:mb-8">
						<CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="min-w-0 space-y-1">
								<div className="flex items-center gap-2">
									<ShieldAlert className="size-4 shrink-0 text-orange-700" />
									<p className="text-sm font-medium text-orange-900">
										Temporary Break-Glass Access Active
									</p>
								</div>
								<p className="text-sm text-orange-800">
									Access to this patient record is temporary and will expire automatically. This
									does not grant permanent access.
								</p>
								<p className="text-xs text-orange-700">
									Expires at {formatDateTime(activeBreakGlass.accessExpiresAt)}
								</p>
							</div>
							<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
								<BreakGlassCountdown accessExpiresAt={activeBreakGlass.accessExpiresAt} />
								<Button
									variant="outline"
									className="w-full border-orange-300 text-orange-700 hover:bg-orange-100 sm:w-fit"
									onClick={() => setBreakGlassOpen(true)}
								>
									View Access Session
								</Button>
							</div>
						</CardContent>
					</Card>
				) : null}

				<Card className="border-border/60 mb-6 rounded-lg shadow-sm sm:mb-8">
					<CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6 xl:grid-cols-4">
						<StatCell
							icon={Calendar}
							label="Date of Birth"
							value={formatDate(patient.dateOfBirth)}
							hint={`(${calculateAge(patient.dateOfBirth)})`}
						/>
						<StatCell icon={UserRound} label="Sex" value={formatSex(patient.sex)} />
						<StatCell icon={Phone} label="Phone" value={patient.phone ?? "—"} monospace />
						<StatCell icon={IdCard} label="MRN" value={patient.mrn} monospace />
					</CardContent>
				</Card>

				<Card className="border-border/60 mb-6 rounded-lg shadow-sm sm:mb-8">
					<CardHeader className="pb-4">
						<div className="flex items-center gap-2">
							<Users className="text-muted-foreground size-4" />
							<CardTitle className="text-base font-medium tracking-tight">Demographics</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<dl className="grid min-w-0 gap-x-8 gap-y-6 md:grid-cols-2">
							<DetailItem
								icon={MapPin}
								label="Address"
								value={formatAddress([
									patient.addressLine1,
									patient.addressLine2,
									patient.city,
									patient.province,
									patient.zipCode,
								])}
							/>
							<DetailItem icon={Mail} label="Email" value={patient.email ?? "—"} />
							<DetailItem
								icon={CreditCard}
								label="PhilHealth ID"
								value={patient.philhealthMemberId ?? "—"}
								monospace
							/>
							<DetailItem icon={Phone} label="Emergency Contact" value={emergencyContact} />
							<DetailItem icon={Users} label="Next of Kin" value={nextOfKin} />
						</dl>
					</CardContent>
				</Card>

				<Card className="border-border/60 mb-6 rounded-lg shadow-sm sm:mb-8">
					<CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2">
							<Clock3 className="text-muted-foreground size-4" />
							<CardTitle className="text-base font-medium tracking-tight">
								Encounter History
							</CardTitle>
						</div>
						{canCreateRegistrarEncounter(permSet) && (
							<Button
								size="sm"
								variant="outline"
								className="w-full sm:w-fit"
								nativeButton={false}
								render={<Link href={`/patients/${patientId}/encounters/new`} />}
							>
								<Plus className="size-4" />
								New encounter
							</Button>
						)}
					</CardHeader>
					<CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
						{patient.encounters.length > 0 ? (
							<div className="space-y-3">
								{patient.encounters.map(enc => (
									<Link
										key={enc.id}
										href={`/patients/${patientId}/encounters/${enc.id}`}
										className="border-border/60 bg-background hover:bg-secondary/40 block rounded-lg border px-3 py-4 transition-colors sm:px-4"
									>
										<div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(190px,auto)] lg:items-start">
											<div className="min-w-0 space-y-3">
												<div className="flex flex-wrap items-center gap-2">
													<Badge variant="secondary">{encounterTypeLabel(enc.encounterType)}</Badge>
													<Badge variant={encounterStatusVariant(enc.status)}>{enc.status}</Badge>
												</div>
												<p className="break-words text-sm font-medium">
													{enc.chiefComplaint ?? "No chief complaint recorded."}
												</p>
											</div>
											<div className="text-muted-foreground space-y-1 text-sm lg:text-right">
												<p>{formatDateTime(enc.admissionDatetime)}</p>
												<p>
													{enc.dischargeDatetime ? formatDateTime(enc.dischargeDatetime) : "Active"}
												</p>
											</div>
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className="border-border/60 bg-secondary/30 rounded-lg border border-dashed px-6 py-12 text-center">
								<div className="mx-auto flex max-w-sm flex-col items-center gap-3">
									<div className="bg-background text-muted-foreground flex size-10 items-center justify-center rounded-full shadow-sm">
										<FileText className="size-4" />
									</div>
									<div className="space-y-1">
										<p className="text-sm font-medium">No encounters on record.</p>
										<p className="text-muted-foreground text-sm">
											Start a new encounter to capture the patient’s next visit and route them into
											the clinic workflow.
										</p>
									</div>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{canViewClinicalSummary && (
					<div className="mb-6 min-w-0 sm:mb-8">
						<ProblemsAllergiesTab
							patientId={patientId}
							facilityId={patient.facilityId}
							canWrite={can(permSet, "clinical_docs", "sign")}
						/>
					</div>
				)}

				{can(permSet, "clinical_docs", "view") && (
					<>
						<Separator className="bg-border/60 mb-6 sm:mb-8" />
						<div className="mb-6 min-w-0 sm:mb-8">
							<ConsentHistory
								patientId={patientId}
								facilityId={patient.facilityId}
								canManageConsents={can(permSet, "clinical_docs", "edit")}
							/>
						</div>
					</>
				)}

				<Dialog open={breakGlassOpen} onOpenChange={setBreakGlassOpen}>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<div className="flex items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
									<ShieldAlert className="size-5 text-orange-600 dark:text-orange-400" />
								</div>
								<div>
									<DialogTitle className="text-lg">Emergency Override Access</DialogTitle>
									<DialogDescription className="mt-0.5">
										Review the active break-glass session or request a temporary override for this
										patient record.
									</DialogDescription>
								</div>
							</div>
						</DialogHeader>
						<BreakGlassForm
							patientId={patientId}
							facilityId={patient.facilityId}
							entityType="patient"
							entityId={patientId}
							activeEvent={activeBreakGlass}
							onSuccess={() => {
								setBreakGlassOpen(false)
								void refetchPatient()
							}}
							onCancel={() => setBreakGlassOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	)
}
