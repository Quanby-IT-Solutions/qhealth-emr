"use client"

import { useState } from "react"

import { Loader2 } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { useStaffClinicianListQuery } from "@/features/scheduling/api/scheduling.hooks"

import { useCreateSurgicalCaseMutation } from "../api/surgical.hooks"

const SURGICAL_TYPES = [
	{ value: "elective", label: "Elective" },
	{ value: "urgent", label: "Urgent" },
	{ value: "emergency", label: "Emergency" },
]

interface CreateSurgicalCasePanelProps {
	encounterId: string
	patientId: string
	facilityId: string
	onSuccess: () => void
}

export function CreateSurgicalCasePanel({
	encounterId,
	patientId,
	facilityId,
	onSuccess,
}: CreateSurgicalCasePanelProps) {
	const [procedureName, setProcedureName] = useState("")
	const [surgicalType, setSurgicalType] = useState("")
	const [surgeonStaffId, setSurgeonStaffId] = useState("")
	const [scheduledDatetime, setScheduledDatetime] = useState("")
	const [notes, setNotes] = useState("")
	const [error, setError] = useState<string | null>(null)

	const { data: clinicians, isLoading: cliniciansLoading } = useStaffClinicianListQuery({
		facilityId,
	})

	const { mutate: createCase, isPending } = useCreateSurgicalCaseMutation()

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)

		if (!procedureName.trim()) {
			setError("Procedure name is required.")
			return
		}
		if (!surgicalType) {
			setError("Surgical type is required.")
			return
		}

		createCase(
			{
				facilityId,
				encounterId,
				patientId,
				procedureName: procedureName.trim(),
				surgicalType,
				surgeonStaffId: surgeonStaffId || undefined,
				scheduledDatetime: scheduledDatetime || undefined,
				notes: notes.trim() || undefined,
			},
			{
				onSuccess,
				onError: (err) => setError(err.message),
			},
		)
	}

	return (
		<div className="p-6">
			<div className="mb-4">
				<h3 className="text-base font-semibold">Create Surgical Case</h3>
				<p className="text-muted-foreground text-sm">
					No surgical case is linked to this encounter. Create one to begin charting.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="max-w-lg space-y-4">
				<div className="space-y-1.5">
					<Label htmlFor="procedureName">
						Procedure Name <span className="text-destructive">*</span>
					</Label>
					<Input
						id="procedureName"
						value={procedureName}
						onChange={(e) => setProcedureName(e.target.value)}
						placeholder="e.g. Appendectomy"
						disabled={isPending}
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="surgicalType">
						Surgical Type <span className="text-destructive">*</span>
					</Label>
					<Select
						value={surgicalType}
						onValueChange={value => setSurgicalType(value ?? "")}
						disabled={isPending}
					>
						<SelectTrigger id="surgicalType">
							<SelectValue placeholder="Select type" />
						</SelectTrigger>
						<SelectContent>
							{SURGICAL_TYPES.map((t) => (
								<SelectItem key={t.value} value={t.value}>
									{t.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="surgeonStaffId">Surgeon (optional)</Label>
					<Select
						value={surgeonStaffId}
						onValueChange={value => setSurgeonStaffId(value ?? "")}
						disabled={isPending || cliniciansLoading}
					>
						<SelectTrigger id="surgeonStaffId">
							<SelectValue placeholder={cliniciansLoading ? "Loading…" : "Select surgeon"} />
						</SelectTrigger>
						<SelectContent>
							{clinicians.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="scheduledDatetime">Scheduled Date & Time (optional)</Label>
					<Input
						id="scheduledDatetime"
						type="datetime-local"
						value={scheduledDatetime}
						onChange={(e) => setScheduledDatetime(e.target.value)}
						disabled={isPending}
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="notes">Notes (optional)</Label>
					<Textarea
						id="notes"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Additional notes…"
						rows={3}
						disabled={isPending}
					/>
				</div>

				{error && <p className="text-destructive text-sm">{error}</p>}

				<Button type="submit" disabled={isPending}>
					{isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
					Create Surgical Case
				</Button>
			</form>
		</div>
	)
}
