"use client"

import { useMemo, useState } from "react"
import { endOfMonth, format, isSameDay, startOfMonth } from "date-fns"
import { ArrowLeft, CalendarDays, LoaderCircle, Lock, LockOpen, UserRound } from "lucide-react"
import { toast } from "sonner"

import type { ClinicSlot } from "@repo/contracts"

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
	useTemplateSlotsQuery,
	useUpdateSlotMutation,
} from "@/features/scheduling/api/scheduling.hooks"

import { SlotBlockDialog } from "./slot-block-dialog"

interface SlotManagementProps {
	facilityId: string
}

type DayStatus = "open" | "blocked" | "booked"
type SlotStatus = ClinicSlot["status"]
type SlotManagementStep = "day" | "slots"

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

function formatTemplateDay(dayOfWeek: number) {
	const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
	return labels[dayOfWeek] ?? `Day ${dayOfWeek}`
}

export function SlotManagement({ facilityId }: SlotManagementProps) {
	const [month, setMonth] = useState(() => startOfMonth(new Date()))
	const [selectedDate, setSelectedDate] = useState(() => new Date())
	const [selectedTemplateId, setSelectedTemplateId] = useState("")
	const [step, setStep] = useState<SlotManagementStep>("day")
	const [blockTarget, setBlockTarget] = useState<ClinicSlot | null>(null)

	const templatesQuery = useScheduleTemplatesQuery({ facilityId, isActive: true, limit: 100 })
	const updateSlotMutation = useUpdateSlotMutation()

	const templates = useMemo(
		() => (templatesQuery.data ?? []).filter(template => template.isActive),
		[templatesQuery.data]
	)
	const activeTemplateId =
		selectedTemplateId && templates.some(template => template.id === selectedTemplateId)
			? selectedTemplateId
			: ""
	const selectedTemplate = templates.find(template => template.id === activeTemplateId) ?? null

	const slotRange = useMemo(() => getMonthBounds(month), [month])

	const templateSlotsQuery = useTemplateSlotsQuery({
		templateId: selectedTemplate?.id ?? "",
		fromDate: slotRange.fromDate,
		toDate: slotRange.toDate,
	})

	const slotsByDate = useMemo(() => {
		const next = new Map<string, ClinicSlot[]>()

		;(templateSlotsQuery.data ?? []).forEach(slot => {
			const bucket = next.get(slot.slotDate)
			if (bucket) {
				bucket.push(slot)
				return
			}

			next.set(slot.slotDate, [slot])
		})

		return next
	}, [templateSlotsQuery.data])

	const selectedDateKey = format(selectedDate, "yyyy-MM-dd")
	const selectedDateSlots = slotsByDate.get(selectedDateKey) ?? []

	function handleManageTemplate(templateId: string) {
		setSelectedTemplateId(templateId)
		setStep("day")
	}

	function handleSelectDate(date: Date | undefined) {
		if (!date) {
			return
		}

		setSelectedDate(date)
		setStep("slots")
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

	if (templatesQuery.isLoading) {
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

	if (templates.length === 0) {
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
						<CardDescription>
							Choose a recurring clinic template before adjusting generated slots.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Clinic</TableHead>
									<TableHead>Day</TableHead>
									<TableHead>Hours</TableHead>
									<TableHead>Slots</TableHead>
									<TableHead className="text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{templates.map(template => {
									const isSelected = template.id === selectedTemplate?.id
									return (
										<TableRow key={template.id} data-state={isSelected ? "selected" : undefined}>
											<TableCell className="font-medium">{template.clinicName}</TableCell>
											<TableCell>{formatTemplateDay(template.dayOfWeek)}</TableCell>
											<TableCell>
												{template.startTime} - {template.endTime}
											</TableCell>
											<TableCell>{template.slotDurationMinutes} min</TableCell>
											<TableCell className="text-right">
												<Button
													size="sm"
													variant={isSelected ? "default" : "outline"}
													onClick={() => handleManageTemplate(template.id)}
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

				{selectedTemplate ? (
					<Card>
						<CardHeader>
							<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
								<div>
									<CardTitle className="text-base">{selectedTemplate.clinicName}</CardTitle>
									<CardDescription>
										{selectedTemplate.startTime} - {selectedTemplate.endTime} •{" "}
										{selectedTemplate.slotDurationMinutes}-minute slots
									</CardDescription>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setSelectedTemplateId("")
										setStep("day")
									}}
								>
									<ArrowLeft className="mr-1.5 size-4" />
									Templates
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid gap-3 sm:grid-cols-2">
								<button
									type="button"
									onClick={() => setStep("day")}
									className={cn(
										"rounded-lg border p-3 text-left transition-colors",
										step === "day" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
									)}
								>
									<div className="flex items-center gap-2 text-sm font-medium">
										<span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs">
											1
										</span>
										Select Day
									</div>
									<p className="text-muted-foreground mt-1 text-xs">Pick a generated slot date.</p>
								</button>
								<button
									type="button"
									onClick={() => setStep("slots")}
									className={cn(
										"rounded-lg border p-3 text-left transition-colors",
										step === "slots" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
									)}
								>
									<div className="flex items-center gap-2 text-sm font-medium">
										<span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs">
											2
										</span>
										Time Slots
									</div>
									<p className="text-muted-foreground mt-1 text-xs">
										Block or reopen slots for the selected day.
									</p>
								</button>
							</div>

							{templateSlotsQuery.isLoading ? (
								<div className="grid gap-4 lg:grid-cols-[auto_1fr]">
									<Skeleton className="h-[24rem] w-[21rem] rounded-xl" />
									<div className="space-y-1.5">
										{Array.from({ length: 8 }).map((_, index) => (
											<Skeleton key={index} className="h-9 w-full rounded-lg" />
										))}
									</div>
								</div>
							) : templateSlotsQuery.isError ? (
								<ErrorState
									title="Failed to load slots"
									error={templateSlotsQuery.error}
									retry={() => {
										void templateSlotsQuery.refetch()
									}}
								/>
							) : (
								<>
									{step === "day" ? (
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
																	<span className="text-xs font-medium">
																		{format(day.date, "d")}
																	</span>
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

											<div className="flex min-h-72 flex-col justify-center rounded-xl border border-dashed p-6">
												<CalendarDays className="text-muted-foreground mb-3 size-8" />
												<h2 className="font-semibold">{format(selectedDate, "MMMM d, yyyy")}</h2>
												<p className="text-muted-foreground mt-1 text-sm">
													Select a day in the calendar to continue to time slot management.
												</p>
											</div>
										</div>
									) : (
										<div className="space-y-2">
											<div className="flex items-center justify-between gap-3">
												<div>
													<h2 className="font-semibold">{format(selectedDate, "MMMM d, yyyy")}</h2>
													<p className="text-muted-foreground text-sm">
														Select a slot to block or reopen an override.
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
												<EmptyState title="No slots in this date range — adjust template?" />
											) : (
												<div className="max-h-[420px] overflow-y-auto">
													<div className="space-y-1.5">
														{selectedDateSlots.map(slot => (
															<div
																key={slot.id}
																className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
															>
																<div className="flex min-w-0 items-center gap-2">
																	<span className="text-sm font-medium">
																		{formatSlotTime(slot)}
																	</span>
																	<Badge variant={SLOT_STATUS_BADGE_VARIANTS[slot.status]}>
																		{slot.status}
																	</Badge>
																	{slot.status === "blocked" && slot.blockReason ? (
																		<span className="text-muted-foreground max-w-[200px] truncate text-xs">
																			· {slot.blockReason}
																		</span>
																	) : null}
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
														))}
													</div>
												</div>
											)}
										</div>
									)}
								</>
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
