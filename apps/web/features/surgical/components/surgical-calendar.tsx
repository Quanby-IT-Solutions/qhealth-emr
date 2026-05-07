"use client"

import { useState } from "react"

import { ChevronLeft, ChevronRight, Calendar, Plus } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { type OrSlot, useOrSlotsQuery } from "../api/surgical.hooks"
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
	return date.toISOString().split("T")[0]!
}

function formatWeekRange(start: Date): string {
	const end = addDays(start, 6)
	const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
	return `${start.toLocaleDateString("en-PH", opts)} – ${end.toLocaleDateString("en-PH", { ...opts, year: "numeric" })}`
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// ─── OR Suites ─────────────────────────────────────────────────────────────

const OR_SUITES = ["OR-1", "OR-2", "OR-3", "OR-4"]

// ─── Slot Card ─────────────────────────────────────────────────────────────

interface SlotCardProps {
	slot: OrSlot
}

function SlotCard({ slot }: SlotCardProps) {
	const isBooked = !!slot.surgicalCaseId

	return (
		<div
			className={`rounded-md border p-2 text-xs ${
				isBooked
					? "bg-primary/10 border-primary/30"
					: "bg-muted/40 border-dashed hover:bg-muted/60"
			}`}
		>
			<p className="font-semibold">
				{slot.startTime} – {slot.endTime}
			</p>
			{isBooked ? (
				<>
					<p className="text-foreground/80 mt-0.5 truncate">{slot.procedureName}</p>
					<p className="text-muted-foreground truncate">{slot.surgeonName}</p>
				</>
			) : (
				<p className="text-muted-foreground mt-0.5">Available</p>
			)}
		</div>
	)
}

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

export function SurgicalCalendar() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
	const [bookingOpen, setBookingOpen] = useState(false)
	const [bookingOrSuite, setBookingOrSuite] = useState("")
	const [bookingDatetime, setBookingDatetime] = useState("")

	const weekStartIso = toIsoDate(weekStart)
	const { data: slots = [], isLoading, refetch } = useOrSlotsQuery(facilityId, weekStartIso)

	const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

	function slotsByDayAndSuite(day: Date, suite: string): OrSlot[] {
		const dayStr = toIsoDate(day)
		return slots.filter((s) => s.date === dayStr && s.orSuite === suite)
	}

	function isSlotOccupied(day: Date, suite: string, timeSlot: string): OrSlot | undefined {
		const dayStr = toIsoDate(day)
		const slotHour = parseInt(timeSlot.split(":")[0]!)
		return slots.find((s) => {
			if (s.date !== dayStr || s.orSuite !== suite) return false
			const startHour = parseInt(s.startTime.split(":")[0]!)
			const endHour = parseInt(s.endTime.split(":")[0]!)
			return slotHour >= startHour && slotHour < endHour
		})
	}

	function openBooking(day: Date, suite: string, timeSlot: string) {
		const dt = new Date(day)
		const [h, m] = timeSlot.split(":").map(Number)
		dt.setHours(h ?? 7, m ?? 0, 0, 0)
		setBookingOrSuite(suite)
		setBookingDatetime(dt.toISOString())
		setBookingOpen(true)
	}

	const bookedCount = slots.filter((s) => !!s.surgicalCaseId).length

	return (
		<>
		<div className="space-y-4 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">OR Schedule</h1>
					<p className="text-muted-foreground text-sm">
						Operating room slot management — click an empty cell to book a case
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="secondary">{bookedCount} booked this week</Badge>
					<Button variant="outline" size="sm" nativeButton={false} render={<a href="/surgical" />}>
						← Back to Dashboard
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
								onClick={() => setWeekStart((w) => addDays(w, -7))}
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
								onClick={() => setWeekStart((w) => addDays(w, 7))}
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
					) : (
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr>
									<th className="border-b border-r bg-muted/50 px-3 py-2 text-left font-medium w-16">
										Time
									</th>
									{OR_SUITES.map((suite) => (
										<th
											key={suite}
											className="border-b border-r bg-muted/50 px-3 py-2 text-center font-medium"
										>
											{suite}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{TIME_SLOTS.map((timeSlot) => (
									<tr key={timeSlot} className="border-b last:border-0">
										<td className="border-r bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground w-16">
											{timeSlot}
										</td>
										{OR_SUITES.map((suite) => {
											const today = toIsoDate(new Date())
											const todayOccupied = weekDays.map((day) => {
												const occupied = isSlotOccupied(day, suite, timeSlot)
												const isToday = toIsoDate(day) === today
												return { day, occupied, isToday }
											})

											return (
												<td
													key={suite}
													className="border-r p-0"
												>
													<div className="grid grid-cols-7">
														{todayOccupied.map(({ day, occupied, isToday }, di) => (
															<div
																key={di}
																className={`min-h-[40px] p-1 border-r last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}
															>
																{occupied ? (
																	<div className="bg-primary/10 border-primary/30 rounded border p-1 text-xs h-full">
																		<p className="font-semibold text-primary truncate">
																			{occupied.procedureName}
																		</p>
																		{occupied.surgeonName && (
																			<p className="text-muted-foreground truncate">
																				{occupied.surgeonName}
																			</p>
																		)}
																	</div>
																) : (
																	<button
																		onClick={() => openBooking(day, suite, timeSlot)}
																		className="w-full h-full min-h-[38px] flex items-center justify-center rounded text-muted-foreground/40 hover:bg-primary/5 hover:text-primary/60 transition-colors"
																		title={`Book case in ${suite} on ${toIsoDate(day)} at ${timeSlot}`}
																	>
																		<Plus className="size-3" />
																	</button>
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

		{bookingOpen && facilityId && (
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
