"use client"

import { useState } from "react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
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
import { Textarea } from "@/core/components/ui/textarea"
import {
	useCreateProblemMutation,
	type ProblemStatus,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

import { ProblemCodeFields, type ProblemCodeValue } from "./problem-code-fields"

interface AddProblemDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	patientId: string
	facilityId: string
}

const EMPTY_CODES: ProblemCodeValue = {
	icd10Code: "",
	icd10Display: "",
	snomedCode: "",
	snomedDisplay: "",
}

export function AddProblemDialog({
	open,
	onOpenChange,
	patientId,
	facilityId,
}: AddProblemDialogProps) {
	const [description, setDescription] = useState("")
	const [onsetDate, setOnsetDate] = useState("")
	const [resolutionDate, setResolutionDate] = useState("")
	const [status, setStatus] = useState<ProblemStatus>("active")
	const [codes, setCodes] = useState<ProblemCodeValue>(EMPTY_CODES)
	const [icd10Search, setIcd10Search] = useState("")
	const [snomedSearch, setSnomedSearch] = useState("")

	const createProblem = useCreateProblemMutation()
	const hasCode = Boolean(codes.icd10Code || codes.snomedCode)
	const canSubmit = Boolean(hasCode && description.trim() && facilityId && !createProblem.isPending)

	function handleSubmit() {
		if (!canSubmit) return

		createProblem.mutate(
			{
				facilityId,
				patientId,
				description: description.trim(),
				icd10Code: codes.icd10Code || undefined,
				icd10Display: codes.icd10Display || undefined,
				snomedCode: codes.snomedCode || undefined,
				snomedDisplay: codes.snomedDisplay || undefined,
				onsetDate: onsetDate || undefined,
				resolutionDate: status === "resolved" ? resolutionDate || undefined : undefined,
				status,
			},
			{
				onSuccess: () => {
					resetForm()
					onOpenChange(false)
				},
			}
		)
	}

	function resetForm() {
		setDescription("")
		setOnsetDate("")
		setResolutionDate("")
		setStatus("active")
		setCodes(EMPTY_CODES)
		setIcd10Search("")
		setSnomedSearch("")
	}

	return (
		<Dialog
			open={open}
			onOpenChange={nextOpen => {
				if (!nextOpen) resetForm()
				onOpenChange(nextOpen)
			}}
		>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Add Problem</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4">
					<ProblemCodeFields
						value={codes}
						onChange={setCodes}
						icd10Search={icd10Search}
						onIcd10SearchChange={setIcd10Search}
						snomedSearch={snomedSearch}
						onSnomedSearchChange={setSnomedSearch}
						onDescriptionSuggestion={suggestion => {
							if (!description.trim()) setDescription(suggestion)
						}}
					/>

					{!hasCode && (
						<Alert>
							<AlertDescription>
								Select at least one ICD-10 or SNOMED CT code before saving.
							</AlertDescription>
						</Alert>
					)}

					<div className="space-y-2">
						<Label>Description *</Label>
						<Textarea
							rows={2}
							placeholder="Problem description"
							value={description}
							onChange={event => setDescription(event.target.value)}
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-3">
						<div className="space-y-2">
							<Label>Status</Label>
							<Select value={status} onValueChange={value => setStatus(value as ProblemStatus)}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="resolved">Resolved</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Onset Date</Label>
							<Input
								type="date"
								value={onsetDate}
								onChange={event => setOnsetDate(event.target.value)}
							/>
						</div>

						{status === "resolved" && (
							<div className="space-y-2">
								<Label>Resolution Date</Label>
								<Input
									type="date"
									value={resolutionDate}
									onChange={event => setResolutionDate(event.target.value)}
								/>
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button onClick={handleSubmit} disabled={!canSubmit}>
						{createProblem.isPending ? "Adding..." : "Add Problem"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
