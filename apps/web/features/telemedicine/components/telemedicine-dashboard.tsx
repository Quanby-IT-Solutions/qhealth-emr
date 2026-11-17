"use client"

import { useState, type ComponentType } from "react"
import {
	Calendar,
	CheckCircle2,
	ClipboardList,
	Clock,
	FileText,
	Lock,
	Pill,
	User,
	Video,
	X,
} from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { canActAsClinicalClinician } from "@/features/app-shell/lib/navigation"
import {
	formatAppointmentStatusLabel,
	getAppointmentStatusColor,
	useAppointmentQuery,
	type TelemedicineAppointment,
} from "@/features/telemedicine/api/telemedicine.hooks"
import { EPrescriptionCard } from "@/features/telemedicine/components/e-prescription-card"
import { PhysicianAppointmentList } from "@/features/telemedicine/components/physician-appointment-list"
import { TeleAbstractPage } from "@/features/telemedicine/components/tele-abstract-page"
import { TelemedicineEncounterForm } from "@/features/telemedicine/components/telemedicine-encounter-form"
import { TelemedicineEncounterSummary } from "@/features/telemedicine/components/telemedicine-encounter-summary"
import { VideoCallPanel } from "@/features/telemedicine/components/video-call-panel"
import { VirtualVisitScheduler } from "@/features/telemedicine/components/virtual-visit-scheduler"
import { formatJoinWindowRange, getJoinWindowState } from "@/features/telemedicine/lib/join-window"

// ============================================================================
// Types
// ============================================================================

type MyProfile = NonNullable<ReturnType<typeof useMyProfile>["data"]>
type StaffProfile = MyProfile["staffProfiles"][number]

type StandardActiveTab = "scheduler" | "encounter" | "video" | "abstract" | "prescription"
type PhysicianActiveTab = "appointments" | "encounter" | "video" | "documents"

interface TabConfig<TTab extends string> {
	id: TTab
	label: string
	icon: ComponentType<{ className?: string }>
	description: string
	completed?: boolean
	disabled?: boolean
	disabledReason?: string
}

// ============================================================================
// Constants
// ============================================================================

const STANDARD_TABS_BASE: TabConfig<StandardActiveTab>[] = [
	{
		id: "scheduler",
		label: "Scheduler",
		icon: Calendar,
		description: "Book video appointments and patient invites",
	},
	{
		id: "encounter",
		label: "Clinical Note",
		icon: ClipboardList,
		description: "Document telemedicine encounter and SOAP notes",
	},
	{
		id: "video",
		label: "Video Call",
		icon: Video,
		description: "Join room and manage patient invite",
	},
	{
		id: "abstract",
		label: "Abstract",
		icon: FileText,
		description: "Generate and sign encounter abstract for patient",
	},
	{
		id: "prescription",
		label: "E-Prescription",
		icon: Pill,
		description: "Generate and share e-prescription",
	},
]

// ============================================================================
// Helpers
// ============================================================================

function isPhysicianRole(roleName?: string | null) {
	return canActAsClinicalClinician(roleName)
}

function getActiveStaffProfile(
	profile: MyProfile | undefined,
	facilityId?: string | null
): StaffProfile | undefined {
	const activeRoleId = profile?.activeRole?.id
	return (
		profile?.staffProfiles?.find(
			sp =>
				(!facilityId || sp.facilityId === facilityId) &&
				sp.roles.some(role => role.id === activeRoleId)
		) ??
		profile?.staffProfiles?.find(sp => !facilityId || sp.facilityId === facilityId) ??
		profile?.staffProfiles?.[0]
	)
}

function formatScheduledDate(val: string): string {
	if (!val) return ""
	const d = new Date(val)
	if (Number.isNaN(d.getTime())) return val
	return d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })
}

function formatScheduledTime(val: string): string {
	if (!val) return ""
	const [h, m] = val.split(":")
	const hour = Number(h)
	const minute = Number(m)
	if (!Number.isFinite(hour) || !Number.isFinite(minute)) return val
	const period = hour >= 12 ? "PM" : "AM"
	const display = hour % 12 === 0 ? 12 : hour % 12
	return `${display}:${String(minute).padStart(2, "0")} ${period}`
}

function TabNavigation<TTab extends string>({
	tabs,
	activeTab,
	onTabChange,
}: {
	tabs: TabConfig<TTab>[]
	activeTab: TTab
	onTabChange: (tab: TTab) => void
}) {
	return (
		<div
			className={`xs:grid-cols-2 grid grid-cols-1 gap-3 ${
				tabs.length === 5 ? "lg:grid-cols-5" : "md:grid-cols-4"
			}`}
		>
			{tabs.map(({ id, label, icon: Icon, description, completed, disabled, disabledReason }) => {
				const isActive = activeTab === id
				return (
					<button
						key={id}
						type="button"
						onClick={() => !disabled && onTabChange(id)}
						disabled={disabled}
						title={disabled ? disabledReason : undefined}
						aria-disabled={disabled}
						className={[
							"relative flex min-w-0 flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-colors",
							disabled
								? "border-muted bg-muted/30 cursor-not-allowed opacity-60"
								: isActive
									? "border-primary bg-primary/5"
									: "border-muted hover:border-primary/30",
						].join(" ")}
					>
						{completed && !disabled && (
							<span className="bg-success text-success-foreground absolute top-2 right-2 flex size-5 items-center justify-center rounded-full">
								<CheckCircle2 className="size-3.5" />
							</span>
						)}
						{disabled && (
							<span className="bg-muted text-muted-foreground absolute top-2 right-2 flex size-5 items-center justify-center rounded-full">
								<Lock className="size-3" />
							</span>
						)}
						<div
							className={[
								"flex size-9 items-center justify-center rounded-lg",
								isActive && !disabled
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground",
							].join(" ")}
						>
							<Icon className="size-4" />
						</div>
						<div className="min-w-0">
							<p className={`text-sm font-semibold ${isActive && !disabled ? "text-primary" : ""}`}>
								{label}
							</p>
							<p className="text-muted-foreground text-xs leading-tight">
								{disabled && disabledReason ? disabledReason : description}
							</p>
						</div>
					</button>
				)
			})}
		</div>
	)
}

function AppointmentContextBanner({
	appointment,
	onClear,
	onChange,
}: {
	appointment: TelemedicineAppointment
	onClear?: () => void
	onChange?: () => void
}) {
	const joinWindowState = getJoinWindowState(appointment)
	const joinWindowText =
		joinWindowState.startsAt && joinWindowState.endsAt
			? `${formatJoinWindowRange(joinWindowState.startsAt, joinWindowState.endsAt)} Philippine time`
			: null
	const statusText =
		joinWindowState.kind === "open"
			? "Video room is open now"
			: joinWindowState.kind === "upcoming"
				? "Video room opens later"
				: joinWindowState.kind === "closed"
					? "Video room window has passed"
					: "Video room unavailable"

	return (
		<div
			className={[
				"flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
				joinWindowState.kind === "closed"
					? "border-destructive/30 bg-destructive/10"
					: joinWindowState.kind === "upcoming"
						? "border-amber-500/30 bg-amber-500/10"
						: "border-primary/20 bg-primary/5",
			].join(" ")}
		>
			<div className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
				<span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full">
					<User className="size-4" />
				</span>
				<div className="min-w-0 space-y-0.5">
					<p className="font-semibold">{appointment.patientName}</p>
					<div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
						<span>{appointment.patientMrn}</span>
						<span className="inline-flex items-center gap-1">
							<Calendar className="size-3" />
							{formatScheduledDate(appointment.scheduledDate)}
						</span>
						<span className="inline-flex items-center gap-1">
							<Clock className="size-3" />
							{formatScheduledTime(appointment.scheduledTime)} · {appointment.durationMinutes} min
						</span>
						<span
							className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getAppointmentStatusColor(
								appointment.status
							)}`}
						>
							{formatAppointmentStatusLabel(appointment.status)}
						</span>
					</div>
					{joinWindowText && (
						<p className="text-muted-foreground text-xs">
							<span className="font-medium">{statusText}.</span> {joinWindowText}
						</p>
					)}
				</div>
			</div>
			<div className="flex w-full flex-wrap gap-2 sm:w-auto">
				{onChange && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onChange}
						className="flex-1 sm:flex-none"
					>
						Change
					</Button>
				)}
				{onClear && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onClear}
						className="flex-1 sm:flex-none"
					>
						<X className="size-3.5" />
						Clear
					</Button>
				)}
			</div>
		</div>
	)
}

function GuidedEmpty({
	icon: Icon,
	title,
	message,
	ctaLabel,
	onCta,
}: {
	icon: ComponentType<{ className?: string }>
	title: string
	message: string
	ctaLabel: string
	onCta: () => void
}) {
	return (
		<Card>
			<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
				<div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
					<Icon className="size-6" />
				</div>
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">{title}</h3>
					<p className="text-muted-foreground max-w-md text-xs">{message}</p>
				</div>
				<Button type="button" size="sm" onClick={onCta}>
					{ctaLabel}
				</Button>
			</CardContent>
		</Card>
	)
}

// ============================================================================
// Main Dashboard
// ============================================================================

export function TelemedicineDashboard() {
	const { data: profile } = useMyProfile()
	const roleName = profile?.activeRole?.name ?? ""

	if (isPhysicianRole(roleName)) {
		return <PhysicianTelemedicineDashboard profile={profile} />
	}

	return <StandardTelemedicineDashboard profile={profile} />
}

function StandardTelemedicineDashboard({ profile }: { profile?: MyProfile }) {
	const [activeTab, setActiveTab] = useState<StandardActiveTab>("scheduler")
	const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
	const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null)
	const [patientInviteTokens, setPatientInviteTokens] = useState<Record<string, string>>({})

	const { data: appointment } = useAppointmentQuery(selectedAppointmentId ?? "")
	const staffProfile = getActiveStaffProfile(profile, appointment?.facilityId)

	const facilityId = staffProfile?.facilityId ?? ""
	const clinicianName = profile?.user?.name ?? ""
	const clinicianPrcNumber = staffProfile?.prcLicenseNumber ?? ""
	const clinicianPtrNumber = staffProfile?.ptrNumber ?? ""
	const clinicianPrcExpiry = staffProfile?.prcExpiry
	const clinicianPtrExpiry = staffProfile?.ptrExpiry
	const facilityName = staffProfile?.facility?.name ?? ""

	const patientName = appointment?.patientName ?? ""
	const patientMrn = appointment?.patientMrn ?? ""
	const patientEmail = appointment?.patientEmail ?? ""
	const currentEncounterId = activeEncounterId ?? appointment?.encounterId ?? null

	function handleAppointmentCreated(appointment: TelemedicineAppointment) {
		setSelectedAppointmentId(appointment.id)
		setActiveEncounterId(null)
		if (appointment.patientInviteToken) {
			setPatientInviteTokens(prev => ({
				...prev,
				[appointment.id]: appointment.patientInviteToken!,
			}))
		}
		setActiveTab("encounter")
	}

	function handleAppointmentSelected(
		appointmentId: string,
		encounterId?: string | null,
		targetTab: "encounter" | "video" = "encounter"
	) {
		setSelectedAppointmentId(appointmentId)
		setActiveEncounterId(encounterId ?? null)
		setActiveTab(targetTab)
	}

	function handleEncounterCreated(encounterId: string) {
		setActiveEncounterId(encounterId)
		setActiveTab("video")
	}

	function handleAbstractSigned() {
		setActiveTab("prescription")
	}

	function handlePatientInviteTokenChange(appointmentId: string, token: string | null) {
		setPatientInviteTokens(prev => {
			if (!token) {
				const next = { ...prev }
				delete next[appointmentId]
				return next
			}
			return { ...prev, [appointmentId]: token }
		})
	}

	const tabs: TabConfig<StandardActiveTab>[] = STANDARD_TABS_BASE.map(t => ({ ...t }))

	return (
		<div className="min-w-0 space-y-6">
			<div>
				<h1 className="text-xl font-bold sm:text-2xl">Telemedicine</h1>
				<p className="text-muted-foreground text-sm">
					Virtual consultations with integrated scheduling, clinical notes, and e-prescriptions
				</p>
			</div>

			<TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

			{activeTab === "scheduler" && (
				<VirtualVisitScheduler
					facilityId={facilityId}
					selectedAppointmentId={selectedAppointmentId}
					onAppointmentCreated={handleAppointmentCreated}
					onAppointmentSelected={handleAppointmentSelected}
				/>
			)}

			{activeTab === "encounter" && (
				<>
					{selectedAppointmentId ? (
						currentEncounterId ? (
							<TelemedicineEncounterSummary
								encounterId={currentEncounterId}
								onLaunchVideo={() => setActiveTab("video")}
								onGenerateAbstract={() => setActiveTab("abstract")}
							/>
						) : (
							<TelemedicineEncounterForm
								appointmentId={selectedAppointmentId}
								facilityId={appointment?.facilityId ?? facilityId}
								patientId={appointment?.patientId ?? ""}
								patientName={patientName}
								clinicianName={clinicianName}
								initialLinkedEncounterId={appointment?.linkedCoreEncounterId ?? null}
								onEncounterCreated={handleEncounterCreated}
							/>
						)
					) : (
						<GuidedEmpty
							icon={ClipboardList}
							title="No appointment selected"
							message="Book an appointment first to create a clinical note for the patient."
							ctaLabel="Go to Scheduler"
							onCta={() => setActiveTab("scheduler")}
						/>
					)}
				</>
			)}

			{activeTab === "video" && (
				<VideoCallPanel
					appointmentId={selectedAppointmentId ?? undefined}
					initialPatientInviteToken={
						selectedAppointmentId ? patientInviteTokens[selectedAppointmentId] : null
					}
					onPatientInviteTokenChange={handlePatientInviteTokenChange}
				/>
			)}

			{activeTab === "abstract" && (
				<>
					{currentEncounterId ? (
						<TeleAbstractPage
							key={currentEncounterId}
							encounterId={currentEncounterId}
							defaultPatientEmail={patientEmail}
							onAbstractSigned={handleAbstractSigned}
						/>
					) : (
						<GuidedEmpty
							icon={FileText}
							title="Encounter required"
							message="Complete a clinical encounter first to generate the medical abstract."
							ctaLabel="Go to Clinical Note"
							onCta={() => setActiveTab("encounter")}
						/>
					)}
				</>
			)}

			{activeTab === "prescription" && (
				<>
					{currentEncounterId ? (
						<EPrescriptionCard
							key={currentEncounterId}
							encounterId={currentEncounterId}
							patientName={patientName}
							patientMrn={patientMrn}
							clinicianName={clinicianName}
							clinicianPrcNumber={clinicianPrcNumber}
							clinicianPtrNumber={clinicianPtrNumber}
							clinicianPrcExpiry={clinicianPrcExpiry}
							clinicianPtrExpiry={clinicianPtrExpiry}
							facilityName={facilityName}
							defaultPatientEmail={patientEmail}
						/>
					) : (
						<GuidedEmpty
							icon={Pill}
							title="Encounter required"
							message="Complete a clinical encounter first to issue an e-prescription."
							ctaLabel="Go to Clinical Note"
							onCta={() => setActiveTab("encounter")}
						/>
					)}
				</>
			)}
		</div>
	)
}

function PhysicianTelemedicineDashboard({ profile }: { profile?: MyProfile }) {
	const [activeTab, setActiveTab] = useState<PhysicianActiveTab>("appointments")
	const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
	const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null)
	const [patientInviteTokens, setPatientInviteTokens] = useState<Record<string, string>>({})

	const { data: appointment } = useAppointmentQuery(selectedAppointmentId ?? "")
	const staffProfile = getActiveStaffProfile(profile, appointment?.facilityId)

	const facilityId = staffProfile?.facilityId ?? ""
	const staffProfileId = staffProfile?.id ?? ""
	const clinicianName = profile?.user?.name ?? ""
	const clinicianPrcNumber = staffProfile?.prcLicenseNumber ?? ""
	const clinicianPtrNumber = staffProfile?.ptrNumber ?? ""
	const clinicianPrcExpiry = staffProfile?.prcExpiry
	const clinicianPtrExpiry = staffProfile?.ptrExpiry
	const facilityName = staffProfile?.facility?.name ?? ""

	const patientName = appointment?.patientName ?? ""
	const patientMrn = appointment?.patientMrn ?? ""
	const patientEmail = appointment?.patientEmail ?? ""
	const currentEncounterId = activeEncounterId ?? appointment?.encounterId ?? null
	const hasAppointment = Boolean(selectedAppointmentId)
	const hasEncounter = Boolean(currentEncounterId)
	const selectedJoinWindowState = appointment ? getJoinWindowState(appointment) : null
	const blocksNewEncounter =
		Boolean(appointment) && !hasEncounter && selectedJoinWindowState?.kind === "closed"

	function handleAppointmentSelected(
		appointmentId: string,
		encounterId?: string | null,
		targetTab: "encounter" | "video" = "encounter"
	) {
		setSelectedAppointmentId(appointmentId)
		setActiveEncounterId(encounterId ?? null)
		setActiveTab(targetTab)
	}

	function handleEncounterCreated(encounterId: string) {
		setActiveEncounterId(encounterId)
		setActiveTab("video")
	}

	function handlePatientInviteTokenChange(appointmentId: string, token: string | null) {
		setPatientInviteTokens(prev => {
			if (!token) {
				const next = { ...prev }
				delete next[appointmentId]
				return next
			}
			return { ...prev, [appointmentId]: token }
		})
	}

	function clearSelection() {
		setSelectedAppointmentId(null)
		setActiveEncounterId(null)
		setActiveTab("appointments")
	}

	const tabs: TabConfig<PhysicianActiveTab>[] = [
		{
			id: "appointments",
			label: "My Appointments",
			icon: Calendar,
			description: "Assigned virtual consultations",
			completed: hasAppointment,
		},
		{
			id: "encounter",
			label: "Encounter",
			icon: ClipboardList,
			description: hasAppointment ? "Document the SOAP note" : "Select an appointment to begin",
			completed: hasEncounter,
			disabled: !hasAppointment || blocksNewEncounter,
			disabledReason: blocksNewEncounter ? "Video window passed" : "Select an appointment first",
		},
		{
			id: "video",
			label: "Video Session",
			icon: Video,
			description: hasAppointment
				? "Join room and manage patient invite"
				: "Select an appointment to begin",
			disabled: !hasAppointment,
			disabledReason: "Select an appointment first",
		},
		{
			id: "documents",
			label: "Abstract / Rx",
			icon: FileText,
			description: hasEncounter
				? "Prepare abstract and e-prescription"
				: "Document the encounter first",
			disabled: !hasEncounter,
			disabledReason: "Encounter required",
		},
	]

	return (
		<div className="min-w-0 space-y-6">
			<div className="space-y-1">
				<h1 className="text-xl font-bold sm:text-2xl">Telemedicine</h1>
				<p className="text-muted-foreground text-sm">
					Your assigned virtual consultations ·{" "}
					{hasAppointment ? "Active patient selected" : "Pick an appointment to begin"}
				</p>
			</div>

			{appointment && hasAppointment && (
				<AppointmentContextBanner
					appointment={appointment}
					onChange={() => setActiveTab("appointments")}
					onClear={clearSelection}
				/>
			)}

			<TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

			{activeTab === "appointments" && (
				<PhysicianAppointmentList
					facilityId={facilityId}
					staffProfileId={staffProfileId}
					selectedAppointmentId={selectedAppointmentId}
					onAppointmentSelected={handleAppointmentSelected}
				/>
			)}

			{activeTab === "encounter" && (
				<>
					{hasAppointment ? (
						hasEncounter && currentEncounterId ? (
							<TelemedicineEncounterSummary
								encounterId={currentEncounterId}
								onLaunchVideo={() => setActiveTab("video")}
								onGenerateAbstract={() => setActiveTab("documents")}
							/>
						) : blocksNewEncounter ? (
							<GuidedEmpty
								icon={ClipboardList}
								title="Video window has passed"
								message="A new encounter cannot be started after the video access window has passed. Mark the appointment as no-show or reschedule if the consultation did not happen."
								ctaLabel="Go to My Appointments"
								onCta={() => setActiveTab("appointments")}
							/>
						) : (
							<TelemedicineEncounterForm
								appointmentId={selectedAppointmentId!}
								facilityId={appointment?.facilityId ?? facilityId}
								patientId={appointment?.patientId ?? ""}
								patientName={patientName}
								clinicianName={clinicianName}
								initialLinkedEncounterId={appointment?.linkedCoreEncounterId ?? null}
								onEncounterCreated={handleEncounterCreated}
							/>
						)
					) : (
						<GuidedEmpty
							icon={ClipboardList}
							title="No appointment selected"
							message="Pick an assigned appointment to document a SOAP note for that patient."
							ctaLabel="Go to My Appointments"
							onCta={() => setActiveTab("appointments")}
						/>
					)}
				</>
			)}

			{activeTab === "video" && (
				<>
					{hasAppointment ? (
						<VideoCallPanel
							appointmentId={selectedAppointmentId ?? undefined}
							initialPatientInviteToken={
								selectedAppointmentId ? patientInviteTokens[selectedAppointmentId] : null
							}
							onPatientInviteTokenChange={handlePatientInviteTokenChange}
						/>
					) : (
						<GuidedEmpty
							icon={Video}
							title="No appointment selected"
							message="Pick an assigned appointment to join the video room and manage the patient invite."
							ctaLabel="Go to My Appointments"
							onCta={() => setActiveTab("appointments")}
						/>
					)}
				</>
			)}

			{activeTab === "documents" && (
				<>
					{hasEncounter && currentEncounterId ? (
						<div className="space-y-4">
							<div className="border-primary/30 bg-primary/10 text-primary rounded-lg border px-4 py-3 text-sm">
								<p className="font-medium">Documents for {patientName}</p>
								<p className="text-primary/80 text-xs">
									Generate the medical abstract and sign before issuing the e-prescription. Both
									documents can be emailed to the patient when finalised.
								</p>
							</div>
							<TeleAbstractPage
								key={`abstract-${currentEncounterId}`}
								encounterId={currentEncounterId}
								defaultPatientEmail={patientEmail}
							/>
							<EPrescriptionCard
								key={`rx-${currentEncounterId}`}
								encounterId={currentEncounterId}
								patientName={patientName}
								patientMrn={patientMrn}
								clinicianName={clinicianName}
								clinicianPrcNumber={clinicianPrcNumber}
								clinicianPtrNumber={clinicianPtrNumber}
								clinicianPrcExpiry={clinicianPrcExpiry}
								clinicianPtrExpiry={clinicianPtrExpiry}
								facilityName={facilityName}
								defaultPatientEmail={patientEmail}
							/>
						</div>
					) : (
						<GuidedEmpty
							icon={FileText}
							title="Encounter required"
							message="Document the clinical encounter first to generate the medical abstract and e-prescription."
							ctaLabel="Go to Encounter"
							onCta={() => setActiveTab("encounter")}
						/>
					)}
				</>
			)}
		</div>
	)
}
