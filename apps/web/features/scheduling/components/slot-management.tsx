"use client"

import { useMemo, useState } from "react"
import { endOfMonth, format, isSameDay, startOfMonth } from "date-fns"
import { ArrowLeft, CalendarDays, LoaderCircle, Lock, LockOpen, UserRound } from "lucide-react"
import { toast } from "sonner"

import type { ClinicSlot, ClinicTemplate } from "@repo/contracts"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Calendar, CalendarDayButton } from "@/core/components/ui/calendar"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { cn } from "@/core/lib/utils"
import { EmptyState, ErrorState } from "@/features/admin/components/state-views"
import {
	useScheduleTemplatesQuery,
	useStaffClinicianListQuery,
	useTemplateSlotsQueries,
	useUpdateSlotMutation,
} from "@/features/scheduling/api/scheduling.hooks"

import { SlotBlockDialog } from "./slot-block-dialog"

interface SlotManagementProps {
	facilityId: string
}

type DayStatus = "open" | "blocked" | "booked"
type SlotStatus = ClinicSlot["status"]
type TemplateWithClinicianName = ClinicTemplate & {
	clinicianName: string
}

type ClinicianTemplateGroup = {
	clinicianStaffId: string
	clinicianName: string
	templates: TemplateWithClinicianName[]
	clinicNames: string[]
	days: number[]
	slotDurations: number[]
}

const SLOT_STATUS_BADGE_VARIANTS: Record<SlotStatus, "default" | "secondary" | "outline"> = {
	open: "default",
	blocked: "secondary",
	booked: "outline",
	cancelled: "secondary",
}

function getMonthBounds(month: Date) {
	return {
		fromDate: format(startOfMonth(month), "yyyy-MM-dd"),
		toDate: format(endOfMonth(month), "yyyy-MM-dd"),
	}
}

function getDayStatus(slots: ClinicSlot[]): DayStatus | null {
	if (slots.length === 0) {
		return null
	}

	if (slots.some(slot => slot.status === "blocked")) {
		return "blocked"
	}

	if (slots.every(slot => slot.status === "booked")) {
		return "booked"
	}

	return "open"
}

function getStatusDotClassName(status: DayStatus | null) {
	switch (status) {
		case "blocked":
			return "bg-destructive"
		case "booked":
			return "bg-muted-foreground"
		case "open":
			return "bg-emerald-500"
		default:
			return "bg-transparent"
	}
}

function formatSlotTime(slot: ClinicSlot) {
	return `${slot.slotStartTime} - ${slot.slotEndTime}`
}

function sortSlots(first: ClinicSlot, second: ClinicSlot) {
	return (
		first.slotDate.localeCompare(second.slotDate) ||
		first.slotStartTime.localeCompare(second.slotStartTime) ||
		first.clinicTemplateId.localeCompare(second.clinicTemplateId)
	)
}

function formatShortTemplateDay(dayOfWeek: number) {
	const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
	return labels[dayOfWeek] ?? `Day ${dayOfWeek}`
}

function formatSlotDurationSummary(group: ClinicianTemplateGroup) {
	const durations = Array.from(new Set(group.slotDurations)).sort((a, b) => a - b)
	return durations.length === 1 ? `${durations[0]} min` : `${durations[0]}-${durations.at(-1)} min`
}

function groupTemplatesByClinician(
	templates: TemplateWithClinicianName[]
): ClinicianTemplateGroup[] {
	const groups = new Map<string, ClinicianTemplateGroup>()

	templates.forEach(template => {
		const existing = groups.get(template.clinicianStaffId)
		const group =
			existing ??
			({
				clinicianStaffId: template.clinicianStaffId,
				clinicianName: template.clinicianName,
				templates: [],
				clinicNames: [],
				days: [],
				slotDurations: [],
			} satisfies ClinicianTemplateGroup)

		group.templates.push(template)
		group.clinicNames = Array.from(new Set([...group.clinicNames, template.clinicName])).sort()
		group.days = Array.from(new Set([...group.days, template.dayOfWeek])).sort((a, b) => a - b)
		group.slotDurations.push(template.slotDurationMinutes)

		groups.set(template.clinicianStaffId, group)
	})

	return Array.from(groups.values())
		.map(group => ({
			...group,
			templates: [...group.templates].sort(
				(first, second) =>
					first.dayOfWeek - second.dayOfWeek || first.startTime.localeCompare(second.startTime)
			),
		}))
		.sort((first, second) => first.clinicianName.localeCompare(second.clinicianName))
}

export function SlotManagement({ facilityId }: SlotManagementProps) {
	const [month, setMonth] = useState(() => startOfMonth(new Date()))
	const [selectedDate, setSelectedDate] = useState(() => new Date())
	const [selectedClinicianStaffId, setSelectedClinicianStaffId] = useState("")
	const [blockTarget, setBlockTarget] = useState<ClinicSlot | null>(null)

	const templatesQuery = useScheduleTemplatesQuery({ facilityId, isActive: true, limit: 100 })
	const cliniciansQuery = useStaffClinicianListQuery({ facilityId })
	const updateSlotMutation = useUpdateSlotMutation()

	const clinicianNameById = useMemo(
		() => new Map(cliniciansQuery.data.map(clinician => [clinician.id, clinician.name] as const)),
		[cliniciansQuery.data]
	)
	const templates = useMemo(
		() =>
			(templatesQuery.data ?? [])
				.filter(template => template.isActive)
				.map(template => ({
					...template,
					clinicianName: clinicianNameById.get(template.clinicianStaffId) ?? "Unknown clinician",
				})),
		[clinicianNameById, templatesQuery.data]
	)
	const clinicianTemplateGroups = useMemo(() => groupTemplatesByClinician(templates), [templates])
	const selectedClinicianGroup =
		clinicianTemplateGroups.find(group => group.clinicianStaffId === selectedClinicianStaffId) ??
		null
	const templateById = useMemo(
		() => new Map(templates.map(template => [template.id, template] as const)),
		[templates]
	)

	const slotRange = useMemo(() => getMonthBounds(month), [month])
	const templateSlotQueries = useTemplateSlotsQueries(
		(selectedClinicianGroup?.templates ?? []).map(template => ({
			templateId: template.id,
			fromDate: slotRange.fromDate,
			toDate: slotRange.toDate,
		}))
	)
	const templateSlotsLoading = templateSlotQueries.some(query => query.isLoading)
	const templateSlotsError = templateSlotQueries.find(query => query.isError)?.error ?? null
	const templateSlots = useMemo(
		() => templateSlotQueries.flatMap(query => query.data ?? []).sort(sortSlots),
		[templateSlotQueries]
	)

	const slotsByDate = useMemo(() => {
		const next = new Map<string, ClinicSlot[]>()

		templateSlots.forEach(slot => {
			const bucket = next.get(slot.slotDate)
			if (bucket) {
				bucket.push(slot)
				return
			}

			next.set(slot.slotDate, [slot])
		})

		return next
	}, [templateSlots])

	const selectedDateKey = format(selectedDate, "yyyy-MM-dd")
	const selectedDateSlots = slotsByDate.get(selectedDateKey) ?? []

	function handleManageGroup(group: ClinicianTemplateGroup) {
		setSelectedClinicianStaffId(group.clinicianStaffId)
	}

	function handleSelectDate(date: Date | undefined) {
		if (!date) {
			return
		}

		setSelectedDate(date)
	}

	async function handleBlockConfirm(reason: string) {
		if (!blockTarget) {
			return
		}

		try {
			await updateSlotMutation.mutateAsync({
				id: blockTarget.id,
				action: "block",
				reason: reason || undefined,
			})
			toast.success("Slot blocked.")
			setBlockTarget(null)
		} catch (error) {
			if ((error as { status?: number } | null)?.status === 409) {
				toast.error("This slot has an appointment and cannot be blocked.")
				return
			}

			toast.error(error instanceof Error ? error.message : "Failed to block slot.")
		}
	}

	async function handleUnblock(slot: ClinicSlot) {
		try {
			await updateSlotMutation.mutateAsync({
				id: slot.id,
				action: "unblock",
			})
			toast.success("Slot reopened.")
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to reopen slot.")
		}
	}

	if (templatesQuery.isLoading || cliniciansQuery.isLoading) {
		return (
			<div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
				<Card>
					<CardHeader>
						<Skeleton className="h-5 w-28" />
						<Skeleton className="h-4 w-40" />
					</CardHeader>
					<CardContent className="space-y-3">
						{Array.from({ length: 5 }).map((_, index) => (
							<Skeleton key={index} className="h-20 w-full rounded-xl" />
						))}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<Skeleton className="h-5 w-48" />
						<Skeleton className="h-4 w-56" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-[22rem] w-full rounded-xl" />
						<Skeleton className="h-24 w-full rounded-xl" />
						<Skeleton className="h-24 w-full rounded-xl" />
					</CardContent>
				</Card>
			</div>
		)
	}

	if (templatesQuery.isError) {
		return (
			<ErrorState
				title="Failed to load templates"
				error={templatesQuery.error}
				retry={() => {
					void templatesQuery.refetch()
				}}
			/>
		)
	}

	if (clinicianTemplateGroups.length === 0) {
		return <EmptyState title="No active templates configured yet." />
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Slot Management</h1>
				<p className="text-muted-foreground">
					Block or reopen individual generated slots for leave, holidays, and other temporary
					overrides.
				</p>
			</div>

			<div className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Active Templates</CardTitle>
						<CardDescription>Choose a clinician before adjusting generated slots.</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Clinician</TableHead>
									<TableHead>Clinics</TableHead>
									<TableHead>Schedule</TableHead>
									<TableHead>Slots</TableHead>
									<TableHead className="text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{clinicianTemplateGroups.map(group => {
									const isSelected =
										group.clinicianStaffId === selectedClinicianGroup?.clinicianStaffId
									return (
										<TableRow
											key={group.clinicianStaffId}
											data-state={isSelected ? "selected" : undefined}
										>
											<TableCell className="font-medium">{group.clinicianName}</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1.5">
													{group.clinicNames.map(clinicName => (
														<Badge key={clinicName} variant="outline">
															{clinicName}
														</Badge>
													))}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1.5">
													{group.days.map(day => (
														<Badge key={day} variant="secondary">
															{formatShortTemplateDay(day)}
														</Badge>
													))}
												</div>
											</TableCell>
											<TableCell>{formatSlotDurationSummary(group)}</TableCell>
											<TableCell className="text-right">
												<Button
													size="sm"
													variant={isSelected ? "default" : "outline"}
													onClick={() => handleManageGroup(group)}
												>
													Manage Slots
												</Button>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{selectedClinicianGroup ? (
					<Card>
						<CardHeader>
							<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
								<div>
									<CardTitle className="text-base">
										{selectedClinicianGroup.clinicianName}
									</CardTitle>
									<CardDescription>
										{selectedClinicianGroup.clinicNames.join(", ")} •{" "}
										{selectedClinicianGroup.days.map(formatShortTemplateDay).join(", ")} •{" "}
										{formatSlotDurationSummary(selectedClinicianGroup)} slots
									</CardDescription>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setSelectedClinicianStaffId("")
									}}
								>
									<ArrowLeft className="mr-1.5 size-4" />
									Templates
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							{templateSlotsLoading ? (
								<div className="grid gap-4 lg:grid-cols-[auto_1fr]">
									<Skeleton className="h-[24rem] w-[21rem] rounded-xl" />
									<div className="space-y-1.5">
										{Array.from({ length: 8 }).map((_, index) => (
											<Skeleton key={index} className="h-9 w-full rounded-lg" />
										))}
									</div>
								</div>
							) : templateSlotsError ? (
								<ErrorState
									title="Failed to load slots"
									error={templateSlotsError}
									retry={() => {
										templateSlotQueries.forEach(query => {
											void query.refetch()
										})
									}}
								/>
							) : (
								<div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_1fr]">
									<div className="rounded-xl border p-3">
										<Calendar
											mode="single"
											month={month}
											selected={selectedDate}
											onMonthChange={setMonth}
											onSelect={handleSelectDate}
											components={{
												DayButton: ({
													day,
													modifiers,
													className,
													...props
												}: React.ComponentProps<typeof CalendarDayButton>) => {
													const dayKey = format(day.date, "yyyy-MM-dd")
													const dayStatus = getDayStatus(slotsByDate.get(dayKey) ?? [])
													const isSelected = isSameDay(day.date, selectedDate)

													return (
														<CalendarDayButton
															day={day}
															modifiers={modifiers}
															className={cn(
																"h-14 items-start px-1.5 py-1",
																isSelected && "ring-primary/30 ring-2",
																className
															)}
															{...props}
														>
															<span className="text-xs font-medium">{format(day.date, "d")}</span>
															<span className="mt-auto flex w-full items-center justify-center pb-1">
																<span
																	className={cn(
																		"size-2 rounded-full",
																		getStatusDotClassName(dayStatus)
																	)}
																/>
																<span className="sr-only">
																	{dayStatus
																		? `${dayStatus} slots on ${dayKey}`
																		: `No slots on ${dayKey}`}
																</span>
															</span>
														</CalendarDayButton>
													)
												},
											}}
										/>
									</div>

									<div className="space-y-2">
										<div className="flex items-center justify-between gap-3">
											<div>
												<h2 className="font-semibold">{format(selectedDate, "MMMM d, yyyy")}</h2>
												<p className="text-muted-foreground text-sm">
													Select a generated slot to block or reopen it.
												</p>
											</div>
											{updateSlotMutation.isPending ? (
												<div className="text-muted-foreground flex items-center gap-2 text-sm">
													<LoaderCircle className="size-4 animate-spin" />
													Updating slots...
												</div>
											) : null}
										</div>

										{selectedDateSlots.length === 0 ? (
											<div className="flex min-h-72 flex-col justify-center rounded-xl border border-dashed p-6">
												<CalendarDays className="text-muted-foreground mb-3 size-8" />
												<h3 className="font-semibold">No generated slots</h3>
												<p className="text-muted-foreground mt-1 text-sm">
													Choose a highlighted scheduled day in the calendar.
												</p>
											</div>
										) : (
											<div className="max-h-[420px] overflow-y-auto">
												<div className="space-y-1.5">
													{selectedDateSlots.map(slot => {
														const template = templateById.get(slot.clinicTemplateId)

														return (
															<div
																key={slot.id}
																className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
															>
																<div className="flex min-w-0 items-center gap-2">
																	<div className="min-w-0">
																		<div className="flex min-w-0 items-center gap-2">
																			<span className="text-sm font-medium">
																				{formatSlotTime(slot)}
																			</span>
																			<Badge variant={SLOT_STATUS_BADGE_VARIANTS[slot.status]}>
																				{slot.status}
																			</Badge>
																		</div>
																		<p className="text-muted-foreground truncate text-xs">
																			{template?.clinicName ?? "Clinic template"}
																			{slot.status === "blocked" && slot.blockReason
																				? ` · ${slot.blockReason}`
																				: ""}
																		</p>
																	</div>
																</div>

																<div className="flex shrink-0 items-center gap-2">
																	{slot.status === "open" ? (
																		<Button
																			size="sm"
																			onClick={() => setBlockTarget(slot)}
																			aria-label={`Block ${slot.slotStartTime} slot on ${slot.slotDate}`}
																		>
																			<Lock className="mr-1.5 size-3.5" />
																			Block
																		</Button>
																	) : null}

																	{slot.status === "blocked" ? (
																		<Button
																			size="sm"
																			variant="outline"
																			onClick={() => {
																				void handleUnblock(slot)
																			}}
																			aria-label={`Unblock ${slot.slotStartTime} slot on ${slot.slotDate}`}
																		>
																			<LockOpen className="mr-1.5 size-3.5" />
																			Unblock
																		</Button>
																	) : null}

																	{slot.status === "booked" ? (
																		<span className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
																			<UserRound className="size-3.5" />
																			Booked
																		</span>
																	) : null}

																	{slot.status === "cancelled" ? (
																		<span className="text-muted-foreground text-sm font-medium">
																			Cancelled
																		</span>
																	) : null}
																</div>
															</div>
														)
													})}
												</div>
											</div>
										)}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				) : null}
			</div>

			<SlotBlockDialog
				key={blockTarget?.id ?? "slot-block-dialog"}
				open={Boolean(blockTarget)}
				onOpenChange={open => {
					if (!open) {
						setBlockTarget(null)
					}
				}}
				slot={blockTarget}
				isPending={updateSlotMutation.isPending}
				onConfirm={handleBlockConfirm}
			/>
		</div>
	)
}
