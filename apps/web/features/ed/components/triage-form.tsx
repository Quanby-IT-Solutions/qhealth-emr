"use client"

import { useState } from "react"

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
import { useCreatePreEncounterMutation } from "@/features/ed/api/ed.hooks"

interface TriageFormProps {
	facilityId: string
	triageStaffId: string
	onSuccess: () => void
}

export function TriageForm({ facilityId, triageStaffId, onSuccess }: TriageFormProps) {
	const createPreEncounter = useCreatePreEncounterMutation()

	const [acuityScale, setAcuityScale] = useState<"esi" | "ats" | "ctas">("esi")
	const [acuityLevel, setAcuityLevel] = useState<number>(3)
	const [chiefComplaint, setChiefComplaint] = useState("")

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		createPreEncounter.mutate(
			{
				facilityId,
				triageAcuityScale: acuityScale,
				triageAcuityLevel: acuityLevel,
				triageStaffId,
				chiefComplaint: chiefComplaint || undefined,
			},
			{
				onSuccess: () => {
					onSuccess()
				},
			}
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Acuity Scale */}
			<div className="space-y-2">
				<Label>Acuity Scale</Label>
				<Select value={acuityScale} onValueChange={v => setAcuityScale((v ?? "esi") as "esi" | "ats" | "ctas")}>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="esi">ESI (Emergency Severity Index)</SelectItem>
						<SelectItem value="ats">ATS (Australasian Triage Scale)</SelectItem>
						<SelectItem value="ctas">CTAS (Canadian Triage & Acuity Scale)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Acuity Level */}
			<div className="space-y-2">
				<Label>Acuity Level (1 = most urgent, 5 = least urgent)</Label>
				<Select
					value={String(acuityLevel)}
					onValueChange={v => setAcuityLevel(Number(v ?? "3"))}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="1">1 — Resuscitation</SelectItem>
						<SelectItem value="2">2 — Emergent</SelectItem>
						<SelectItem value="3">3 — Urgent</SelectItem>
						<SelectItem value="4">4 — Less Urgent</SelectItem>
						<SelectItem value="5">5 — Non-Urgent</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Chief Complaint */}
			<div className="space-y-2">
				<Label>Chief Complaint</Label>
				<Textarea
					placeholder="Describe the patient's chief complaint..."
					value={chiefComplaint}
					onChange={e => setChiefComplaint(e.target.value)}
					rows={3}
				/>
			</div>

			<Button
				type="submit"
				className="w-full"
				disabled={createPreEncounter.isPending}
			>
				{createPreEncounter.isPending ? "Creating…" : "Create Pre-Encounter"}
			</Button>

			{createPreEncounter.isError && (
				<p className="text-destructive text-sm">
					{createPreEncounter.error.message}
				</p>
			)}
		</form>
	)
}
