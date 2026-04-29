"use client"

import { useEffect } from "react"
import Link from "next/link"
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
	UserRound,
	Users,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { SidebarTrigger } from "@/core/components/ui/sidebar"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { ConsentHistory } from "@/features/clinical-docs/components/consent-history"
import { DpaStatusBadge } from "@/features/clinical-docs/components/dpa-status-badge"
import { useMyActiveBreakGlassQuery } from "@/features/audit/api/audit.hooks"
import { BreakGlassForm } from "@/features/audit/components/break-glass-form"
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
		<div className="border-border/40 bg-background space-y-2 rounded-lg border px-4 py-4">
			<div className="text-muted-foreground flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.24em] uppercase">
				<Icon className="size-3.5" />
				<span>{label}</span>
			</div>
			<div className="space-y-1">
				<p className={monospace ? "font-mono text-sm font-medium" : "text-sm font-medium"}>
					{value}
				</p>
				{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
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
		<div className="space-y-2">
			<dt className="text-muted-foreground flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.24em] uppercase">
				<Icon className="size-3.5" />
				<span>{label}</span>
			</dt>
			<dd className={monospace ? "font-mono text-sm" : "text-sm"}>{value}</dd>
		</div>
	)
}

interface PatientProfileProps {
	patientId: string
}

const BREAK_GLASS_REQUIRED_MESSAGE = "Break-glass required for this patient chart."

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
	const patientQuery = usePatientProfileQuery(patientId)
	const { data: patient, isLoading, isError, error, refetch: refetchPatient } = patientQuery
	const permSet = usePermissionSet()
	const { data: profile } = useMyProfile()
	const activeStaffProfile = getActiveStaffProfile(profile)
	const activeFacilityId = activeStaffProfile?.facilityId
	const canBreakGlass = can(permSet, "audit", "create")
	const breakGlassRequired =
		error?.message?.includes(BREAK_GLASS_REQUIRED_MESSAGE) ||
		String(error).includes(BREAK_GLASS_REQUIRED_MESSAGE)
	const { data: activeBreakGlass } = useMyActiveBreakGlassQuery({
		facilityId: activeFacilityId,
		patientId,
		staffId: activeStaffProfile?.id,
	})
	const { data: summary } = usePatientSummaryQuery(patient ? patientId : "")

	useEffect(() => {
		if (breakGlassRequired && activeBreakGlass) {
			void refetchPatient()
		}
	}, [activeBreakGlass, breakGlassRequired, refetchPatient])

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
						<Button
							variant="ghost"
							size="sm"
							className="h-8 px-2"
							nativeButton={false}
							render={<Link href="/patients/register" />}
						>
							<ArrowLeft className="size-4" />
							Back to Search
						</Button>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Break-Glass Required</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<p className="text-sm text-muted-foreground">
								This patient chart is outside your regular access scope. Submit an emergency override
								request to unlock temporary read-only access.
							</p>
							<BreakGlassForm
								patientId={patientId}
								facilityId={activeFacilityId}
								entityType="patient"
								entityId={patientId}
								activeEvent={activeBreakGlass}
								onSuccess={() => {
									void refetchPatient()
								}}
							/>
						</CardContent>
					</Card>
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
			<div className="mx-auto max-w-6xl px-8 py-12">
				<div className="mb-8 flex items-center gap-3">
					<div className="md:hidden">
						<SidebarTrigger className="border-border/60 bg-background size-9 rounded-full border shadow-sm" />
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="h-8 px-2"
						nativeButton={false}
						render={<Link href="/patients/register" />}
					>
						<ArrowLeft className="size-4" />
						Back to Search
					</Button>
				</div>

				<section className="mb-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div className="bg-secondary text-muted-foreground flex size-14 items-center justify-center rounded-full">
							<UserRound className="size-6" />
						</div>
						<div className="space-y-3">
							<p className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.24em] uppercase">
								Patient
							</p>
							<div className="space-y-2">
								<h1 className="text-3xl font-semibold tracking-tight">{patientName}</h1>
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
									<DpaStatusBadge patientId={patientId} />
								</div>
							</div>
						</div>
					</div>
				</section>

				<Card className="border-border/60 mb-8 rounded-lg shadow-sm">
					<CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
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

				<Card className="border-border/60 mb-8 rounded-lg shadow-sm">
					<CardHeader className="pb-4">
						<div className="flex items-center gap-2">
							<Users className="text-muted-foreground size-4" />
							<CardTitle className="text-base font-medium tracking-tight">Demographics</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
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

				<Card className="border-border/60 mb-8 rounded-lg shadow-sm">
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
								nativeButton={false}
								render={<Link href={`/patients/${patientId}/encounters/new`} />}
							>
								<Plus className="size-4" />
								New encounter
							</Button>
						)}
					</CardHeader>
					<CardContent>
						{patient.encounters.length > 0 ? (
							<div className="space-y-3">
								{patient.encounters.map(enc => (
									<Link
										key={enc.id}
										href={`/patients/${patientId}/encounters/${enc.id}`}
										className="border-border/60 bg-background hover:bg-secondary/40 block rounded-lg border px-4 py-4 transition-colors"
									>
										<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
											<div className="space-y-3">
												<div className="flex flex-wrap items-center gap-2">
													<Badge variant="secondary">{encounterTypeLabel(enc.encounterType)}</Badge>
													<Badge variant={encounterStatusVariant(enc.status)}>{enc.status}</Badge>
												</div>
												<p className="text-sm font-medium">
													{enc.chiefComplaint ?? "No chief complaint recorded."}
												</p>
											</div>
											<div className="text-muted-foreground space-y-1 text-sm sm:text-right">
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

				{(can(permSet, "clinical_docs", "view") || can(permSet, "orders", "view")) && (
					<div className="mb-8">
						<ProblemsAllergiesTab
							patientId={patientId}
							facilityId={patient.facilityId}
							canWrite={can(permSet, "clinical_docs", "sign")}
						/>
					</div>
				)}

				{can(permSet, "clinical_docs", "view") && (
					<>
						<Separator className="bg-border/60 mb-8" />
						<div className="mb-8">
							<ConsentHistory
								patientId={patientId}
								facilityId={patient.facilityId}
								canManageConsents={can(permSet, "clinical_docs", "edit")}
							/>
						</div>
					</>
				)}
			</div>
		</div>
	)
}
