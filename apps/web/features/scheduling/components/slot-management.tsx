"use client"

import { useMemo, useState } from "react"
import { endOfMonth, format, isSameDay, startOfMonth } from "date-fns"
import { LoaderCircle, Lock, LockOpen, UserRound } from "lucide-react"
import { toast } from "sonner"

import type { ClinicSlot } from "@repo/contracts"

import {
	useScheduleTemplatesQuery,
	useTemplateSlotsQuery,
	useUpdateSlotMutation,
} from "@/features/scheduling/api/scheduling.hooks"

import { EmptyState, ErrorState } from "@/features/admin/components/state-views"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Calendar, CalendarDayButton } from "@/core/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"

import { SlotBlockDialog } from "./slot-block-dialog"

interface SlotManagementProps {
	facilityId: string
}

type DayStatus = "open" | "blocked" | "booked"
type SlotStatus = ClinicSlot["status"]

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
	const [blockTarget, setBlockTarget] = useState<ClinicSlot | null>(null)

	const templatesQuery = useScheduleTemplatesQuery({ facilityId, limit: 100 })
	const updateSlotMutation = useUpdateSlotMutation()

	const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])
	const activeTemplateId =
		selectedTemplateId && templates.some(template => template.id === selectedTemplateId)
			? selectedTemplateId
			: templates[0]?.id ?? ""
	const selectedTemplate =
		templates.find(template => template.id === activeTemplateId) ?? null

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
		return <EmptyState title="No templates configured yet." />
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Slot Management</h1>
				<p className="text-muted-foreground">
					Block or reopen individual generated slots for leave, holidays, and other temporary overrides.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
				<Card className="h-fit">
					<CardHeader>
						<CardTitle className="text-base">Templates</CardTitle>
						<CardDescription>Select a recurring clinic template to manage its generated slots.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{templates.map(template => {
							const isSelected = template.id === selectedTemplate?.id
							return (
								<button
									key={template.id}
									type="button"
									onClick={() => setSelectedTemplateId(template.id)}
									className={cn(
										"w-full rounded-xl border p-4 text-left transition-colors",
										isSelected
											? "border-primary bg-primary/5"
											: "hover:border-primary/40 hover:bg-muted/40"
									)}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="space-y-1">
											<p className="font-medium">{template.clinicName}</p>
											<p className="text-sm text-muted-foreground">
												{formatTemplateDay(template.dayOfWeek)} • {template.startTime} - {template.endTime}
											</p>
										</div>
										<Badge variant={template.isActive ? "default" : "secondary"}>
											{template.isActive ? "Active" : "Inactive"}
										</Badge>
									</div>
								</button>
							)
						})}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{selectedTemplate?.clinicName ?? "Template slots"}
						</CardTitle>
						<CardDescription>
							{selectedTemplate
								? `${selectedTemplate.startTime} - ${selectedTemplate.endTime} • ${selectedTemplate.slotDurationMinutes}-minute slots`
								: "Select a template to view its generated slots."}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{templateSlotsQuery.isLoading ? (
							<div className="space-y-4">
								<Skeleton className="h-[24rem] w-full rounded-xl" />
								{Array.from({ length: 3 }).map((_, index) => (
									<Skeleton key={index} className="h-20 w-full rounded-xl" />
								))}
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
								<div className="rounded-xl border p-3">
									<Calendar
										mode="single"
										month={month}
										selected={selectedDate}
										onMonthChange={setMonth}
										onSelect={date => {
											if (date) {
												setSelectedDate(date)
											}
										}}
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
															isSelected && "ring-2 ring-primary/30",
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

								<div className="space-y-3">
									<div className="flex items-center justify-between gap-3">
										<div>
											<h2 className="font-semibold">{format(selectedDate, "MMMM d, yyyy")}</h2>
											<p className="text-sm text-muted-foreground">
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
										<div className="space-y-3">
											{selectedDateSlots.map(slot => (
												<div
													key={slot.id}
													className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
												>
													<div className="space-y-2">
														<div className="flex flex-wrap items-center gap-2">
															<p className="font-medium">{formatSlotTime(slot)}</p>
															<Badge variant={SLOT_STATUS_BADGE_VARIANTS[slot.status]}>
																{slot.status}
															</Badge>
														</div>
														<div className="text-sm text-muted-foreground">
															{slot.status === "blocked" && slot.blockReason ? (
																<p>Reason: {slot.blockReason}</p>
															) : slot.status === "booked" ? (
																<p className="flex items-center gap-2">
																	<UserRound className="size-4" />
																	Booked
																</p>
															) : (
																<p>Available for booking.</p>
															)}
														</div>
													</div>

													<div className="flex items-center gap-2">
														{slot.status === "open" ? (
															<Button
																onClick={() => setBlockTarget(slot)}
																aria-label={`Block ${slot.slotStartTime} slot on ${slot.slotDate}`}
															>
																<Lock className="mr-2 size-4" />
																Block
															</Button>
														) : null}

														{slot.status === "blocked" ? (
															<Button
																variant="outline"
																onClick={() => {
																	void handleUnblock(slot)
																}}
																aria-label={`Unblock ${slot.slotStartTime} slot on ${slot.slotDate}`}
															>
																<LockOpen className="mr-2 size-4" />
																Unblock
															</Button>
														) : null}

														{slot.status === "booked" ? (
															<span className="text-sm font-medium text-muted-foreground">
																Booked
															</span>
														) : null}

														{slot.status === "cancelled" ? (
															<span className="text-sm font-medium text-muted-foreground">
																Cancelled
															</span>
														) : null}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</>
						)}
					</CardContent>
				</Card>
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
