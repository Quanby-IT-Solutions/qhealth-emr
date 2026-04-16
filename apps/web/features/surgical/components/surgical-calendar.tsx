"use client"

import { useState } from "react"

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { type OrSlot, useOrSlotsQuery } from "../api/surgical.hooks"

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

// ─── Main Component ─────────────────────────────────────────────────────────

export function SurgicalCalendar() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))

	const weekStartIso = toIsoDate(weekStart)
	const { data: slots = [], isLoading } = useOrSlotsQuery(facilityId, weekStartIso)

	const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

	function slotsByDayAndSuite(day: Date, suite: string): OrSlot[] {
		const dayStr = toIsoDate(day)
		return slots.filter((s) => s.date === dayStr && s.orSuite === suite)
	}

	const bookedCount = slots.filter((s) => !!s.surgicalCaseId).length

	return (
		<div className="space-y-4 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">OR Schedule</h1>
					<p className="text-muted-foreground text-sm">
						Operating room slot management
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
									<th className="border-b border-r bg-muted/50 px-3 py-2 text-left font-medium">
										OR Suite
									</th>
									{weekDays.map((day, i) => {
										const isToday =
											toIsoDate(day) === toIsoDate(new Date())
										return (
											<th
												key={i}
												className={`border-b px-3 py-2 text-center font-medium ${
													isToday ? "bg-primary/10" : "bg-muted/50"
												}`}
											>
												<div className="text-xs font-semibold">
													{DAY_LABELS[day.getDay()]}
												</div>
												<div
													className={`text-base ${isToday ? "text-primary font-bold" : ""}`}
												>
													{day.getDate()}
												</div>
											</th>
										)
									})}
								</tr>
							</thead>
							<tbody>
								{OR_SUITES.map((suite) => (
									<tr key={suite} className="border-b last:border-0">
										<td className="border-r px-3 py-2 font-medium">{suite}</td>
										{weekDays.map((day, di) => {
											const daySlots = slotsByDayAndSuite(day, suite)
											return (
												<td
													key={di}
													className="min-w-[120px] px-2 py-2 align-top"
												>
													{daySlots.length === 0 ? (
														<div className="text-muted-foreground py-1 text-center text-xs">
															—
														</div>
													) : (
														<div className="space-y-1">
															{daySlots.map((slot) => (
																<SlotCard
																	key={slot.id}
																	slot={slot}
																/>
															))}
														</div>
													)}
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
	)
}
