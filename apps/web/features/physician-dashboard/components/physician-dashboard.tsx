"use client"

import { useEffect, useMemo, type ComponentType } from "react"
import Link from "next/link"
import {
	AlertTriangle,
	ArrowRight,
	CalendarClock,
	CheckCircle2,
	ClipboardPenLine,
	FileSearch,
	FlaskConical,
	Loader2,
	Search,
	Stethoscope,
	UserRound,
	Video,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import type { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useClinicQueueQuery,
	type UnifiedQueueEntry,
} from "@/features/scheduling/api/scheduling.hooks"
import { todayIsoInManila } from "@/features/scheduling/lib/queue-date"
import {
	formatAppointmentStatusLabel,
	getAppointmentStatusColor,
	useAppointmentsQuery,
	type AppointmentStatus,
	type TelemedicineAppointment,
} from "@/features/telemedicine/api/telemedicine.hooks"

type MyProfile = NonNullable<ReturnType<typeof useMyProfile>["data"]>
type StaffProfile = MyProfile["staffProfiles"][number]

interface Permission {
	module: string
	action: string
}

interface PhysicianDashboardProps {
	profile?: MyProfile
}

const ACTIVE_APPOINTMENT_STATUSES = new Set<AppointmentStatus>([
	"scheduled",
	"confirmed",
	"in-progress",
])

function getActiveStaffProfile(profile: MyProfile | undefined): StaffProfile | undefined {
	const activeRoleId = profile?.activeRole?.id
	return (
		profile?.staffProfiles?.find(sp => sp.roles.some(role => role.id === activeRoleId)) ??
		profile?.staffProfiles?.[0]
	)
}

function toPermissionSet(permissions: Permission[] | undefined) {
	return new Set((permissions ?? []).map(p => `${p.module}:${p.action}`))
}

function formatDateTime(date: string, time?: string | null) {
	if (!date) return ""
	const value = time ? `${date}T${time}` : date
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) return time ? `${date} ${time}` : date
	return parsed.toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: time ? "numeric" : undefined,
		minute: time ? "2-digit" : undefined,
	})
}

function isToday(date: string) {
	const target = new Date(date)
	if (Number.isNaN(target.getTime())) return false
	const now = new Date()
	return (
		target.getFullYear() === now.getFullYear() &&
		target.getMonth() === now.getMonth() &&
		target.getDate() === now.getDate()
	)
}

function queueEntryChartHref(entry: UnifiedQueueEntry) {
	return `/patients/${entry.patientId}/encounters/${entry.encounterId}/documentation`
}

function SectionEmpty({
	icon: Icon,
	title,
	description,
}: {
	icon: ComponentType<{ className?: string }>
	title: string
	description: string
}) {
	return (
		<div className="border-border/60 bg-secondary/30 flex items-start gap-3 rounded-lg border border-dashed p-3">
			<div className="bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border">
				<Icon className="size-4" />
			</div>
			<div className="space-y-1">
				<p className="text-sm font-medium">{title}</p>
				<p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
			</div>
		</div>
	)
}

function WorklistSkeleton() {
	return (
		<div className="space-y-2">
			{[0, 1, 2].map(i => (
				<div key={i} className="flex items-center gap-3 rounded-lg border p-2.5">
					<Skeleton className="size-8 rounded-md" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-44" />
						<Skeleton className="h-3 w-64" />
					</div>
					<Skeleton className="h-7 w-24" />
				</div>
			))}
		</div>
	)
}

function PatientQueueRow({ entry }: { entry: UnifiedQueueEntry }) {
	return (
		<div className="hover:bg-secondary/30 flex flex-col gap-2 rounded-lg border p-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<p className="truncate text-sm font-semibold">{entry.patientName ?? "Unnamed patient"}</p>
					<Badge variant="secondary" className="font-mono text-[0.68rem] tracking-[0.12em]">
						{entry.patientMrn ?? "No MRN"}
					</Badge>
					<Badge variant="outline" className="text-[0.68rem]">
						Queue #{entry.queueNumber ?? "-"}
					</Badge>
				</div>
				<p className="text-muted-foreground text-xs">
					{entry.entryType === "appointment" ? "Appointment" : "Walk-in"} - With doctor
				</p>
			</div>
			<Button
				size="xs"
				className="self-start sm:self-auto"
				nativeButton={false}
				render={<Link href={queueEntryChartHref(entry)} />}
			>
				Start
				<ArrowRight className="size-3.5" />
			</Button>
		</div>
	)
}

function AppointmentRow({ appointment }: { appointment: TelemedicineAppointment }) {
	const isLive = appointment.status === "in-progress"
	const actionLabel = appointment.encounterId ? "Continue" : isLive ? "Open" : "Start"

	return (
		<div className="hover:bg-secondary/30 flex flex-col gap-2 rounded-lg border p-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<p className="truncate text-sm font-semibold">{appointment.patientName}</p>
					<Badge variant="secondary" className="font-mono text-[0.68rem] tracking-[0.12em]">
						{appointment.patientMrn}
					</Badge>
					<span
						className={`inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${getAppointmentStatusColor(
							appointment.status
						)}`}
					>
						{formatAppointmentStatusLabel(appointment.status)}
					</span>
				</div>
				<p className="text-muted-foreground text-xs">
					{formatDateTime(appointment.scheduledDate, appointment.scheduledTime)}
					{appointment.notes ? ` - ${appointment.notes}` : ""}
				</p>
			</div>
			<Button
				asChild
				size="xs"
				variant={isLive ? "default" : "outline"}
				className="self-start sm:self-auto"
			>
				<Link href="/telemedicine">
					{actionLabel}
					<ArrowRight className="size-3.5" />
				</Link>
			</Button>
		</div>
	)
}

function ActionRow({
	icon: Icon,
	title,
	description,
	href,
	label,
	urgent,
}: {
	icon: ComponentType<{ className?: string }>
	title: string
	description: string
	href: string
	label: string
	urgent?: boolean
}) {
	return (
		<div className="flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex min-w-0 items-start gap-3">
				<div
					className={[
						"flex size-8 shrink-0 items-center justify-center rounded-md",
						urgent ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground",
					].join(" ")}
				>
					<Icon className="size-4" />
				</div>
				<div className="min-w-0 space-y-1">
					<p className="text-sm font-semibold">{title}</p>
					<p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
				</div>
			</div>
			<Button
				asChild
				size="xs"
				variant={urgent ? "destructive" : "outline"}
				className="self-start sm:self-auto"
			>
				<Link href={href}>
					{label}
					<ArrowRight className="size-3.5" />
				</Link>
			</Button>
		</div>
	)
}

export function PhysicianDashboard({ profile }: PhysicianDashboardProps) {
	const staffProfile = getActiveStaffProfile(profile)
	const facilityId = staffProfile?.facilityId ?? ""
	const staffProfileId = staffProfile?.id ?? ""
	const roleName = profile?.activeRole?.name ?? "Physician"
	const permSet = useMemo(
		() => toPermissionSet(profile?.activeRole?.permissions),
		[profile?.activeRole?.permissions]
	)
	const canViewOpd = permSet.has("opd:view")
	const canViewPatients = permSet.has("patients:view")
	const canUseTelemedicine = permSet.has("telemedicine:view")

	const clinicQueueQuery = useClinicQueueQuery(
		{ facilityId, clinicianStaffId: staffProfileId || undefined, date: todayIsoInManila() },
		{ refetchInterval: 20_000 }
	)

	const appointmentsQuery = useAppointmentsQuery(facilityId, 1, 25)

	const patientsWaiting = useMemo(() => {
		const entries = clinicQueueQuery.data?.entries ?? []
		return entries
			.filter(entry => entry.status === "in_progress" && !!entry.encounterId)
			.sort((a, b) => (a.queueNumber ?? 9999) - (b.queueNumber ?? 9999))
	}, [clinicQueueQuery.data?.entries])

	const assignedAppointments = useMemo(() => {
		const appointments = appointmentsQuery.data?.data ?? []
		return appointments
			.filter(
				appointment =>
					appointment.clinicianId === staffProfileId &&
					ACTIVE_APPOINTMENT_STATUSES.has(appointment.status)
			)
			.sort((a, b) => {
				const dateCmp = a.scheduledDate.localeCompare(b.scheduledDate)
				return dateCmp !== 0 ? dateCmp : a.scheduledTime.localeCompare(b.scheduledTime)
			})
	}, [appointmentsQuery.data?.data, staffProfileId])

	const currentAppointment =
		assignedAppointments.find(appointment => appointment.status === "in-progress") ?? null
	const todaysAppointments = assignedAppointments.filter(appointment =>
		isToday(appointment.scheduledDate)
	)
	const firstWaitingPatient = patientsWaiting[0]
	const hasCriticalAlert = false

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null
			const isTyping =
				target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable

			if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return

			if (event.key === "/") {
				event.preventDefault()
				document.getElementById("physician-dashboard-search")?.focus()
			}
			if (event.key.toLowerCase() === "n" && canViewOpd) {
				window.location.href = "/opd"
			}
			if (event.key.toLowerCase() === "c") {
				window.location.href = currentAppointment ? "/telemedicine" : "/opd"
			}
			if (event.key.toLowerCase() === "r" && canViewPatients) {
				window.location.href = "/patients/search"
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [canViewOpd, canViewPatients, currentAppointment])

	return (
		<div className="bg-secondary/20 -m-4 min-h-[calc(100vh-4rem)] p-3 md:-m-6 md:p-4 lg:-m-8">
			<div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3">
				<div className="bg-card flex flex-col gap-3 border px-3 py-2.5 shadow-sm md:flex-row md:items-center md:justify-between">
					<div className="min-w-0 space-y-1">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-xl font-bold tracking-tight">Physician Worklist</h1>
							<Badge variant="outline" className="font-normal">
								{roleName}
							</Badge>
						</div>
						<p className="text-muted-foreground text-sm">
							{profile?.user?.name ? `${profile.user.name} - ` : ""}
							clinical actions that need attention now
						</p>
					</div>
					<div className="flex flex-col gap-2 md:min-w-[420px] md:flex-row md:items-center">
						<div className="grid grid-cols-3 gap-1.5 text-center">
							<div className="bg-background rounded-md border px-2 py-1">
								<p className="text-sm font-semibold">{patientsWaiting.length}</p>
								<p className="text-muted-foreground text-[0.65rem]">Waiting</p>
							</div>
							<div className="bg-background rounded-md border px-2 py-1">
								<p className="text-sm font-semibold">{todaysAppointments.length}</p>
								<p className="text-muted-foreground text-[0.65rem]">Virtual</p>
							</div>
							<div className="bg-background rounded-md border px-2 py-1">
								<p className="text-sm font-semibold">{hasCriticalAlert ? 1 : 0}</p>
								<p className="text-muted-foreground text-[0.65rem]">Urgent</p>
							</div>
						</div>
						<div className="relative flex-1">
							<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
							<Input
								id="physician-dashboard-search"
								placeholder="Search patient or MRN..."
								className="h-9 pl-9"
								onKeyDown={event => {
									if (event.key === "Enter") {
										window.location.href = "/patients/search"
									}
								}}
							/>
						</div>
					</div>
				</div>

				<div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
					<div className="space-y-3">
						<Card size="sm" className="gap-0 shadow-sm">
							<CardHeader className="flex flex-row items-center justify-between gap-3 border-b pb-2">
								<div className="space-y-1">
									<CardTitle className="text-base">Now</CardTitle>
									<p className="text-muted-foreground text-xs">The next clinical action to take.</p>
								</div>
								<Badge
									variant={currentAppointment || firstWaitingPatient ? "default" : "secondary"}
								>
									{currentAppointment || firstWaitingPatient ? "Ready" : "Clear"}
								</Badge>
							</CardHeader>
							<CardContent className="pt-3">
								{currentAppointment ? (
									<ActionRow
										icon={Video}
										title={currentAppointment.patientName}
										description={`Virtual encounter in progress - ${currentAppointment.patientMrn}`}
										href="/telemedicine"
										label="Resume"
									/>
								) : firstWaitingPatient ? (
									<ActionRow
										icon={Stethoscope}
										title={firstWaitingPatient.patientName ?? "Unnamed patient"}
										description={`OPD queue #${firstWaitingPatient.queueNumber ?? "-"} - ${firstWaitingPatient.patientMrn ?? "No MRN"}`}
										href={queueEntryChartHref(firstWaitingPatient)}
										label="Start"
									/>
								) : (
									<SectionEmpty
										icon={CheckCircle2}
										title="No active consultation"
										description="Newly arrived OPD patients or active virtual encounters will appear here first."
									/>
								)}
							</CardContent>
						</Card>

						<Card size="sm" className="gap-0 shadow-sm">
							<CardHeader className="flex flex-row items-center justify-between gap-3 border-b pb-2">
								<div className="space-y-1">
									<CardTitle className="text-base">Patients Waiting</CardTitle>
									<p className="text-muted-foreground text-xs">
										Only patients ready for physician action.
									</p>
								</div>
								{clinicQueueQuery.isFetching ? (
									<Loader2 className="text-muted-foreground size-4 animate-spin" />
								) : (
									<Badge variant="outline">{patientsWaiting.length}</Badge>
								)}
							</CardHeader>
							<CardContent className="space-y-2 pt-3">
								{clinicQueueQuery.isLoading ? (
									<WorklistSkeleton />
								) : !canViewOpd ? (
									<SectionEmpty
										icon={Stethoscope}
										title="OPD access unavailable"
										description="This role does not currently have permission to act on the OPD queue."
									/>
								) : patientsWaiting.length ? (
									patientsWaiting
										.slice(0, 6)
										.map(entry => <PatientQueueRow key={entry.id} entry={entry} />)
								) : (
									<SectionEmpty
										icon={UserRound}
										title="No patients waiting"
										description="The queue is clear. Checked-in patients appear here only when the physician step is active."
									/>
								)}
								{canViewOpd && patientsWaiting.length > 0 && (
									<div className="pt-1">
										<Button asChild variant="ghost" size="xs">
											<Link href="/opd">
												Open full OPD queue
												<ArrowRight className="size-3.5" />
											</Link>
										</Button>
									</div>
								)}
							</CardContent>
						</Card>

						<Card size="sm" className="gap-0 shadow-sm">
							<CardHeader className="flex flex-row items-center justify-between gap-3 border-b pb-2">
								<div className="space-y-1">
									<CardTitle className="text-base">Today&apos;s Virtual Visits</CardTitle>
									<p className="text-muted-foreground text-xs">
										Assigned visits that may affect your queue.
									</p>
								</div>
								{appointmentsQuery.isFetching ? (
									<Loader2 className="text-muted-foreground size-4 animate-spin" />
								) : (
									<Badge variant="outline">{todaysAppointments.length}</Badge>
								)}
							</CardHeader>
							<CardContent className="space-y-2 pt-3">
								{appointmentsQuery.isLoading ? (
									<WorklistSkeleton />
								) : !canUseTelemedicine ? (
									<SectionEmpty
										icon={Video}
										title="Telemedicine access unavailable"
										description="Assigned video visits appear here for physicians with telemedicine access."
									/>
								) : todaysAppointments.length ? (
									todaysAppointments
										.slice(0, 4)
										.map(appointment => (
											<AppointmentRow key={appointment.id} appointment={appointment} />
										))
								) : (
									<SectionEmpty
										icon={CalendarClock}
										title="No virtual visits today"
										description="Future appointments stay out of the primary worklist until they are relevant today."
									/>
								)}
								{canUseTelemedicine && todaysAppointments.length > 0 && (
									<div className="pt-1">
										<Button asChild variant="ghost" size="xs">
											<Link href="/telemedicine">
												Open telemedicine
												<ArrowRight className="size-3.5" />
											</Link>
										</Button>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					<div className="space-y-3">
						<Card
							size="sm"
							className={["gap-0 shadow-sm", hasCriticalAlert ? "border-destructive/40" : ""].join(
								" "
							)}
						>
							<CardHeader className="border-b pb-2">
								<CardTitle className="flex items-center gap-2 text-base">
									<AlertTriangle
										className={
											hasCriticalAlert ? "text-destructive size-4" : "text-muted-foreground size-4"
										}
									/>
									Urgent Alerts
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-3">
								<SectionEmpty
									icon={CheckCircle2}
									title="No urgent alerts"
									description="Critical labs, allergy hard stops, high-alert medication checks, and escalations will pin here."
								/>
							</CardContent>
						</Card>

						<Card size="sm" className="gap-0 shadow-sm">
							<CardHeader className="border-b pb-2">
								<CardTitle className="text-base">Pending Actions</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 pt-3">
								<ActionRow
									icon={ClipboardPenLine}
									title="Finish documentation"
									description="Complete draft notes, sign documentation, or close an open consultation."
									href="/patients/search"
									label="Open"
								/>
								<ActionRow
									icon={FlaskConical}
									title="Review results"
									description="Review labs or imaging and act on anything clinically significant."
									href="/patients/search"
									label="Review"
								/>
								<ActionRow
									icon={FileSearch}
									title="Orders and e-Rx"
									description="Create or sign orders, medications, tests, and prescriptions."
									href="/patients/search"
									label="Manage"
								/>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	)
}
