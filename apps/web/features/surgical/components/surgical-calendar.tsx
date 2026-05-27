"use client"

import { useState } from "react"
import Link from "next/link"
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { useOrSlotsQuery, type OrSlot } from "../api/surgical.hooks"
import { OrCaseBookingDialog } from "./or-case-booking-dialog"

// ─── Date helpers ──────────────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
	const d = new Date(date)
	const day = d.getDay() // 0=Sun
	d.setDate(d.getDate() - day)
	d.setHours(0, 0, 0, 0)
	return d
}

function addDays(date: Date, days: number): Date {
	const d = new Date(date)
	d.setDate(d.getDate() + days)
	return d
}

function toIsoDate(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

function formatWeekRange(start: Date): string {
	const end = addDays(start, 6)
	const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
	return `${start.toLocaleDateString("en-PH", opts)} – ${end.toLocaleDateString("en-PH", { ...opts, year: "numeric" })}`
}

// ─── OR Suites ─────────────────────────────────────────────────────────────

const OR_SUITES = ["OR-1", "OR-2", "OR-3", "OR-4"]

// ─── Time slots shown in the calendar rows ──────────────────────────────────

const TIME_SLOTS = [
	"07:00",
	"08:00",
	"09:00",
	"10:00",
	"11:00",
	"12:00",
	"13:00",
	"14:00",
	"15:00",
	"16:00",
	"17:00",
]

// ─── Main Component ─────────────────────────────────────────────────────────

interface SurgicalCalendarProps {
	readOnly?: boolean
	surgeonStaffId?: string
	anesthesiologistStaffId?: string
}

export function SurgicalCalendar({
	readOnly = false,
	surgeonStaffId,
	anesthesiologistStaffId,
}: SurgicalCalendarProps) {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const permissions = profile?.activeRole?.permissions ?? []
	const canViewSurgicalDashboard = permissions.some(
		permission => permission.module === "surgical" && permission.action === "view"
	)
	const backHref = canViewSurgicalDashboard ? "/surgical" : "/scheduling/templates"
	const backLabel = canViewSurgicalDashboard ? "Back to Dashboard" : "Back to Scheduling"

	const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
	const [bookingOpen, setBookingOpen] = useState(false)
	const [bookingOrSuite, setBookingOrSuite] = useState("")
	const [bookingDatetime, setBookingDatetime] = useState("")

	const weekStartIso = toIsoDate(weekStart)
	const {
		data: slots = [],
		isLoading,
		isError,
		refetch,
	} = useOrSlotsQuery({
		facilityId,
		weekStart: weekStartIso,
		surgeonStaffId,
		anesthesiologistStaffId,
	})

	const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
	const visibleSuites = readOnly
		? OR_SUITES.filter(suite => slots.some(slot => slot.orSuite === suite))
		: OR_SUITES

	function getSlotState(
		day: Date,
		suite: string,
		timeSlot: string
	): { slot: OrSlot; isStart: boolean; isContinuation: boolean } | null {
		const dayStr = toIsoDate(day)
		const slotHour = parseInt(timeSlot.split(":")[0]!)
		const slot = slots.find(s => {
			if (s.date !== dayStr || s.orSuite !== suite) return false
			const startHour = parseInt(s.startTime.split(":")[0]!)
			const parsedEndHour = parseInt(s.endTime.split(":")[0]!)
			const endHour = parsedEndHour > startHour ? parsedEndHour : startHour + 2
			return slotHour >= startHour && slotHour < endHour
		})

		if (!slot) return null

		const startHour = parseInt(slot.startTime.split(":")[0]!)
		return {
			slot,
			isStart: slotHour === startHour,
			isContinuation: slotHour > startHour,
		}
	}

	function openBooking(day: Date, suite: string, timeSlot: string) {
		const dt = new Date(day)
		const [h, m] = timeSlot.split(":").map(Number)
		dt.setHours(h ?? 7, m ?? 0, 0, 0)
		setBookingOrSuite(suite)
		setBookingDatetime(dt.toISOString())
		setBookingOpen(true)
	}

	const bookedCount = slots.filter(s => !!s.surgicalCaseId).length
	const openSlotCount = visibleSuites.length * weekDays.length * TIME_SLOTS.length - bookedCount
	const summaryLabel = readOnly ? `${bookedCount} assigned this week` : `${bookedCount} booked this week`

	return (
		<>
			<div className="space-y-4 p-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold">OR Schedule</h1>
						<p className="text-muted-foreground text-sm">
							{readOnly
								? "Read-only operating room schedule for your assigned cases"
								: "Operating room slot management - click an open cell to book a case"}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant="secondary">{summaryLabel}</Badge>
						{!readOnly && <Badge variant="outline">{openSlotCount} open slots</Badge>}
						{readOnly && <Badge variant="outline">Read Only</Badge>}
						<Button variant="outline" size="sm" nativeButton={false} render={<a href={backHref} />}>
							← {backLabel}
						</Button>
					</div>
				</div>

				{/* Week navigation */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<Calendar className="size-5" />
								{formatWeekRange(weekStart)}
							</CardTitle>
							<div className="flex items-center gap-1">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setWeekStart(w => addDays(w, -7))}
								>
									<ChevronLeft className="size-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setWeekStart(startOfWeek(new Date()))}
								>
									Today
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setWeekStart(w => addDays(w, 7))}
								>
									<ChevronRight className="size-4" />
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent className="overflow-x-auto p-0">
						{isLoading ? (
							<div className="text-muted-foreground py-12 text-center text-sm">
								Loading schedule…
							</div>
						) : isError ? (
							<div className="text-destructive py-12 text-center text-sm">
								Unable to load the OR schedule. Please try again.
							</div>
						) : readOnly && slots.length === 0 ? (
							<div className="space-y-3 px-4 py-12 text-center">
								<p className="text-sm font-medium">No assigned OR cases this week</p>
								<p className="text-muted-foreground text-xs">
									Scheduler-booked cases assigned to you will appear in this read-only calendar.
								</p>
							</div>
						) : (
							<table className="w-full min-w-[1040px] border-collapse text-sm">
								<thead>
									<tr>
										<th className="bg-muted/50 w-20 border-r border-b px-3 py-2 text-left align-bottom font-medium">
											Time
										</th>
										{visibleSuites.map(suite => (
											<th
												key={suite}
												className="bg-muted/50 border-r border-b p-0 text-center font-medium"
											>
												<div className="border-b px-3 py-2">{suite}</div>
												<div className="text-muted-foreground grid grid-cols-7 text-[11px] font-normal">
													{weekDays.map(day => {
														const isToday = toIsoDate(day) === toIsoDate(new Date())

														return (
															<div
																key={`${suite}-${toIsoDate(day)}`}
																className={`border-r px-2 py-1 last:border-r-0 ${isToday ? "bg-primary/10 text-primary font-medium" : ""}`}
															>
																<div>{day.toLocaleDateString("en-PH", { weekday: "short" })}</div>
																<div>
																	{day.toLocaleDateString("en-PH", {
																		month: "short",
																		day: "numeric",
																	})}
																</div>
															</div>
														)
													})}
												</div>
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{TIME_SLOTS.map(timeSlot => (
										<tr key={timeSlot} className="border-b last:border-0">
											<td className="bg-muted/30 text-muted-foreground w-16 border-r px-3 py-2 text-xs font-medium">
												{timeSlot}
											</td>
											{visibleSuites.map(suite => {
												const today = toIsoDate(new Date())
												const todaySlots = weekDays.map(day => {
													const slotState = getSlotState(day, suite, timeSlot)
													const isToday = toIsoDate(day) === today
													return { day, slotState, isToday }
												})

												return (
													<td key={suite} className="border-r p-0">
														<div className="grid grid-cols-7">
															{todaySlots.map(({ day, slotState, isToday }, di) => (
																<div
																	key={di}
																	className={`min-h-[40px] border-r p-1 last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}
																>
																	{slotState?.isStart ? (
																		<Link
																			href={`/surgical/${slotState.slot.surgicalCaseId ?? slotState.slot.id}`}
																			className="bg-primary/10 border-primary/30 hover:bg-primary/15 block h-full rounded border p-1.5 text-xs transition-colors"
																		>
																			<Badge
																				variant="secondary"
																				className="mb-1 h-4 px-1 text-[10px]"
																			>
																				Booked
																			</Badge>
																			<p className="text-primary truncate font-semibold">
																				{slotState.slot.procedureName}
																			</p>
																			{slotState.slot.surgeonName && (
																				<p className="text-muted-foreground truncate">
																					{slotState.slot.surgeonName}
																				</p>
																			)}
																		</Link>
																	) : slotState?.isContinuation && !readOnly ? (
																		<div className="bg-primary/5 border-primary/20 h-full min-h-[38px] rounded border border-dashed" />
																	) : (
																		<div className="flex h-full min-h-[38px] items-center justify-center">
																			{readOnly ? (
																				<span className="sr-only">No assigned case</span>
																			) : (
																				<button
																					onClick={() => openBooking(day, suite, timeSlot)}
																					className="text-muted-foreground/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 flex h-full min-h-[38px] w-full items-center justify-center rounded border border-dashed border-transparent transition-colors"
																					title={`Book case in ${suite} on ${toIsoDate(day)} at ${timeSlot}`}
																				>
																					<Plus className="size-3" />
																				</button>
																			)}
																		</div>
																	)}
																</div>
															))}
														</div>
													</td>
												)
											})}
										</tr>
									))}
								</tbody>
							</table>
						)}
					</CardContent>
				</Card>
			</div>

			{!readOnly && bookingOpen && facilityId && (
				<OrCaseBookingDialog
					open={bookingOpen}
					onClose={() => setBookingOpen(false)}
					onSuccess={() => void refetch()}
					facilityId={facilityId}
					orSuite={bookingOrSuite}
					scheduledDatetime={bookingDatetime}
				/>
			)}
		</>
	)
}
