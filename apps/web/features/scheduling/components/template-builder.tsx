"use client"

import { useMemo, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { CalendarDays, Clock3, Plus, Trash2 } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"

import {
	CreateClinicTemplateSchema,
	type ClinicTemplate,
	type CreateClinicTemplateInput,
	type UpdateClinicTemplateInput,
} from "@repo/contracts"

import { EmptyState, ErrorState } from "@/features/admin/components/state-views"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@/core/components/ui/alert-dialog"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"
import {
	useClinicsQuery,
	useCreateScheduleTemplateMutation,
	useDeleteScheduleTemplateMutation,
	useScheduleTemplatesQuery,
	useStaffClinicianListQuery,
	useUpdateScheduleTemplateMutation,
} from "@/features/scheduling/api/scheduling.hooks"

type DayOfWeek = ClinicTemplate["dayOfWeek"]

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

const TemplateFormSchema = z
	.object({
		facilityId: CreateClinicTemplateSchema.shape.facilityId,
		clinicName: CreateClinicTemplateSchema.shape.clinicName,
		clinicianStaffId: CreateClinicTemplateSchema.shape.clinicianStaffId,
		dayOfWeeks: z.array(z.number().int().min(0).max(6)).min(1, "Select at least one day."),
		startTime: CreateClinicTemplateSchema.shape.startTime,
		endTime: CreateClinicTemplateSchema.shape.endTime,
		slotDurationMinutes: z.number().int().positive(),
		maxPatients: z.number().int().positive(),
		isActive: z.boolean(),
	})
	.superRefine((value, ctx) => {
		if (value.endTime <= value.startTime) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["endTime"],
				message: "End time must be later than start time.",
			})
		}

		if (!SLOT_DURATIONS.includes(value.slotDurationMinutes as (typeof SLOT_DURATIONS)[number])) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["slotDurationMinutes"],
				message: "Select an allowed slot duration.",
			})
		}
	})

type TemplateFormValues = z.infer<typeof TemplateFormSchema>

const DEFAULT_FORM_VALUES: TemplateFormValues = {
	facilityId: "",
	clinicName: "",
	clinicianStaffId: "",
	dayOfWeeks: [],
	startTime: "08:00",
	endTime: "17:00",
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

function buildInitialValues(template: ScheduleTemplate | null, fallbackFacilityId: string): TemplateFormValues {
	if (!template) {
		return {
			...DEFAULT_FORM_VALUES,
			facilityId: fallbackFacilityId,
		}
	}

	return {
		facilityId: template.facilityId,
		clinicName: template.clinicName,
		clinicianStaffId: template.clinicianStaffId,
		dayOfWeeks: [template.dayOfWeek],
		startTime: template.startTime,
		endTime: template.endTime,
		slotDurationMinutes: template.slotDurationMinutes,
		maxPatients: template.maxPatients,
		isActive: template.isActive,
	}
}

function formatDay(dayOfWeek: DayOfWeek) {
	return DAY_OPTIONS.find(option => option.value === dayOfWeek)?.label ?? "Unknown"
}

function TemplateDialog({
	open,
	onOpenChange,
	template,
	facilityId,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	template: ScheduleTemplate | null
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

	const cliniciansQuery = useStaffClinicianListQuery({
		facilityId: initialValues.facilityId || facilityId,
	})

	const form = useForm({
		defaultValues: initialValues,
		validators: {
			onSubmit: TemplateFormSchema,
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true)

			try {
				if (template) {
					const payload: UpdateScheduleTemplateInput & { id: string } = {
						id: template.id,
						facilityId: value.facilityId,
						clinicName: value.clinicName.trim(),
						clinicianStaffId: value.clinicianStaffId,
						startTime: value.startTime,
						endTime: value.endTime,
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
					startTime: value.startTime,
					endTime: value.endTime,
					slotDurationMinutes: value.slotDurationMinutes,
					maxPatients: value.maxPatients,
				}

					const results = await Promise.allSettled(
						value.dayOfWeeks.map(dayOfWeek =>
							createTemplateMutation.mutateAsync({
								...payloadBase,
								dayOfWeek: dayOfWeek as DayOfWeek,
							} satisfies CreateScheduleTemplateInput)
						)
					)

				const succeeded = results.filter(result => result.status === "fulfilled").length
				const failed = results.length - succeeded

				if (failed === 0) {
					toast.success(
						`${succeeded} template${succeeded === 1 ? "" : "s"} created successfully.`
					)
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

	const canSubmit = TemplateFormSchema.safeParse(form.state.values).success
	const isEditing = Boolean(template)
	const isPending =
		isSubmitting || createTemplateMutation.isPending || updateTemplateMutation.isPending

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Edit Schedule Template" : "New Schedule Template"}</DialogTitle>
				</DialogHeader>

				<form
					className="space-y-6"
					onSubmit={event => {
						event.preventDefault()
						void form.handleSubmit()
					}}
				>
					<FieldGroup>
						<div className="grid gap-4 md:grid-cols-2">
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
													form.setFieldValue("clinicianStaffId", "")
												}}
												disabled={clinicsQuery.isLoading || clinicsQuery.data.length === 0}
											>
												<SelectTrigger className="w-full" aria-invalid={isInvalid}>
													<SelectValue>
														{field.state.value
															? clinicsQuery.data.find(clinic => clinic.id === field.state.value)?.name
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
															? cliniciansQuery.data.find(clinician => clinician.id === field.state.value)
																	?.name
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
										<FieldDescription>Visible label used for this recurring clinic template.</FieldDescription>
										{isInvalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
									</Field>
								)
							}}
						</form.Field>

						<form.Field name="dayOfWeeks">
							{field => {
								const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
								return (
									<FieldSet>
										<FieldLegend variant="label">Days of Week</FieldLegend>
										<div
											className={cn(
												"grid gap-2 sm:grid-cols-2 lg:grid-cols-4",
												isEditing && "opacity-80"
											)}
										>
											{DAY_OPTIONS.map(option => {
												const checked = field.state.value.includes(option.value)
												return (
													<FieldLabel key={option.value} className="rounded-lg border px-3 py-2">
														<Checkbox
															checked={checked}
															disabled={isEditing}
															onCheckedChange={nextChecked => {
																if (isEditing) return

																const nextValues = nextChecked
																	? [...field.state.value, option.value]
																	: field.state.value.filter(value => value !== option.value)

																field.handleChange(
																	nextValues.sort((left, right) => left - right) as DayOfWeek[]
																)
															}}
														/>
														<div className="flex flex-col">
															<span>{option.shortLabel}</span>
															<span className="text-xs text-muted-foreground">{option.label}</span>
														</div>
													</FieldLabel>
												)
											})}
										</div>
										{isEditing && (
											<FieldDescription>
												Day selection is locked for existing templates. Create a new template to move it to another day.
											</FieldDescription>
										)}
										{isInvalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
									</FieldSet>
								)
							}}
						</form.Field>

						<div className="grid gap-4 md:grid-cols-2">
							<form.Field name="startTime">
								{field => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Start Time</FieldLabel>
											<Input
												id={field.name}
												type="time"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={event => field.handleChange(event.target.value)}
												aria-invalid={isInvalid}
											/>
											{isInvalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
										</Field>
									)
								}}
							</form.Field>

							<form.Field name="endTime">
								{field => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>End Time</FieldLabel>
											<Input
												id={field.name}
												type="time"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={event => field.handleChange(event.target.value)}
												aria-invalid={isInvalid}
											/>
											{isInvalid && <FieldError errors={toFieldErrors(field.state.meta.errors)} />}
										</Field>
									)
								}}
							</form.Field>
						</div>

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
												<span className="text-xs text-muted-foreground">
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
						<Button type="submit" disabled={isPending || !canSubmit}>
							{isPending
								? "Saving..."
								: isEditing
									? "Save Changes"
									: "Create Templates"}
						</Button>
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
	const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null)
	const [deleteTarget, setDeleteTarget] = useState<ScheduleTemplate | null>(null)

	const clinicianNameById = useMemo(
		() =>
			new Map(
				cliniciansQuery.data.map(clinician => [clinician.id, clinician.name] as const)
			),
		[cliniciansQuery.data]
	)

	const templates = useMemo(
		() =>
			(templatesQuery.data ?? []).map(template => ({
				...template,
				clinicianName:
					clinicianNameById.get(template.clinicianStaffId) ??
					template.clinicianName ??
					"Unknown clinician",
			})),
		[clinicianNameById, templatesQuery.data]
	)

	function openCreateDialog() {
		setSelectedTemplate(null)
		setDialogOpen(true)
	}

	function openEditDialog(template: ScheduleTemplate) {
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
					<p className="text-sm text-muted-foreground">
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
						<div className="space-y-3">
							{templates.map(template => (
								<div
									key={template.id}
									className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between"
								>
									<div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
										<div>
											<p className="text-xs uppercase tracking-wide text-muted-foreground">Clinic</p>
											<p className="font-medium">{template.clinicName}</p>
										</div>
										<div>
											<p className="text-xs uppercase tracking-wide text-muted-foreground">Clinician</p>
											<p className="font-medium">{template.clinicianName}</p>
										</div>
										<div>
											<p className="text-xs uppercase tracking-wide text-muted-foreground">Day</p>
											<p className="font-medium">{formatDay(template.dayOfWeek)}</p>
										</div>
										<div>
											<p className="text-xs uppercase tracking-wide text-muted-foreground">Hours</p>
											<p className="flex items-center gap-2 font-medium">
												<Clock3 className="size-4 text-muted-foreground" />
												{template.startTime} - {template.endTime}
											</p>
										</div>
										<div>
											<p className="text-xs uppercase tracking-wide text-muted-foreground">Capacity</p>
											<p className="flex items-center gap-2 font-medium">
												<CalendarDays className="size-4 text-muted-foreground" />
												{template.slotDurationMinutes} min / {template.maxPatients} patients
											</p>
										</div>
									</div>

									<div className="flex items-center gap-2">
										<Badge variant={template.isActive ? "default" : "secondary"}>
											{template.isActive ? "Active" : "Inactive"}
										</Badge>
										<Button variant="outline" size="sm" onClick={() => openEditDialog(template)}>
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
								</div>
							))}
						</div>
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
							<Trash2 className="size-5 text-destructive" />
						</AlertDialogMedia>
						<AlertDialogTitle>Delete template?</AlertDialogTitle>
						<AlertDialogDescription>
							This workspace currently deactivates the template instead of hard-deleting it, so future slot generation stops without removing historical records.
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
