"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
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
import {
	type CreateScheduleTemplateInput,
	type DayOfWeek,
	type ScheduleTemplate,
	useCreateScheduleTemplateMutation,
	useDeleteScheduleTemplateMutation,
	useScheduleTemplatesQuery,
	useUpdateScheduleTemplateMutation,
} from "@/features/scheduling/api/scheduling.hooks"

const DAY_LABELS: Record<DayOfWeek, string> = {
	0: "Sunday",
	1: "Monday",
	2: "Tuesday",
	3: "Wednesday",
	4: "Thursday",
	5: "Friday",
	6: "Saturday",
}

const SLOT_DURATIONS = [15, 20, 30, 45, 60]

const DEFAULT_FORM: CreateScheduleTemplateInput = {
	clinicId: "",
	clinicianId: "",
	dayOfWeek: 1,
	startTime: "08:00",
	endTime: "17:00",
	slotDurationMinutes: 30,
	maxPatients: 20,
}

interface TemplateBuilderProps {
	facilityId: string
}

export function TemplateBuilder({ facilityId: _facilityId }: TemplateBuilderProps) {
	const { data, isLoading } = useScheduleTemplatesQuery({ limit: 100 })
	const createMut = useCreateScheduleTemplateMutation()
	const updateMut = useUpdateScheduleTemplateMutation()
	const deleteMut = useDeleteScheduleTemplateMutation()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [form, setForm] = useState<CreateScheduleTemplateInput>(DEFAULT_FORM)
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

	function openCreate() {
		setEditingId(null)
		setForm(DEFAULT_FORM)
		setDialogOpen(true)
	}

	function openEdit(tmpl: ScheduleTemplate) {
		setEditingId(tmpl.id)
		setForm({
			clinicId: tmpl.clinicId,
			clinicianId: tmpl.clinicianId,
			dayOfWeek: tmpl.dayOfWeek,
			startTime: tmpl.startTime,
			endTime: tmpl.endTime,
			slotDurationMinutes: tmpl.slotDurationMinutes,
			maxPatients: tmpl.maxPatients,
		})
		setDialogOpen(true)
	}

	function handleSave() {
		if (!form.clinicId || !form.clinicianId) return
		if (editingId) {
			updateMut.mutate(
				{ id: editingId, ...form },
				{ onSuccess: () => setDialogOpen(false) }
			)
		} else {
			createMut.mutate(form, { onSuccess: () => setDialogOpen(false) })
		}
	}

	function handleDelete(id: string) {
		deleteMut.mutate(id, {
			onSuccess: () => setDeleteConfirmId(null),
		})
	}

	const isPending = createMut.isPending || updateMut.isPending

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Clinic Schedule Templates</h2>
					<p className="text-muted-foreground text-sm">
						Define available days, time slots, and patient limits per clinician.
					</p>
				</div>
				<Button onClick={openCreate}>+ New Template</Button>
			</div>

			<Card>
				<CardContent className="p-0">
					{isLoading ? (
						<p className="text-muted-foreground py-8 text-center">Loading templates…</p>
					) : !data?.length ? (
						<p className="text-muted-foreground py-8 text-center">
							No templates configured yet.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Clinician</TableHead>
									<TableHead>Clinic</TableHead>
									<TableHead>Day</TableHead>
									<TableHead>Hours</TableHead>
									<TableHead>Slot</TableHead>
									<TableHead>Max Pts</TableHead>
									<TableHead>Status</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.map((t) => (
									<TableRow key={t.id}>
										<TableCell className="font-medium">{t.clinicianName}</TableCell>
										<TableCell>{t.clinicName}</TableCell>
										<TableCell>{DAY_LABELS[t.dayOfWeek]}</TableCell>
										<TableCell>
											{t.startTime} – {t.endTime}
										</TableCell>
										<TableCell>{t.slotDurationMinutes} min</TableCell>
										<TableCell>{t.maxPatients}</TableCell>
										<TableCell>
											{t.isActive ? (
												<Badge variant="default">Active</Badge>
											) : (
												<Badge variant="secondary">Inactive</Badge>
											)}
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => openEdit(t)}
												>
													Edit
												</Button>
												<Button
													size="sm"
													variant="ghost"
													className="text-destructive"
													onClick={() => setDeleteConfirmId(t.id)}
												>
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

			{/* Create / Edit Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editingId ? "Edit Schedule Template" : "New Schedule Template"}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-3">
						<div className="space-y-1">
							<Label>Clinic ID</Label>
							<Input
								placeholder="Enter clinic ID"
								value={form.clinicId}
								onChange={(e) => setForm((f) => ({ ...f, clinicId: e.target.value }))}
							/>
						</div>

						<div className="space-y-1">
							<Label>Clinician ID</Label>
							<Input
								placeholder="Enter clinician ID"
								value={form.clinicianId}
								onChange={(e) =>
									setForm((f) => ({ ...f, clinicianId: e.target.value }))
								}
							/>
						</div>

						<div className="space-y-1">
							<Label>Day of Week</Label>
							<Select
								value={String(form.dayOfWeek)}
								onValueChange={(v) => {
									if (v) setForm((f) => ({ ...f, dayOfWeek: Number(v) as DayOfWeek }))
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(Object.entries(DAY_LABELS) as [string, string][]).map(([val, label]) => (
										<SelectItem key={val} value={val}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>Start Time</Label>
								<Input
									type="time"
									value={form.startTime}
									onChange={(e) =>
										setForm((f) => ({ ...f, startTime: e.target.value }))
									}
								/>
							</div>
							<div className="space-y-1">
								<Label>End Time</Label>
								<Input
									type="time"
									value={form.endTime}
									onChange={(e) =>
										setForm((f) => ({ ...f, endTime: e.target.value }))
									}
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>Slot Duration</Label>
								<Select
									value={String(form.slotDurationMinutes)}
									onValueChange={(v) => {
										if (v)
											setForm((f) => ({
												...f,
												slotDurationMinutes: Number(v),
											}))
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{SLOT_DURATIONS.map((d) => (
											<SelectItem key={d} value={String(d)}>
												{d} min
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1">
								<Label>Max Patients</Label>
								<Input
									type="number"
									min={1}
									max={100}
									value={form.maxPatients}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											maxPatients: Number(e.target.value),
										}))
									}
								/>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleSave}
							disabled={isPending || !form.clinicId || !form.clinicianId}
						>
							{isPending ? "Saving…" : editingId ? "Save Changes" : "Create Template"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirm Dialog */}
			<Dialog
				open={!!deleteConfirmId}
				onOpenChange={(open) => {
					if (!open) setDeleteConfirmId(null)
				}}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Delete Template?</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground text-sm">
						This schedule template will be removed. Existing bookings are not affected.
					</p>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={deleteMut.isPending}
							onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
						>
							{deleteMut.isPending ? "Deleting…" : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
