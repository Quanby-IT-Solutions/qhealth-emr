"use client"

import { useMemo, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { CalendarDays, Clock3, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import {
	CreateClinicTemplateSchema,
	type ClinicTemplate,
	type CreateClinicTemplateInput,
	type UpdateClinicTemplateInput,
} from "@repo/contracts"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/core/components/ui/field"
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import { EmptyState, ErrorState } from "@/features/admin/components/state-views"
import {
	useClinicsQuery,
	useCreateScheduleTemplateMutation,
	useDeleteScheduleTemplateMutation,
	useScheduleTemplatesQuery,
	useStaffClinicianListQuery,
	useUpdateScheduleTemplateMutation,
} from "@/features/scheduling/api/scheduling.hooks"

type DayOfWeek = ClinicTemplate["dayOfWeek"]
type WorkingHoursPeriod = {
	startTime: string
	endTime: string
}

type WeeklyHoursEntry = {
	dayOfWeek: DayOfWeek
	periods: WorkingHoursPeriod[]
}

const DAY_OPTIONS: Array<{ value: DayOfWeek; label: string; shortLabel: string }> = [
	{ value: 0, label: "Sunday", shortLabel: "Sun" },
	{ value: 1, label: "Monday", shortLabel: "Mon" },
	{ value: 2, label: "Tuesday", shortLabel: "Tue" },
	{ value: 3, label: "Wednesday", shortLabel: "Wed" },
	{ value: 4, label: "Thursday", shortLabel: "Thu" },
	{ value: 5, label: "Friday", shortLabel: "Fri" },
	{ value: 6, label: "Saturday", shortLabel: "Sat" },
]

const SLOT_DURATIONS = [5, 10, 15, 20, 30, 45, 60] as const
const EMPTY_PERIOD: WorkingHoursPeriod = {
	startTime: "09:00",
	endTime: "17:00",
}
const EMPTY_WEEKLY_HOURS: WeeklyHoursEntry[] = DAY_OPTIONS.map(day => ({
	dayOfWeek: day.value,
	periods: [],
}))

const TemplateFormSchema = z
	.object({
		facilityId: CreateClinicTemplateSchema.shape.facilityId,
		clinicName: CreateClinicTemplateSchema.shape.clinicName,
		clinicianStaffId: CreateClinicTemplateSchema.shape.clinicianStaffId,
		weeklyHours: z.array(
			z.object({
				dayOfWeek: z.number().int().min(0).max(6),
				periods: z.array(
					z.object({
						startTime: CreateClinicTemplateSchema.shape.startTime,
						endTime: CreateClinicTemplateSchema.shape.endTime,
					})
				),
			})
		),
		slotDurationMinutes: z.number().int().positive(),
		maxPatients: z.number().int().positive(),
		isActive: z.boolean(),
	})
	.superRefine((value, ctx) => {
		if (!SLOT_DURATIONS.includes(value.slotDurationMinutes as (typeof SLOT_DURATIONS)[number])) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["slotDurationMinutes"],
				message: "Select an allowed slot duration.",
			})
		}

		const totalPeriods = value.weeklyHours.reduce((count, day) => count + day.periods.length, 0)
		if (totalPeriods === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["weeklyHours"],
				message: "Add working hours for at least one day.",
			})
		}

		value.weeklyHours.forEach((day, dayIndex) => {
			day.periods.forEach((period, periodIndex) => {
				if (period.endTime <= period.startTime) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["weeklyHours", dayIndex, "periods", periodIndex, "endTime"],
						message: "End time must be later than start time.",
					})
				}
			})
		})
	})

type TemplateFormValues = z.infer<typeof TemplateFormSchema>

const DEFAULT_FORM_VALUES: TemplateFormValues = {
	facilityId: "",
	clinicName: "",
	clinicianStaffId: "",
	weeklyHours: EMPTY_WEEKLY_HOURS,
	slotDurationMinutes: 15,
	maxPatients: 20,
	isActive: true,
}

function toFieldErrors(errors: unknown[] | undefined) {
	return (
		errors?.map(error => ({
			message: error instanceof Error ? error.message : String(error),
		})) ?? []
	)
}

function cloneWeeklyHours(weeklyHours: WeeklyHoursEntry[]) {
	return weeklyHours.map(day => ({
		dayOfWeek: day.dayOfWeek,
		periods: day.periods.map(period => ({ ...period })),
	}))
}

function buildInitialWeeklyHours(template: ClinicTemplate | null): WeeklyHoursEntry[] {
	const weeklyHours = cloneWeeklyHours(EMPTY_WEEKLY_HOURS)

	if (!template) {
		return weeklyHours
	}

	const targetDay = weeklyHours.find(day => day.dayOfWeek === template.dayOfWeek)
	if (targetDay) {
		targetDay.periods = [{ startTime: template.startTime, endTime: template.endTime }]
	}

	return weeklyHours
}

function buildInitialValues(
	template: ClinicTemplate | null,
	fallbackFacilityId: string
): TemplateFormValues {
	if (!template) {
		return {
			...DEFAULT_FORM_VALUES,
			facilityId: fallbackFacilityId,
			weeklyHours: cloneWeeklyHours(EMPTY_WEEKLY_HOURS),
		}
	}

	return {
		facilityId: template.facilityId,
		clinicName: template.clinicName,
		clinicianStaffId: template.clinicianStaffId,
		weeklyHours: buildInitialWeeklyHours(template),
		slotDurationMinutes: template.slotDurationMinutes,
		maxPatients: template.maxPatients,
		isActive: template.isActive,
	}
}

function formatDay(dayOfWeek: DayOfWeek) {
	return DAY_OPTIONS.find(option => option.value === dayOfWeek)?.label ?? "Unknown"
}

function toFriendlyDisabledReason(
	issue: { message: string; path: Array<string | number> },
	values: TemplateFormValues
) {
	const [root, second, third] = issue.path

	if (root === "facilityId") {
		return "Select a clinic or facility."
	}

	if (root === "clinicianStaffId") {
		return values.facilityId
			? "Select a clinician for the chosen facility."
			: "Select a clinic or facility first, then choose a clinician."
	}

	if (root === "clinicName") {
		return "Enter a clinic name."
	}

	if (root === "weeklyHours") {
		if (typeof second === "number" && third === "periods") {
			const dayName = formatDay(values.weeklyHours[second]?.dayOfWeek as DayOfWeek)
			return `Check the working hours for ${dayName}. End time must be later than start time.`
		}

		return "Add working hours for at least one day."
	}

	if (root === "slotDurationMinutes") {
		return "Choose a valid slot duration."
	}

	if (root === "maxPatients") {
		return "Enter a valid maximum patient count."
	}

	return issue.message
}

function getDisabledReasons(params: {
	values: TemplateFormValues
	isEditing: boolean
	isSubmitting: boolean
	clinicsLoading: boolean
	cliniciansLoading: boolean
}) {
	const reasons: string[] = []
	const validationResult = TemplateFormSchema.safeParse(params.values)

	if (params.clinicsLoading) {
		reasons.push("Facilities are still loading.")
	}

	if (params.values.facilityId && params.cliniciansLoading) {
		reasons.push("Clinicians are still loading.")
	}

	if (!validationResult.success) {
		for (const issue of validationResult.error.issues) {
			const friendlyReason = toFriendlyDisabledReason(
				issue as { message: string; path: Array<string | number> },
				params.values
			)
			if (!reasons.includes(friendlyReason)) {
				reasons.push(friendlyReason)
			}
		}
	}

	if (params.isEditing) {
		const activeDay = params.values.weeklyHours.find(day => day.periods.length > 0)
		if (!activeDay) {
			reasons.push("Add working hours for this template day.")
		}
	}

	if (params.isSubmitting) {
		reasons.push("Template save is already in progress.")
	}

	return reasons
}

function TemplateDialog({
	open,
	onOpenChange,
	template,
	facilityId,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	template: ClinicTemplate | null
	facilityId: string
}) {
	const clinicsQuery = useClinicsQuery()
	const createTemplateMutation = useCreateScheduleTemplateMutation()
	const updateTemplateMutation = useUpdateScheduleTemplateMutation()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const initialValues = useMemo(
		() => buildInitialValues(template, facilityId),
		[template, facilityId]
	)
	const [selectedFacilityId, setSelectedFacilityId] = useState(
		initialValues.facilityId || facilityId
	)

	const form = useForm({
		defaultValues: initialValues,
		validators: {
			onSubmit: TemplateFormSchema,
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true)

			try {
				if (template) {
					const activeDay = value.weeklyHours.find(day => day.dayOfWeek === template.dayOfWeek)
					const period = activeDay?.periods[0]
					if (!period) {
						toast.error("Add working hours for the selected day.")
						return
					}

					const payload: UpdateClinicTemplateInput & { id: string } = {
						id: template.id,
						clinicName: value.clinicName.trim(),
						startTime: period.startTime,
						endTime: period.endTime,
						slotDurationMinutes: value.slotDurationMinutes,
						maxPatients: value.maxPatients,
						isActive: value.isActive,
					}

					await updateTemplateMutation.mutateAsync(payload)
					toast.success("Template updated.")
					onOpenChange(false)
					return
				}

				const payloadBase = {
					facilityId: value.facilityId,
					clinicName: value.clinicName.trim(),
					clinicianStaffId: value.clinicianStaffId,
					slotDurationMinutes: value.slotDurationMinutes,
					maxPatients: value.maxPatients,
				}

				const templateRequests = value.weeklyHours.flatMap(day =>
					day.periods.map(period =>
						createTemplateMutation.mutateAsync({
							...payloadBase,
							dayOfWeek: day.dayOfWeek,
							startTime: period.startTime,
							endTime: period.endTime,
						} satisfies CreateClinicTemplateInput)
					)
				)

				const results = await Promise.allSettled(templateRequests)

				const succeeded = results.filter(result => result.status === "fulfilled").length
				const failed = results.length - succeeded

				if (failed === 0) {
					toast.success(`${succeeded} template${succeeded === 1 ? "" : "s"} created successfully.`)
					onOpenChange(false)
					return
				}

				if (succeeded > 0) {
					toast.error(
						`${succeeded} template${succeeded === 1 ? "" : "s"} created, ${failed} failed.`
					)
					onOpenChange(false)
					return
				}

				toast.error("Failed to create templates.")
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Failed to save template.")
			} finally {
				setIsSubmitting(false)
			}
		},
	})

	const cliniciansQuery = useStaffClinicianListQuery({
		facilityId: selectedFacilityId,
	})

	const isEditing = Boolean(template)
	const isPending =
		isSubmitting || createTemplateMutation.isPending || updateTemplateMutation.isPending

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent size="xl" className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Edit Schedule Template" : "New Schedule Template"}
					</DialogTitle>
				</DialogHeader>

				<form
					className="flex min-h-0 flex-1 flex-col"
					onSubmit={event => {
						event.preventDefault()
						void form.handleSubmit()
					}}
				>
					<FieldGroup className="min-h-0 flex-1 overflow-y-auto pr-1">
						<div className="grid gap-4 lg:grid-cols-2">
							<form.Field name="facilityId">
								{field => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Clinic / Facility</FieldLabel>
											<Select
												value={field.state.value}
												onValueChange={value => {
													field.handleChange(value ?? "")
													setSelectedFacilityId(value ?? "")
													form.setFieldValue("clinicianStaffId", "")
												}}
												disabled={clinicsQuery.isLoading || clinicsQuery.data.length === 0}
											>
												<SelectTrigger className="w-full" aria-invalid={isInvalid}>
													<SelectValue>
														{field.state.value
															? clinicsQuery.data.find(clinic => clinic.id === field.state.value)
																	?.name
															: "Select a facility"}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													{clinicsQuery.data.map(clinic => (
														<SelectItem key={clinic.id} value={clinic.id}>
															{clinic.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{isInvalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
										</Field>
									)
								}}
							</form.Field>

							<form.Field name="clinicianStaffId">
								{field => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Clinician</FieldLabel>
											<Select
												value={field.state.value}
												onValueChange={value => field.handleChange(value ?? "")}
												disabled={!form.state.values.facilityId || cliniciansQuery.isLoading}
											>
												<SelectTrigger className="w-full" aria-invalid={isInvalid}>
													<SelectValue>
														{field.state.value
															? cliniciansQuery.data.find(
																	clinician => clinician.id === field.state.value
																)?.name
															: "Select a clinician"}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													{cliniciansQuery.data.map(clinician => (
														<SelectItem key={clinician.id} value={clinician.id}>
															{clinician.name}
															{clinician.department ? ` - ${clinician.department}` : ""}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{isInvalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
										</Field>
									)
								}}
							</form.Field>
						</div>

						<form.Field name="clinicName">
							{field => {
								const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Clinic Name</FieldLabel>
										<Input
											id={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={event => field.handleChange(event.target.value)}
											placeholder="OPD AM, Telemedicine, Nutrition Clinic"
											aria-invalid={isInvalid}
										/>
										<FieldDescription>
											Visible label used for this recurring clinic template.
										</FieldDescription>
										{isInvalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
									</Field>
								)
							}}
						</form.Field>

						<form.Field name="weeklyHours">
							{field => {
								const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
								return (
									<FieldSet>
										<FieldLegend variant="label">Working Hours</FieldLegend>

										<div className="space-y-3">
											{field.state.value.map((day, dayIndex) => {
												const dayLabel =
													DAY_OPTIONS.find(option => option.value === day.dayOfWeek)?.label ??
													"Unknown"
												const isEditableDay = !isEditing || day.dayOfWeek === template?.dayOfWeek

												return (
													<div
														key={day.dayOfWeek}
														className="bg-card rounded-2xl border px-4 py-2.5"
													>
														<div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
															<div className="w-full max-w-32 shrink-0">
																<div className="font-medium">{dayLabel}</div>
															</div>

															<div className="flex-1 space-y-2">
																{day.periods.length === 0 ? (
																	<Button
																		type="button"
																		variant="ghost"
																		className="text-muted-foreground justify-start px-0"
																		disabled={!isEditableDay}
																		onClick={() => {
																			if (!isEditableDay) return
																			const nextValue = field.state.value.map((entry, index) =>
																				index === dayIndex
																					? {
																							...entry,
																							periods: [{ ...EMPTY_PERIOD }],
																						}
																					: entry
																			)
																			field.handleChange(nextValue)
																		}}
																	>
																		<Plus className="mr-2 size-4" />
																		Add hours
																	</Button>
																) : (
																	day.periods.map((period, periodIndex) => (
																		<div
																			key={`${day.dayOfWeek}-${periodIndex}`}
																			className="flex flex-col gap-2 lg:flex-row lg:items-center"
																		>
																			<Input
																				type="time"
																				value={period.startTime}
																				disabled={!isEditableDay}
																				className="w-full lg:w-44"
																				onChange={event => {
																					const nextValue = field.state.value.map(
																						(entry, entryIndex) =>
																							entryIndex === dayIndex
																								? {
																										...entry,
																										periods: entry.periods.map(
																											(candidate, candidateIndex) =>
																												candidateIndex === periodIndex
																													? {
																															...candidate,
																															startTime: event.target.value,
																														}
																													: candidate
																										),
																									}
																								: entry
																					)
																					field.handleChange(nextValue)
																				}}
																			/>
																			<div className="text-muted-foreground px-1 text-sm">to</div>
																			<Input
																				type="time"
																				value={period.endTime}
																				disabled={!isEditableDay}
																				className="w-full lg:w-44"
																				onChange={event => {
																					const nextValue = field.state.value.map(
																						(entry, entryIndex) =>
																							entryIndex === dayIndex
																								? {
																										...entry,
																										periods: entry.periods.map(
																											(candidate, candidateIndex) =>
																												candidateIndex === periodIndex
																													? {
																															...candidate,
																															endTime: event.target.value,
																														}
																													: candidate
																										),
																									}
																								: entry
																					)
																					field.handleChange(nextValue)
																				}}
																			/>

																			<div className="flex items-center gap-1 lg:ml-auto">
																				<Button
																					type="button"
																					variant="ghost"
																					size="sm"
																					disabled={!isEditableDay}
																					onClick={() => {
																						if (!isEditableDay) return
																						const nextPeriods = day.periods.filter(
																							(_, index) => index !== periodIndex
																						)
																						const nextValue = field.state.value.map(
																							(entry, entryIndex) =>
																								entryIndex === dayIndex
																									? {
																											...entry,
																											periods: nextPeriods,
																										}
																									: entry
																						)
																						field.handleChange(nextValue)
																					}}
																				>
																					<Trash2 className="size-4" />
																				</Button>
																				<Button
																					type="button"
																					variant="ghost"
																					size="sm"
																					disabled={!isEditableDay}
																					onClick={() => {
																						if (!isEditableDay) return
																						const nextValue = field.state.value.map(
																							(entry, entryIndex) =>
																								entryIndex === dayIndex
																									? {
																											...entry,
																											periods: [
																												...entry.periods,
																												{ ...EMPTY_PERIOD },
																											],
																										}
																									: entry
																						)
																						field.handleChange(nextValue)
																					}}
																				>
																					<Plus className="size-4" />
																				</Button>
																			</div>
																		</div>
																	))
																)}

																{isEditing && day.dayOfWeek !== template?.dayOfWeek ? (
																	<p className="text-muted-foreground text-xs">
																		Editing keeps this template on{" "}
																		{formatDay(template?.dayOfWeek ?? 0)}. Create a new template to
																		add another day.
																	</p>
																) : null}
															</div>
														</div>
													</div>
												)
											})}
										</div>
										{isInvalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
									</FieldSet>
								)
							}}
						</form.Field>

						<div className="grid gap-4 md:grid-cols-2">
							<form.Field name="slotDurationMinutes">
								{field => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Slot Duration</FieldLabel>
											<Select
												value={String(field.state.value)}
												onValueChange={value => field.handleChange(Number(value ?? 15))}
											>
												<SelectTrigger className="w-full" aria-invalid={isInvalid}>
													<SelectValue>{field.state.value} minutes</SelectValue>
												</SelectTrigger>
												<SelectContent>
													{SLOT_DURATIONS.map(duration => (
														<SelectItem key={duration} value={String(duration)}>
															{duration} minutes
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{isInvalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
										</Field>
									)
								}}
							</form.Field>

							<form.Field name="maxPatients">
								{field => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Max Patients</FieldLabel>
											<Input
												id={field.name}
												type="number"
												min={1}
												value={String(field.state.value)}
												onBlur={field.handleBlur}
												onChange={event => field.handleChange(Number(event.target.value))}
												aria-invalid={isInvalid}
											/>
											{isInvalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
										</Field>
									)
								}}
							</form.Field>
						</div>

						{isEditing && (
							<form.Field name="isActive">
								{field => (
									<Field>
										<FieldLabel className="rounded-lg border px-3 py-2">
											<Checkbox
												checked={field.state.value}
												onCheckedChange={checked => field.handleChange(Boolean(checked))}
											/>
											<div className="flex flex-col">
												<span>Active template</span>
												<span className="text-muted-foreground text-xs">
													Turn this off to stop future slot generation.
												</span>
											</div>
										</FieldLabel>
									</Field>
								)}
							</form.Field>
						)}
					</FieldGroup>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<form.Subscribe selector={state => state.values}>
							{values => {
								const disabledReasons = getDisabledReasons({
									values,
									isEditing,
									isSubmitting: isPending,
									clinicsLoading: clinicsQuery.isLoading,
									cliniciansLoading: cliniciansQuery.isLoading,
								})
								const canSubmit = disabledReasons.length === 0

								if (canSubmit) {
									return (
										<Button type="submit" disabled={isPending}>
											{isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Templates"}
										</Button>
									)
								}

								return (
									<Tooltip>
										<TooltipTrigger render={<span className="inline-flex" />}>
											<Button type="submit" disabled>
												{isEditing ? "Save Changes" : "Create Templates"}
											</Button>
										</TooltipTrigger>
										<TooltipContent side="top" className="max-w-xs text-xs">
											<ul className="list-disc space-y-1 pl-4">
												{disabledReasons.map(reason => (
													<li key={reason}>{reason}</li>
												))}
											</ul>
										</TooltipContent>
									</Tooltip>
								)
							}}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

interface TemplateBuilderProps {
	facilityId: string
}

export function TemplateBuilder({ facilityId }: TemplateBuilderProps) {
	const templatesQuery = useScheduleTemplatesQuery({ facilityId, limit: 100 })
	const cliniciansQuery = useStaffClinicianListQuery({ facilityId })
	const deactivateTemplateMutation = useDeleteScheduleTemplateMutation()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [selectedTemplate, setSelectedTemplate] = useState<ClinicTemplate | null>(null)
	const [deleteTarget, setDeleteTarget] = useState<ClinicTemplate | null>(null)

	const clinicianNameById = useMemo(
		() => new Map(cliniciansQuery.data.map(clinician => [clinician.id, clinician.name] as const)),
		[cliniciansQuery.data]
	)

	const templates = useMemo(
		() =>
			(templatesQuery.data ?? []).map(template => ({
				...template,
				clinicianName: clinicianNameById.get(template.clinicianStaffId) ?? "Unknown clinician",
			})),
		[clinicianNameById, templatesQuery.data]
	)

	function openCreateDialog() {
		setSelectedTemplate(null)
		setDialogOpen(true)
	}

	function openEditDialog(template: ClinicTemplate) {
		setSelectedTemplate(template)
		setDialogOpen(true)
	}

	async function handleDeactivateTemplate() {
		if (!deleteTarget) {
			return
		}

		try {
			await deactivateTemplateMutation.mutateAsync(deleteTarget.id)
			toast.success("Template deactivated.")
			setDeleteTarget(null)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to deactivate template.")
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Clinic Schedule Templates</h2>
					<p className="text-muted-foreground text-sm">
						Define recurring clinic days, provider coverage, operating hours, and slot capacity.
					</p>
				</div>
				<Button onClick={openCreateDialog}>
					<Plus className="mr-2 size-4" />
					New Template
				</Button>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Configured Templates</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{templatesQuery.isLoading ? (
						<div className="space-y-3">
							{Array.from({ length: 4 }).map((_, index) => (
								<div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-6">
									<Skeleton className="h-5 w-32" />
									<Skeleton className="h-5 w-24" />
									<Skeleton className="h-5 w-20" />
									<Skeleton className="h-5 w-28" />
									<Skeleton className="h-5 w-20" />
									<Skeleton className="h-8 w-24 justify-self-end" />
								</div>
							))}
						</div>
					) : templatesQuery.isError ? (
						<ErrorState
							title="Failed to load templates"
							error={templatesQuery.error}
							retry={() => {
								void templatesQuery.refetch()
							}}
						/>
					) : templates.length === 0 ? (
						<EmptyState title="No templates configured yet." />
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Clinic</TableHead>
									<TableHead>Clinician</TableHead>
									<TableHead>Day</TableHead>
									<TableHead>Hours</TableHead>
									<TableHead>Capacity</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{templates.map(template => (
									<TableRow key={template.id}>
										<TableCell className="font-medium">{template.clinicName}</TableCell>
										<TableCell>{template.clinicianName}</TableCell>
										<TableCell>{formatDay(template.dayOfWeek)}</TableCell>
										<TableCell>
											<span className="flex items-center gap-2">
												<Clock3 className="text-muted-foreground size-4" />
												{template.startTime} - {template.endTime}
											</span>
										</TableCell>
										<TableCell>
											<span className="flex items-center gap-2">
												<CalendarDays className="text-muted-foreground size-4" />
												{template.slotDurationMinutes} min / {template.maxPatients} patients
											</span>
										</TableCell>
										<TableCell>
											<Badge variant={template.isActive ? "default" : "secondary"}>
												{template.isActive ? "Active" : "Inactive"}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => openEditDialog(template)}
												>
													Edit
												</Button>
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive"
													disabled={!template.isActive || deactivateTemplateMutation.isPending}
													onClick={() => setDeleteTarget(template)}
												>
													<Trash2 className="mr-1 size-4" />
													Delete
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{dialogOpen ? (
				<TemplateDialog
					key={selectedTemplate?.id ?? "new-template"}
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					template={selectedTemplate}
					facilityId={facilityId}
				/>
			) : null}

			<AlertDialog
				open={Boolean(deleteTarget)}
				onOpenChange={open => {
					if (!open) {
						setDeleteTarget(null)
					}
				}}
			>
				<AlertDialogContent size="default">
					<AlertDialogHeader>
						<AlertDialogMedia>
							<Trash2 className="text-destructive size-5" />
						</AlertDialogMedia>
						<AlertDialogTitle>Delete template?</AlertDialogTitle>
						<AlertDialogDescription>
							This workspace currently deactivates the template instead of hard-deleting it, so
							future slot generation stops without removing historical records.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={deactivateTemplateMutation.isPending}
							onClick={() => {
								void handleDeactivateTemplate()
							}}
						>
							{deactivateTemplateMutation.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
