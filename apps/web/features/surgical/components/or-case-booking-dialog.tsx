"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2, Plus, X } from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
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
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
import { useStaffClinicianListQuery } from "@/features/scheduling/api/scheduling.hooks"

import {
	useCheckOrConflictsMutation,
	useCreateSurgicalCaseMutation,
	type OrConflict,
} from "../api/surgical.hooks"

interface OrCaseBookingDialogProps {
	open: boolean
	onClose: () => void
	onSuccess: () => void
	facilityId: string
	orSuite: string
	scheduledDatetime: string
}

const SURGICAL_TYPES = [
	{ value: "elective", label: "Elective" },
	{ value: "urgent", label: "Urgent" },
	{ value: "emergency", label: "Emergency" },
]

const COMMON_EQUIPMENT = [
	"Laparoscopic Tower",
	"C-Arm Fluoroscopy",
	"Arthroscopy Equipment",
	"Microscope",
	"Harmonic Scalpel",
	"Cell Saver",
	"Nerve Monitor",
	"Bronchoscope",
]

function formatConflictMessage(conflict: OrConflict): string {
	const start = new Date(conflict.conflictingStart).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
	const end = new Date(conflict.conflictingEnd).toLocaleTimeString("en-PH", {
		hour: "2-digit",
		minute: "2-digit",
	})

	switch (conflict.type) {
		case "room":
			return `OR room conflict: "${conflict.conflictingProcedure}" is booked ${start}–${end}`
		case "surgeon":
			return `Surgeon conflict: assigned surgeon has "${conflict.conflictingProcedure}" at ${start}–${end}`
		case "equipment":
			return `Equipment conflict: "${conflict.equipmentItem}" is needed for "${conflict.conflictingProcedure}" at ${start}–${end}`
	}
}

export function OrCaseBookingDialog({
	open,
	onClose,
	onSuccess,
	facilityId,
	orSuite,
	scheduledDatetime,
}: OrCaseBookingDialogProps) {
	const [patientSearch, setPatientSearch] = useState("")
	const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
	const [selectedPatientLabel, setSelectedPatientLabel] = useState("")
	const [procedureName, setProcedureName] = useState("")
	const [surgicalType, setSurgicalType] = useState("elective")
	const [surgeonStaffId, setSurgeonStaffId] = useState("")
	const [anesthesiologistStaffId, setAnesthesiologistStaffId] = useState("")
	const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState(120)
	const [equipmentInput, setEquipmentInput] = useState("")
	const [requiredEquipment, setRequiredEquipment] = useState<string[]>([])
	const [notes, setNotes] = useState("")
	const [conflicts, setConflicts] = useState<OrConflict[]>([])
	const [conflictChecked, setConflictChecked] = useState(false)

	const patientSearchQuery = usePatientSearchQuery(
		{ facilityId, search: patientSearch },
		{ enabled: open && patientSearch.length >= 2 }
	)

	const cliniciansQuery = useStaffClinicianListQuery({ facilityId })
	const clinicians = cliniciansQuery.data ?? []

	const checkConflictsMut = useCheckOrConflictsMutation()
	const createCaseMut = useCreateSurgicalCaseMutation()

	useEffect(() => {
		if (!open) {
			setPatientSearch("")
			setSelectedPatientId(null)
			setSelectedPatientLabel("")
			setProcedureName("")
			setSurgicalType("elective")
			setSurgeonStaffId("")
			setAnesthesiologistStaffId("")
			setEstimatedDurationMinutes(120)
			setRequiredEquipment([])
			setEquipmentInput("")
			setNotes("")
			setConflicts([])
			setConflictChecked(false)
		}
	}, [open])

	async function handleCheckConflicts() {
		const result = await checkConflictsMut.mutateAsync({
			facilityId,
			orSuite,
			scheduledDatetime,
			estimatedDurationMinutes,
			surgeonStaffId: surgeonStaffId || undefined,
			requiredEquipment: requiredEquipment.length > 0 ? requiredEquipment : undefined,
		})
		setConflicts(result.conflicts)
		setConflictChecked(true)
	}

	async function handleBook() {
		if (!selectedPatientId || !procedureName) return

		await createCaseMut.mutateAsync({
			facilityId,
			patientId: selectedPatientId,
			procedureName,
			surgicalType,
			orSuite,
			scheduledDatetime,
			surgeonStaffId: surgeonStaffId || undefined,
			anesthesiologistStaffId: anesthesiologistStaffId || undefined,
			estimatedDurationMinutes,
			requiredEquipment: requiredEquipment.length > 0 ? requiredEquipment : undefined,
			notes: notes || undefined,
		})

		onSuccess()
		onClose()
	}

	function addEquipment(item: string) {
		const trimmed = item.trim()
		if (trimmed && !requiredEquipment.includes(trimmed)) {
			setRequiredEquipment(prev => [...prev, trimmed])
			setConflictChecked(false)
		}
		setEquipmentInput("")
	}

	const canBook = !!selectedPatientId && !!procedureName && !createCaseMut.isPending

	const scheduledLabel = new Date(scheduledDatetime).toLocaleString("en-PH", {
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})

	return (
		<Dialog open={open} onOpenChange={o => !o && onClose()}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Book OR Case</DialogTitle>
					<p className="text-muted-foreground text-sm">
						{orSuite} · {scheduledLabel}
					</p>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{/* Patient search */}
					<div className="space-y-1">
						<Label>Patient *</Label>
						{selectedPatientId ? (
							<div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
								<span className="flex-1">{selectedPatientLabel}</span>
								<button
									onClick={() => {
										setSelectedPatientId(null)
										setSelectedPatientLabel("")
									}}
									className="text-muted-foreground hover:text-foreground"
								>
									<X className="size-4" />
								</button>
							</div>
						) : (
							<div className="relative">
								<Input
									placeholder="Search by name or MRN…"
									value={patientSearch}
									onChange={e => setPatientSearch(e.target.value)}
								/>
								{patientSearch.length >= 2 && (
									<div className="border-border absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg">
										{patientSearchQuery.isLoading ? (
											<div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
												<Loader2 className="size-3 animate-spin" /> Searching…
											</div>
										) : (patientSearchQuery.data?.data ?? []).length === 0 ? (
											<div className="text-muted-foreground px-3 py-2 text-sm">
												No patients found
											</div>
										) : (
											patientSearchQuery.data?.data.map(p => (
												<button
													key={p.id}
													className="hover:bg-muted w-full px-3 py-2 text-left text-sm"
													onClick={() => {
														setSelectedPatientId(p.id)
														setSelectedPatientLabel(`${p.firstName} ${p.lastName} · ${p.mrn ?? ""}`)
														setPatientSearch("")
													}}
												>
													<span className="font-medium">
														{p.firstName} {p.lastName}
													</span>
													{p.mrn && (
														<span className="text-muted-foreground ml-2 text-xs">{p.mrn}</span>
													)}
												</button>
											))
										)}
									</div>
								)}
							</div>
						)}
					</div>

					{/* Procedure & type */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label>Procedure Name *</Label>
							<Input
								placeholder="e.g. Appendectomy"
								value={procedureName}
								onChange={e => {
									setProcedureName(e.target.value)
									setConflictChecked(false)
								}}
							/>
						</div>
						<div className="space-y-1">
							<Label>Surgical Type</Label>
							<Select
								value={surgicalType}
								onValueChange={v => {
									if (v) setSurgicalType(v)
								}}
							>
								<SelectTrigger>
									<SelectValue>
										{SURGICAL_TYPES.find(t => t.value === surgicalType)?.label ?? surgicalType}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{SURGICAL_TYPES.map(t => (
										<SelectItem key={t.value} value={t.value}>
											{t.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Surgeon & Anesthesiologist */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label>Surgeon</Label>
							<Select
								value={surgeonStaffId}
								onValueChange={v => {
									if (v) {
										setSurgeonStaffId(v)
										setConflictChecked(false)
									}
								}}
							>
								<SelectTrigger>
									<SelectValue>
										{surgeonStaffId
											? (clinicians.find(c => c.id === surgeonStaffId)?.name ?? "Select surgeon…")
											: "Select surgeon…"}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{clinicians.map(c => (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Anesthesiologist</Label>
							<Select
								value={anesthesiologistStaffId}
								onValueChange={v => {
									if (v) setAnesthesiologistStaffId(v)
								}}
							>
								<SelectTrigger>
									<SelectValue>
										{anesthesiologistStaffId
											? (clinicians.find(c => c.id === anesthesiologistStaffId)?.name ??
												"Select anesthesiologist…")
											: "Select anesthesiologist…"}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{clinicians.map(c => (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Duration */}
					<div className="space-y-1">
						<Label>Estimated Duration (minutes)</Label>
						<Input
							type="number"
							min={15}
							max={600}
							step={15}
							value={estimatedDurationMinutes}
							onChange={e => {
								setEstimatedDurationMinutes(Number(e.target.value))
								setConflictChecked(false)
							}}
						/>
					</div>

					{/* Equipment */}
					<div className="space-y-2">
						<Label>Required Equipment</Label>
						<div className="flex gap-2">
							<Input
								placeholder="Add equipment item…"
								value={equipmentInput}
								onChange={e => setEquipmentInput(e.target.value)}
								onKeyDown={e => {
									if (e.key === "Enter") {
										e.preventDefault()
										addEquipment(equipmentInput)
									}
								}}
								list="common-equipment"
							/>
							<datalist id="common-equipment">
								{COMMON_EQUIPMENT.map(e => (
									<option key={e} value={e} />
								))}
							</datalist>
							<Button
								variant="outline"
								size="sm"
								onClick={() => addEquipment(equipmentInput)}
								disabled={!equipmentInput.trim()}
							>
								<Plus className="size-4" />
							</Button>
						</div>
						{requiredEquipment.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{requiredEquipment.map(item => (
									<Badge key={item} variant="secondary" className="gap-1">
										{item}
										<button
											onClick={() => {
												setRequiredEquipment(prev => prev.filter(e => e !== item))
												setConflictChecked(false)
											}}
										>
											<X className="size-3" />
										</button>
									</Badge>
								))}
							</div>
						)}
					</div>

					{/* Notes */}
					<div className="space-y-1">
						<Label>Notes</Label>
						<Input
							placeholder="Additional notes…"
							value={notes}
							onChange={e => setNotes(e.target.value)}
						/>
					</div>

					{/* Conflict check */}
					<div className="space-y-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleCheckConflicts}
							disabled={checkConflictsMut.isPending}
						>
							{checkConflictsMut.isPending && <Loader2 className="mr-1.5 size-3 animate-spin" />}
							Check Scheduling Conflicts
						</Button>

						{conflictChecked && conflicts.length === 0 && (
							<Alert className="border-green-200 bg-green-50">
								<AlertDescription className="text-sm text-green-700">
									No conflicts detected. Safe to book.
								</AlertDescription>
							</Alert>
						)}

						{conflicts.length > 0 && (
							<Alert variant="destructive">
								<AlertCircle className="size-4" />
								<AlertDescription>
									<p className="mb-1 font-medium">
										{conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} detected:
									</p>
									<ul className="space-y-0.5 text-sm">
										{conflicts.map((c, i) => (
											<li key={i}>• {formatConflictMessage(c)}</li>
										))}
									</ul>
								</AlertDescription>
							</Alert>
						)}

						{createCaseMut.isError && (
							<Alert variant="destructive">
								<AlertCircle className="size-4" />
								<AlertDescription>
									{createCaseMut.error instanceof Error
										? createCaseMut.error.message
										: "Failed to book case"}
								</AlertDescription>
							</Alert>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleBook} disabled={!canBook}>
						{createCaseMut.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
						Book Case
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
