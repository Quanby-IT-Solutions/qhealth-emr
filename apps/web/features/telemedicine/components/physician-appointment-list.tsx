"use client"

import { useMemo, useState } from "react"
import {
	AlertCircle,
	ArrowRight,
	Calendar,
	CheckCircle2,
	Clock,
	Info,
	Loader2,
	Search,
	User,
	Video,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	APPOINTMENT_STATUSES,
	formatAppointmentStatusLabel,
	getAppointmentStatusColor,
	getPlatformLabel,
	useAppointmentsQuery,
	type AppointmentStatus,
	type TelemedicineAppointment,
} from "@/features/telemedicine/api/telemedicine.hooks"

interface PhysicianAppointmentListProps {
	facilityId: string
	staffProfileId: string
	selectedAppointmentId?: string | null
	onAppointmentSelected?: (appointmentId: string, encounterId?: string | null) => void
}

type StatusFilter = AppointmentStatus | "all"
type DateBucket = "today" | "upcoming" | "past"

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
	{ value: "all", label: "All statuses" },
	...APPOINTMENT_STATUSES.map(s => ({
		value: s as StatusFilter,
		label: formatAppointmentStatusLabel(s),
	})),
]

const BUCKET_LABELS: Record<DateBucket, string> = {
	today: "Today",
	upcoming: "Upcoming",
	past: "Past",
}

function startOfDay(date: Date): Date {
	const d = new Date(date)
	d.setHours(0, 0, 0, 0)
	return d
}

function parseScheduledDateTime(scheduledDate: string, scheduledTime: string): Date | null {
	const d = new Date(`${scheduledDate}T${scheduledTime}`)
	return Number.isNaN(d.getTime()) ? null : d
}

function getDateBucket(scheduledDate: string): DateBucket {
	const today = startOfDay(new Date())
	const target = startOfDay(new Date(scheduledDate))
	if (target.getTime() === today.getTime()) return "today"
	return target.getTime() > today.getTime() ? "upcoming" : "past"
}

function formatDate(val: string): string {
	if (!val) return "-"
	const d = new Date(val)
	if (Number.isNaN(d.getTime())) return val
	return d.toLocaleDateString("en-PH", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

function formatTime(val: string): string {
	if (!val) return "-"
	const [h, m] = val.split(":")
	const hour = Number(h)
	const minute = Number(m)
	if (!Number.isFinite(hour) || !Number.isFinite(minute)) return val
	const period = hour >= 12 ? "PM" : "AM"
	const displayHour = hour % 12 === 0 ? 12 : hour % 12
	return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`
}

function getStartsSoonMinutes(appt: TelemedicineAppointment): number | null {
	const start = parseScheduledDateTime(appt.scheduledDate, appt.scheduledTime)
	if (!start) return null
	const diffMs = start.getTime() - Date.now()
	return Math.round(diffMs / 60000)
}

function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
	return (
		<span
			className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getAppointmentStatusColor(status)}`}
		>
			{formatAppointmentStatusLabel(status)}
		</span>
	)
}

function AppointmentSkeleton() {
	return (
		<div className="flex items-start gap-4 py-4">
			<Skeleton className="size-10 shrink-0 rounded-full" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-4 w-48" />
				<Skeleton className="h-3 w-72" />
				<Skeleton className="h-3 w-40" />
			</div>
			<Skeleton className="h-9 w-32" />
		</div>
	)
}

function AppointmentRow({
	appt,
	isSelected,
	onSelect,
}: {
	appt: TelemedicineAppointment
	isSelected: boolean
	onSelect: () => void
}) {
	const startsInMin = getStartsSoonMinutes(appt)
	const startingSoon = startsInMin !== null && startsInMin >= -15 && startsInMin <= 30
	const isLive = appt.status === "in-progress"
	const hasEncounter = Boolean(appt.encounterId)
	const isCompleted = appt.status === "completed"
	const isCancelled = appt.status === "cancelled" || appt.status === "no-show"

	let ctaLabel: string
	let ctaVariant: "default" | "secondary" | "outline" = "default"
	if (isCancelled) {
		ctaLabel = "View Details"
		ctaVariant = "outline"
	} else if (isCompleted) {
		ctaLabel = "Review"
		ctaVariant = "secondary"
	} else if (hasEncounter) {
		ctaLabel = "Continue Encounter"
		ctaVariant = "secondary"
	} else {
		ctaLabel = "Start Encounter"
		ctaVariant = "default"
	}

	return (
		<div
			className={[
				"flex items-start gap-4 rounded-lg border p-3 transition-colors",
				isSelected
					? "border-primary bg-primary/5"
					: "border-transparent hover:border-muted hover:bg-muted/30",
			].join(" ")}
		>
			<div
				className={[
					"flex size-10 shrink-0 items-center justify-center rounded-full",
					isLive
						? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
						: "bg-primary/10 text-primary",
				].join(" ")}
			>
				<Video className="size-5" />
			</div>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm font-semibold">{appt.patientName}</span>
					<Badge variant="outline" className="text-xs">
						{appt.patientMrn}
					</Badge>
					<AppointmentStatusBadge status={appt.status} />
					{hasEncounter && (
						<Badge className="bg-success/15 text-success border-success/30 text-xs">
							<CheckCircle2 className="mr-1 size-3" />
							Encounter started
						</Badge>
					)}
					{startingSoon && !isCompleted && !isCancelled && (
						<Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs">
							{startsInMin !== null && startsInMin <= 0
								? `Started ${Math.abs(startsInMin)}m ago`
								: `Starts in ${startsInMin}m`}
						</Badge>
					)}
					{isSelected && <Badge className="bg-primary text-primary-foreground text-xs">Selected</Badge>}
				</div>
				<div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
					<span className="flex items-center gap-1">
						<Calendar className="size-3" />
						{formatDate(appt.scheduledDate)}
					</span>
					<span className="flex items-center gap-1">
						<Clock className="size-3" />
						{formatTime(appt.scheduledTime)} · {appt.durationMinutes} min
					</span>
					<span className="flex items-center gap-1">
						<Video className="size-3" />
						{getPlatformLabel(appt.platform)}
					</span>
					{appt.clinicianName && (
						<span className="flex items-center gap-1">
							<User className="size-3" />
							{appt.clinicianName}
						</span>
					)}
				</div>
				{appt.notes && (
					<p className="text-muted-foreground line-clamp-2 text-xs italic">{appt.notes}</p>
				)}
			</div>
			<Button
				type="button"
				size="sm"
				variant={ctaVariant}
				onClick={onSelect}
				className="shrink-0"
			>
				{ctaLabel}
				<ArrowRight className="ml-1.5 size-3.5" />
			</Button>
		</div>
	)
}

export function PhysicianAppointmentList({
	facilityId,
	staffProfileId,
	selectedAppointmentId,
	onAppointmentSelected,
}: PhysicianAppointmentListProps) {
	const [search, setSearch] = useState("")
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

	const { data, error, isLoading, isFetching, refetch } = useAppointmentsQuery(facilityId)

	const assignedAppointments = useMemo(
		() => data?.data.filter(appt => appt.clinicianId === staffProfileId) ?? [],
		[data, staffProfileId]
	)

	const filteredAppointments = useMemo(() => {
		const term = search.trim().toLowerCase()
		return assignedAppointments.filter(appt => {
			if (statusFilter !== "all" && appt.status !== statusFilter) return false
			if (!term) return true
			return (
				appt.patientName.toLowerCase().includes(term) ||
				appt.patientMrn.toLowerCase().includes(term) ||
				(appt.notes ?? "").toLowerCase().includes(term)
			)
		})
	}, [assignedAppointments, search, statusFilter])

	const grouped = useMemo(() => {
		const buckets: Record<DateBucket, TelemedicineAppointment[]> = {
			today: [],
			upcoming: [],
			past: [],
		}
		for (const appt of filteredAppointments) {
			buckets[getDateBucket(appt.scheduledDate)].push(appt)
		}
		buckets.today.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
		buckets.upcoming.sort((a, b) => {
			const dateCmp = a.scheduledDate.localeCompare(b.scheduledDate)
			return dateCmp !== 0 ? dateCmp : a.scheduledTime.localeCompare(b.scheduledTime)
		})
		buckets.past.sort((a, b) => {
			const dateCmp = b.scheduledDate.localeCompare(a.scheduledDate)
			return dateCmp !== 0 ? dateCmp : b.scheduledTime.localeCompare(a.scheduledTime)
		})
		return buckets
	}, [filteredAppointments])

	const hasResults = filteredAppointments.length > 0
	const hasAssigned = assignedAppointments.length > 0
	const profileMissing = !facilityId || !staffProfileId

	return (
		<div className="space-y-4">
			<div className="border-primary/30 bg-primary/10 text-primary flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
				<Info className="mt-0.5 size-4 shrink-0" />
				<div className="space-y-1">
					<p className="font-medium">Only your assigned consultations are shown</p>
					<p className="text-primary/80">
						Contact the scheduler to book new appointments. Encounters can only be started when an
						appointment is assigned to you.
					</p>
				</div>
			</div>

			<Card>
				<CardHeader className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<CardTitle className="text-base">Assigned Virtual Appointments</CardTitle>
							<p className="text-muted-foreground text-sm">
								{hasAssigned
									? `${assignedAppointments.length} total · ${grouped.today.length} today · ${grouped.upcoming.length} upcoming`
									: "Pick an appointment to start or continue an encounter."}
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void refetch()}
							disabled={isFetching || profileMissing}
						>
							{isFetching ? (
								<Loader2 className="mr-1.5 size-3.5 animate-spin" />
							) : null}
							Refresh
						</Button>
					</div>
					{hasAssigned && (
						<div className="flex flex-col gap-2 sm:flex-row">
							<div className="relative flex-1">
								<Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
								<Input
									value={search}
									onChange={e => setSearch(e.target.value)}
									placeholder="Search by patient, MRN, or notes..."
									className="pl-9"
								/>
							</div>
							<Select
								value={statusFilter}
								onValueChange={v => setStatusFilter(v as StatusFilter)}
							>
								<SelectTrigger className="sm:w-48">
									<SelectValue>
										{STATUS_FILTERS.find(o => o.value === statusFilter)?.label ?? "All statuses"}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{STATUS_FILTERS.map(opt => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</CardHeader>
				<CardContent>
					{profileMissing ? (
						<div className="flex flex-col items-center gap-2 py-10 text-center">
							<AlertCircle className="text-muted-foreground size-8" />
							<p className="text-sm font-medium">Staff profile unavailable</p>
							<p className="text-muted-foreground max-w-md text-xs">
								Your account is not linked to a facility staff profile, so we can't load assigned
								telemedicine appointments. Contact your administrator.
							</p>
						</div>
					) : isLoading ? (
						<div className="divide-y">
							<AppointmentSkeleton />
							<AppointmentSkeleton />
							<AppointmentSkeleton />
						</div>
					) : error ? (
						<div className="flex flex-col items-center gap-3 py-8 text-center">
							<AlertCircle className="text-destructive size-8" />
							<p className="text-destructive text-sm">
								{error.message || "Unable to load appointments."}
							</p>
							<Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
								Try again
							</Button>
						</div>
					) : !hasAssigned ? (
						<div className="flex flex-col items-center gap-2 py-10 text-center">
							<Calendar className="text-muted-foreground size-8" />
							<p className="text-sm font-medium">No assigned appointments</p>
							<p className="text-muted-foreground max-w-md text-xs">
								You don't have any telemedicine consultations assigned to you yet. New appointments
								will appear here once the scheduler books them with you.
							</p>
						</div>
					) : !hasResults ? (
						<div className="flex flex-col items-center gap-2 py-10 text-center">
							<Search className="text-muted-foreground size-8" />
							<p className="text-sm font-medium">No matching appointments</p>
							<p className="text-muted-foreground max-w-md text-xs">
								Try clearing the search or changing the status filter.
							</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									setSearch("")
									setStatusFilter("all")
								}}
							>
								Clear filters
							</Button>
						</div>
					) : (
						<div className="space-y-6">
							{(Object.keys(BUCKET_LABELS) as DateBucket[]).map(bucket => {
								const items = grouped[bucket]
								if (!items.length) return null
								return (
									<section key={bucket} className="space-y-2">
										<div className="flex items-center gap-2">
											<h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
												{BUCKET_LABELS[bucket]}
											</h4>
											<Badge variant="outline" className="text-xs">
												{items.length}
											</Badge>
										</div>
										<div className="space-y-2">
											{items.map(appt => (
												<AppointmentRow
													key={appt.id}
													appt={appt}
													isSelected={selectedAppointmentId === appt.id}
													onSelect={() =>
														onAppointmentSelected?.(appt.id, appt.encounterId)
													}
												/>
											))}
										</div>
									</section>
								)
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
