"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Activity, AlertTriangle, CheckCircle2, Stethoscope, UserX } from "lucide-react"
import { toast } from "sonner"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { DatePicker } from "@/core/components/ui/date-picker"
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
import { useNotifications } from "@/services/notifications/notification-provider"
import { orpc } from "@/services/orpc/client"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { calculateAgeYears } from "@/features/face-scan/lib/face-scan-demographics"
import { useVitalsQuery } from "@/features/nursing/api/nursing.hooks"
import { VitalsEntryForm } from "@/features/nursing/components/vitals-entry-form"
import {
	useCallNextQueuePatientMutation,
	useClinicQueueQuery,
	useUpdateAppointmentStatusMutation,
	useUpdateEncounterQueueStatusMutation,
	type UnifiedQueueEntry,
} from "@/features/scheduling/api/scheduling.hooks"
import { todayIsoInManila } from "@/features/scheduling/lib/queue-date"

function formatTimestampTime(timestamp: string | null | undefined) {
	if (!timestamp) return "—"
	return new Intl.DateTimeFormat("en-PH", {
		hour: "numeric",
		minute: "2-digit",
		timeZone: "Asia/Manila",
	}).format(new Date(timestamp))
}

function formatTimestampDate(timestamp: string | null | undefined) {
	if (!timestamp) return "—"
	return new Intl.DateTimeFormat("en-PH", {
		dateStyle: "medium",
		timeZone: "Asia/Manila",
	}).format(new Date(timestamp))
}

function queueStatusBadge(status: string) {
	switch (status) {
		case "waiting":
			return <Badge variant="default">Waiting</Badge>
		case "in_progress":
			return <Badge className="bg-blue-500 text-white hover:bg-blue-500/80">With Doctor</Badge>
		case "completed":
			return <Badge className="bg-green-600 text-white hover:bg-green-600/80">Done</Badge>
		case "no_show":
			return <Badge variant="destructive">No show</Badge>
		default:
			return <Badge variant="secondary">{status}</Badge>
	}
}

function QueuePatientName({ entry }: { entry: UnifiedQueueEntry }) {
	const name = entry.patientName ?? "Unnamed patient"
	if (!entry.encounterId) return <span>{name}</span>

	return (
		<Link
			href={`/patients/${entry.patientId}/encounters/${entry.encounterId}`}
			className="hover:text-primary hover:underline"
		>
			{name}
		</Link>
	)
}

interface QueueVitalsActionProps {
	entry: UnifiedQueueEntry
	facilityId: string
	className?: string
	iconOnly?: boolean
	hasVitals?: boolean
	onOpen: (entry: { encounterId: string; patientName: string; faceScanAge?: number }) => void
}

function QueueVitalsAction({
	entry,
	facilityId,
	className,
	iconOnly = false,
	hasVitals: knownHasVitals,
	onOpen,
}: QueueVitalsActionProps) {
	const vitalsQuery = useVitalsQuery(
		{ encounterId: entry.encounterId ?? undefined, facilityId, limit: 1 },
		{ enabled: knownHasVitals === undefined && Boolean(entry.encounterId) }
	)
	const hasVitals = knownHasVitals ?? Boolean(vitalsQuery.data?.data?.length)

	if (!entry.encounterId) {
		return (
			<Badge
				variant="secondary"
				className={className}
				title="No encounter"
				aria-label="No encounter"
			>
				{iconOnly ? <Activity className="size-4 opacity-50" /> : "No encounter"}
			</Badge>
		)
	}

	const label = hasVitals ? "Record again" : "Vitals"
	const title = hasVitals ? "Record vitals again" : "Record vitals"

	return (
		<Button
			size="sm"
			variant="outline"
			className={className}
			aria-label={`${title} for ${entry.patientName ?? "patient"}`}
			title={title}
			onClick={() =>
				onOpen({
					encounterId: entry.encounterId!,
					patientName: entry.patientName ?? "",
					faceScanAge: entry.patientDateOfBirth
						? (calculateAgeYears(entry.patientDateOfBirth) ?? undefined)
						: undefined,
				})
			}
		>
			{hasVitals ? <CheckCircle2 className="size-4" /> : <Activity className="size-4" />}
			{!iconOnly && label}
		</Button>
	)
}

function compareQueueEntries(a: UnifiedQueueEntry, b: UnifiedQueueEntry) {
	const queueComparison =
		(a.queueNumber ?? Number.MAX_SAFE_INTEGER) - (b.queueNumber ?? Number.MAX_SAFE_INTEGER)
	if (queueComparison !== 0) return queueComparison

	const aCheckInTime = a.checkInTime ? new Date(a.checkInTime).getTime() : Number.MAX_SAFE_INTEGER
	const bCheckInTime = b.checkInTime ? new Date(b.checkInTime).getTime() : Number.MAX_SAFE_INTEGER
	if (aCheckInTime !== bCheckInTime) return aCheckInTime - bCheckInTime

	return a.id.localeCompare(b.id)
}

interface ClinicQueueProps {
	facilityId: string
	clinicianStaffId?: string
	showCoordinatorFilters?: boolean
}

const ACTIVE_PATIENTS_PAGE_SIZE = 10
const EMPTY_QUEUE_ENTRIES: UnifiedQueueEntry[] = []
const DATE_OF_BIRTH_END_YEAR = new Date().getFullYear()
const queueFilterFieldClassName = "flex min-w-0 flex-col gap-1"
const queueFilterLabelClassName = "text-muted-foreground h-4 text-xs font-medium leading-4"
const queueFilterControlClassName = "h-8 w-full rounded-full px-4"
const QUEUE_STATUS_FILTERS = [
	{ value: "active", label: "Active" },
	{ value: "waiting", label: "Waiting" },
	{ value: "in_progress", label: "In progress" },
	{ value: "completed", label: "Done" },
	{ value: "no_show", label: "No show" },
	{ value: "all", label: "All" },
] as const

type QueueStatusFilter = (typeof QUEUE_STATUS_FILTERS)[number]["value"]
export type QueueVitalsFilter = "all" | "needed" | "done"

type QueueEntryWithVitals = {
	encounterId?: string | null
	hasVitals?: boolean
}

type QueueEntryWithCalledByStaff = {
	calledByStaffId?: string | null
}

function queueEntryHasVitals(entry: QueueEntryWithVitals) {
	return Boolean(entry.hasVitals)
}

export function isQueueEntryManagedByStaff(
	entry: QueueEntryWithCalledByStaff,
	activeStaffProfileId: string | null | undefined
) {
	return Boolean(activeStaffProfileId && entry.calledByStaffId === activeStaffProfileId)
}

export function filterQueueEntriesByVitals<T extends QueueEntryWithVitals>(
	entries: T[],
	filter: QueueVitalsFilter,
	vitalsByEncounterId?: Map<string, boolean>
) {
	if (filter === "all") return entries

	return entries.filter(entry => {
		const hasVitals =
			(entry.encounterId ? vitalsByEncounterId?.get(entry.encounterId) : undefined) ??
			queueEntryHasVitals(entry)
		return filter === "done" ? hasVitals : !hasVitals
	})
}

export function findQueueEntryPage<T extends { encounterId?: string | null }>(
	entries: T[],
	targetEncounterId: string | null | undefined,
	pageSize: number
) {
	if (!targetEncounterId || pageSize <= 0) return null
	const index = entries.findIndex(entry => entry.encounterId === targetEncounterId)
	return index === -1 ? null : Math.floor(index / pageSize) + 1
}

function filterQueueEntries(entries: UnifiedQueueEntry[], filter: QueueStatusFilter) {
	switch (filter) {
		case "active":
			return entries.filter(e => e.status === "waiting" || e.status === "in_progress")
		case "all":
			return entries
		default:
			return entries.filter(e => e.status === filter)
	}
}

function queueEntryMatchesSearch(entry: UnifiedQueueEntry, search: string) {
	if (!search) return true

	const tokens = search.split(/\s+/).filter(Boolean)
	const haystack = [
		entry.patientName,
		entry.patientMrn,
		entry.patientDateOfBirth,
		entry.queueNumber ? `queue ${entry.queueNumber}` : "",
		entry.queueNumber ? `#${entry.queueNumber}` : "",
		entry.entryType === "walk_in" ? "walk-in walk in walkin" : "appointment",
		entry.status.replaceAll("_", " "),
		entry.calledByName ?? "",
	]
		.join(" ")
		.toLowerCase()

	return tokens.every(token => haystack.includes(token))
}

function statusFilterEmptyText(filter: QueueStatusFilter) {
	switch (filter) {
		case "completed":
			return "No done patients for this date."
		case "no_show":
			return "No no-shows for this date."
		case "waiting":
			return "No waiting patients."
		case "in_progress":
			return "No in-progress patients."
		case "all":
			return "No patients in queue."
		default:
			return "No waiting or in-progress patients."
	}
}

export function ClinicQueue({
	facilityId,
	clinicianStaffId,
	showCoordinatorFilters = false,
}: ClinicQueueProps) {
	const queryClient = useQueryClient()
	const searchParams = useSearchParams()
	const { onTopic } = useNotifications()
	const [date, setDate] = useState(todayIsoInManila())
	const [currentPage, setCurrentPage] = useState(1)
	const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>("active")
	const [vitalsFilter, setVitalsFilter] = useState<QueueVitalsFilter>("all")
	const [queueSearch, setQueueSearch] = useState("")
	const [dateOfBirthFilter, setDateOfBirthFilter] = useState("")
	const [vitalsEntry, setVitalsEntry] = useState<{
		encounterId: string
		patientName: string
		faceScanAge?: number
	} | null>(null)
	const [pendingNoShowEntry, setPendingNoShowEntry] = useState<UnifiedQueueEntry | null>(null)
	const { data: profile } = useMyProfile()
	const activeStaffProfile =
		profile?.staffProfiles?.find(
			p => p.facilityId === facilityId && p.roles.some(r => r.id === profile.activeRole?.id)
		) ??
		profile?.staffProfiles?.find(p => p.roles.some(r => r.id === profile.activeRole?.id)) ??
		profile?.staffProfiles?.find(p => p.facilityId === facilityId) ??
		profile?.staffProfiles?.[0]
	const activeStaffProfileId = activeStaffProfile?.id ?? null

	const apptStatusMut = useUpdateAppointmentStatusMutation()
	const encounterQueueStatusMut = useUpdateEncounterQueueStatusMutation()
	const callNextMut = useCallNextQueuePatientMutation()
	const isPending =
		apptStatusMut.isPending || encounterQueueStatusMut.isPending || callNextMut.isPending

	const queueQuery = useClinicQueueQuery(
		{
			facilityId,
			clinicianStaffId,
			calledByStaffId: activeStaffProfileId ?? undefined,
			date,
		},
		{ refetchInterval: isPending ? false : 20_000 }
	)

	useEffect(() => {
		return onTopic("opd_queue", event => {
			const data = event.data as { facilityId?: string } | null
			if (data?.facilityId && data.facilityId !== facilityId) return

			void queryClient.invalidateQueries({
				queryKey: orpc.scheduling.getClinicQueue.key(),
			})
		})
	}, [facilityId, onTopic, queryClient])

	const entries = queueQuery.data?.entries ?? EMPTY_QUEUE_ENTRIES
	const waitingEntries = entries.filter(e => e.status === "waiting")
	const inProgressEntries = entries.filter(e => e.status === "in_progress")
	const activeCoordinatorEntry = queueQuery.data?.activeCoordinatorEntry ?? null
	const servedEntries = useMemo(() => {
		const byId = new Map<string, UnifiedQueueEntry>()
		for (const entry of inProgressEntries) {
			byId.set(entry.encounterId ?? entry.id, entry)
		}
		if (activeCoordinatorEntry) {
			byId.set(
				activeCoordinatorEntry.encounterId ?? activeCoordinatorEntry.id,
				activeCoordinatorEntry
			)
		}
		return [...byId.values()].sort(compareQueueEntries)
	}, [activeCoordinatorEntry, inProgressEntries])
	const normalizedQueueSearch = queueSearch.trim().toLowerCase()
	const hasQueueSearch = showCoordinatorFilters && normalizedQueueSearch.length > 0
	const hasDateOfBirthFilter = showCoordinatorFilters && dateOfBirthFilter.length > 0
	const activeEntries = useMemo(() => {
		const filteredEntries = filterQueueEntries(entries, statusFilter)
		const searchedEntries = showCoordinatorFilters
			? filteredEntries.filter(entry => queueEntryMatchesSearch(entry, normalizedQueueSearch))
			: filteredEntries
		const dateOfBirthEntries = hasDateOfBirthFilter
			? searchedEntries.filter(entry => entry.patientDateOfBirth === dateOfBirthFilter)
			: searchedEntries
		const vitalsEntries = filterQueueEntriesByVitals(dateOfBirthEntries, vitalsFilter)

		return [...vitalsEntries].sort(compareQueueEntries)
	}, [
		dateOfBirthFilter,
		entries,
		hasDateOfBirthFilter,
		normalizedQueueSearch,
		showCoordinatorFilters,
		statusFilter,
		vitalsFilter,
	])
	const statusFilterLabel =
		QUEUE_STATUS_FILTERS.find(filter => filter.value === statusFilter)?.label ?? "Active"
	const pageCount = Math.max(1, Math.ceil(activeEntries.length / ACTIVE_PATIENTS_PAGE_SIZE))
	const pageStartIndex = (currentPage - 1) * ACTIVE_PATIENTS_PAGE_SIZE
	const paginatedEntries = activeEntries.slice(
		pageStartIndex,
		pageStartIndex + ACTIVE_PATIENTS_PAGE_SIZE
	)
	const visibleStart = activeEntries.length === 0 ? 0 : pageStartIndex + 1
	const visibleEnd = Math.min(pageStartIndex + ACTIVE_PATIENTS_PAGE_SIZE, activeEntries.length)
	const myInProgressEntry = activeStaffProfileId
		? inProgressEntries.find(e => e.calledByStaffId === activeStaffProfileId)
		: undefined
	const currentCoordinatorEntry = activeCoordinatorEntry ?? myInProgressEntry
	const canClearQueueFilters =
		hasQueueSearch ||
		hasDateOfBirthFilter ||
		statusFilter !== "active" ||
		vitalsFilter !== "all" ||
		date !== todayIsoInManila()
	const queueEmptyText =
		hasQueueSearch || hasDateOfBirthFilter
			? "No queue patients match your filters."
			: statusFilterEmptyText(statusFilter)
	const queueFilterGridClassName = showCoordinatorFilters
		? "grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(150px,0.9fr)_minmax(150px,0.9fr)_minmax(130px,0.8fr)_minmax(172px,auto)] xl:items-start"
		: "grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(150px,0.9fr)_minmax(130px,0.8fr)_minmax(172px,auto)] lg:items-start"

	useEffect(() => {
		setCurrentPage(1)
	}, [
		date,
		dateOfBirthFilter,
		facilityId,
		clinicianStaffId,
		normalizedQueueSearch,
		statusFilter,
		vitalsFilter,
	])

	useEffect(() => {
		setCurrentPage(page => Math.min(page, pageCount))
	}, [pageCount])

	useEffect(() => {
		const targetEncounterId = searchParams.get("encounterId")
		const targetPage = findQueueEntryPage(
			activeEntries,
			targetEncounterId,
			ACTIVE_PATIENTS_PAGE_SIZE
		)
		if (targetPage) {
			setCurrentPage(targetPage)
		}
	}, [activeEntries, searchParams])

	async function callNext() {
		if (waitingEntries.length === 0) return

		try {
			await callNextMut.mutateAsync({
				facilityId,
				clinicianStaffId,
				date,
				calledByStaffId: activeStaffProfileId ?? undefined,
			})
		} catch (error) {
			void queryClient.invalidateQueries({
				queryKey: orpc.scheduling.getClinicQueue.key(),
			})
			if ((error as { status?: number } | null)?.status === 409) {
				toast.error("Finish the active patient at this counter before calling another.")
				return
			}

			toast.error(error instanceof Error ? error.message : "Failed to call next patient.")
		}
	}

	function markCompleted(entry: UnifiedQueueEntry) {
		if (!isQueueEntryManagedByStaff(entry, activeStaffProfileId)) {
			toast.error("Only the doctor who called this patient can mark them done.")
			return
		}
		if (entry.encounterId) {
			encounterQueueStatusMut.mutate({ id: entry.encounterId, status: "completed" })
		} else if (entry.entryType === "appointment" && entry.appointmentId) {
			apptStatusMut.mutate({ id: entry.appointmentId, status: "completed" })
		}
	}

	function markNoShow(entry: UnifiedQueueEntry) {
		if (!isQueueEntryManagedByStaff(entry, activeStaffProfileId)) {
			toast.error("Only the doctor who called this patient can mark them as no-show.")
			return
		}
		if (entry.encounterId) {
			encounterQueueStatusMut.mutate({ id: entry.encounterId, status: "no_show" })
		} else if (entry.entryType === "appointment" && entry.appointmentId) {
			apptStatusMut.mutate({ id: entry.appointmentId, status: "no_show" })
		}
	}

	function confirmNoShow() {
		if (!pendingNoShowEntry) return
		markNoShow(pendingNoShowEntry)
		setPendingNoShowEntry(null)
	}

	function clearQueueFilters() {
		setQueueSearch("")
		setDateOfBirthFilter("")
		setDate(todayIsoInManila())
		setStatusFilter("active")
		setVitalsFilter("all")
		setCurrentPage(1)
	}

	return (
		<>
			<div className="space-y-4">
				<div className="bg-muted/25 rounded-lg border px-4 py-5">
					<div className={queueFilterGridClassName}>
						{showCoordinatorFilters && (
							<div className={queueFilterFieldClassName}>
								<Label htmlFor="queue-patient-search" className={queueFilterLabelClassName}>
									Search
								</Label>
								<Input
									id="queue-patient-search"
									value={queueSearch}
									onChange={event => setQueueSearch(event.target.value)}
									placeholder="Patient, MRN, queue #"
									aria-label="Search queue patients"
									className={queueFilterControlClassName}
								/>
							</div>
						)}

						{showCoordinatorFilters && (
							<div className={queueFilterFieldClassName}>
								<Label htmlFor="queue-patient-date-of-birth" className={queueFilterLabelClassName}>
									Date of Birth
								</Label>
								<DatePicker
									id="queue-patient-date-of-birth"
									className={queueFilterControlClassName}
									value={dateOfBirthFilter}
									onChange={setDateOfBirthFilter}
									placeholder="Any DOB"
									endYear={DATE_OF_BIRTH_END_YEAR}
								/>
							</div>
						)}

						<div className={queueFilterFieldClassName}>
							<Label htmlFor="queue-display-date" className={queueFilterLabelClassName}>
								Date
							</Label>
							<DatePicker
								id="queue-display-date"
								className={queueFilterControlClassName}
								value={date}
								onChange={value => setDate(value || todayIsoInManila())}
								required
							/>
						</div>

						<div className={queueFilterFieldClassName}>
							<Label htmlFor="queue-status-filter" className={queueFilterLabelClassName}>
								Status
							</Label>
							<Select
								value={statusFilter}
								onValueChange={value => {
									setStatusFilter(value as QueueStatusFilter)
									setCurrentPage(1)
								}}
							>
								<SelectTrigger
									id="queue-status-filter"
									aria-label="Filter queue status"
									className={queueFilterControlClassName}
								>
									<SelectValue>{statusFilterLabel}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{QUEUE_STATUS_FILTERS.map(filter => (
										<SelectItem key={filter.value} value={filter.value}>
											{filter.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className={queueFilterFieldClassName}>
							<Label className={`${queueFilterLabelClassName} invisible`} aria-hidden="true">
								Actions
							</Label>
							<div className="grid grid-cols-2 gap-2 lg:w-fit">
								<Button
									type="button"
									variant="ghost"
									onClick={clearQueueFilters}
									disabled={!canClearQueueFilters}
									className="h-8 rounded-full px-5"
								>
									Clear
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => void queueQuery.refetch()}
									className="h-8 rounded-full px-5"
								>
									Refresh
								</Button>
							</div>
						</div>
					</div>
				</div>

				<div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
					<Card className="flex min-h-[620px] min-w-0 flex-col">
						<CardHeader className="gap-3">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div className="min-w-0">
									<CardTitle>Active Patients</CardTitle>
									<p className="text-muted-foreground mt-1 text-sm">{statusFilterLabel} patients</p>
								</div>
								<div className="flex w-full items-center gap-2 sm:w-auto">
									<Label
										htmlFor="queue-vitals-filter"
										className="text-muted-foreground shrink-0 text-xs font-medium"
									>
										Vitals
									</Label>
									<Select
										value={vitalsFilter}
										onValueChange={value => {
											setVitalsFilter(value as QueueVitalsFilter)
											setCurrentPage(1)
										}}
									>
										<SelectTrigger
											id="queue-vitals-filter"
											aria-label="Filter active patients by vitals status"
											className="h-8 w-full rounded-full px-3 sm:w-36"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All</SelectItem>
											<SelectItem value="needed">Needed</SelectItem>
											<SelectItem value="done">Done</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardHeader>
						<CardContent className="flex min-h-0 flex-1 flex-col p-0">
							{queueQuery.isLoading ? (
								<p className="text-muted-foreground py-8 text-center">Loading queue...</p>
							) : activeEntries.length === 0 ? (
								<p className="text-muted-foreground flex flex-1 items-center justify-center px-4 py-8 text-center">
									{queueEmptyText}
								</p>
							) : (
								<>
									<div className="divide-border/60 flex-1 divide-y md:hidden">
										{paginatedEntries.map(entry => (
											<div
												key={entry.id}
												className={
													entry.status === "in_progress"
														? "bg-blue-50/70 px-4 py-4 dark:bg-blue-950/20"
														: "px-4 py-4"
												}
											>
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<p className="truncate font-medium">
															<QueuePatientName entry={entry} />
														</p>
														<p className="text-muted-foreground text-xs">{entry.patientMrn}</p>
													</div>
													<div className="shrink-0">{queueStatusBadge(entry.status)}</div>
												</div>
												<div className="mt-3 flex items-center justify-between gap-3">
													<div>
														<p className="text-muted-foreground text-xs">Check-in</p>
														<p className="text-sm font-medium">
															{entry.checkInTime ? formatTimestampTime(entry.checkInTime) : "—"}
														</p>
													</div>
													<QueueVitalsAction
														entry={entry}
														facilityId={facilityId}
														hasVitals={queueEntryHasVitals(entry)}
														onOpen={setVitalsEntry}
													/>
												</div>
											</div>
										))}
									</div>

									<div className="hidden flex-1 px-4 pb-4 md:block">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Patient</TableHead>
													<TableHead>Check-in Time</TableHead>
													<TableHead>Status</TableHead>
													<TableHead className="w-32 text-right">Vitals</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{paginatedEntries.map(entry => (
													<TableRow
														key={entry.id}
														className={
															entry.status === "in_progress" ? "bg-blue-50 dark:bg-blue-950/20" : ""
														}
													>
														<TableCell>
															<div className="font-medium">
																<QueuePatientName entry={entry} />
															</div>
															<div className="text-muted-foreground text-xs">
																{entry.patientMrn}
															</div>
														</TableCell>
														<TableCell>
															{entry.checkInTime ? formatTimestampTime(entry.checkInTime) : "—"}
														</TableCell>
														<TableCell>{queueStatusBadge(entry.status)}</TableCell>
														<TableCell>
															<div className="flex justify-end">
																<QueueVitalsAction
																	entry={entry}
																	facilityId={facilityId}
																	hasVitals={queueEntryHasVitals(entry)}
																	onOpen={setVitalsEntry}
																/>
															</div>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
									<div className="border-t px-4 py-3">
										<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
											<p className="text-muted-foreground text-sm">
												Showing {visibleStart}-{visibleEnd} of {activeEntries.length}{" "}
												{statusFilterLabel.toLowerCase()} patients
											</p>
											<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
												<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
													<Button
														size="sm"
														variant="outline"
														disabled={currentPage === 1}
														onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
													>
														Previous
													</Button>
													<span className="text-muted-foreground min-w-20 text-center text-sm">
														Page {currentPage} of {pageCount}
													</span>
													<Button
														size="sm"
														variant="outline"
														disabled={currentPage === pageCount}
														onClick={() => setCurrentPage(page => Math.min(pageCount, page + 1))}
													>
														Next
													</Button>
												</div>
											</div>
										</div>
									</div>
								</>
							)}
						</CardContent>
					</Card>

					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle>Next Patient</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<Button
									className="w-full"
									disabled={waitingEntries.length === 0 || !!currentCoordinatorEntry || isPending}
									onClick={callNext}
								>
									{isPending ? "Calling..." : "Call Next Patient"}
								</Button>
								{currentCoordinatorEntry ? (
									<p className="text-muted-foreground text-sm">
										Finish your active patient before calling another.
									</p>
								) : waitingEntries.length === 0 ? (
									<p className="text-muted-foreground text-sm">
										No waiting patients match the current date and clinic.
									</p>
								) : (
									<p className="text-muted-foreground text-sm">
										Calls the earliest waiting patient in the filtered queue.
									</p>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="gap-2">
								<CardTitle>Currently Being Served</CardTitle>
								<p className="text-muted-foreground text-sm">
									{servedEntries.length} active patient{servedEntries.length === 1 ? "" : "s"}
								</p>
							</CardHeader>
							<CardContent className="grid gap-2">
								{servedEntries.length === 0 ? (
									<p className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-sm">
										No patients are currently being served.
									</p>
								) : (
									servedEntries.map(entry => {
										const isStaleActive =
											activeCoordinatorEntry?.encounterId === entry.encounterId &&
											!entries.some(queueEntry => queueEntry.encounterId === entry.encounterId)
										const canManageEntry = isQueueEntryManagedByStaff(entry, activeStaffProfileId)

										return (
											<div
												key={entry.id}
												className="bg-background w-full rounded-md border p-3 shadow-sm"
											>
												<div className="flex gap-3">
													<div className="min-w-0 flex-1">
														<p className="truncate text-base font-semibold">
															<QueuePatientName entry={entry} />
														</p>
														<p className="text-muted-foreground text-xs">
															Checked in {formatTimestampDate(entry.checkInTime)} at{" "}
															{formatTimestampTime(entry.checkInTime)}
														</p>
														{entry.calledByName && (
															<p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
																<Stethoscope className="size-3.5 shrink-0" />
																Serving by {entry.calledByName}
															</p>
														)}
														{isStaleActive && (
															<Badge
																variant="outline"
																className="mt-2 w-fit border-amber-300 bg-amber-50 text-amber-800"
															>
																<AlertTriangle className="size-3" />
																Previous day
															</Badge>
														)}
													</div>
													<div className="flex shrink-0 items-start gap-1">
														{canManageEntry && (
															<>
																<Button
																	size="icon-sm"
																	className="size-8 p-0"
																	aria-label={`Mark ${entry.patientName ?? "patient"} done`}
																	title="Mark done"
																	disabled={isPending}
																	onClick={() => markCompleted(entry)}
																>
																	<CheckCircle2 className="size-4" />
																</Button>
																<Button
																	size="icon-sm"
																	variant="destructive"
																	className="size-8 p-0"
																	aria-label={`Mark ${entry.patientName ?? "patient"} as no show`}
																	title="No show"
																	disabled={isPending}
																	onClick={() => setPendingNoShowEntry(entry)}
																>
																	<UserX className="size-4" />
																</Button>
															</>
														)}
														<QueueVitalsAction
															entry={entry}
															facilityId={facilityId}
															className="size-8 items-center justify-center p-0"
															iconOnly
															hasVitals={queueEntryHasVitals(entry)}
															onOpen={setVitalsEntry}
														/>
													</div>
												</div>
											</div>
										)
									})
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<AlertDialog
				open={!!pendingNoShowEntry}
				onOpenChange={open => {
					if (!open) setPendingNoShowEntry(null)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Mark patient as no-show?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove {pendingNoShowEntry?.patientName ?? "this patient"} from the active
							queue. Only continue if the patient did not respond or is no longer present.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction variant="destructive" disabled={isPending} onClick={confirmNoShow}>
							Confirm no-show
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{vitalsEntry && (
				<VitalsEntryForm
					encounterId={vitalsEntry.encounterId}
					facilityId={facilityId}
					faceScanAge={vitalsEntry.faceScanAge}
					open={!!vitalsEntry}
					onOpenChange={open => {
						if (!open) {
							setVitalsEntry(null)
							void queryClient.invalidateQueries({
								queryKey: orpc.scheduling.getClinicQueue.key(),
							})
						}
					}}
				/>
			)}
		</>
	)
}
