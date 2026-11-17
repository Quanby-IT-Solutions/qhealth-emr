"use client"

import { useEffect, useState } from "react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { DatePicker } from "@/core/components/ui/date-picker"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
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
	useProblemsQuery,
	useUpdateProblemMutation,
	type Problem,
	type ProblemStatus,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

import { ProblemCodeFields, type ProblemCodeValue } from "./problem-code-fields"

interface EditProblemDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	problem: Problem | null
}

export function EditProblemDialog({ open, onOpenChange, problem }: EditProblemDialogProps) {
	const [description, setDescription] = useState("")
	const [onsetDate, setOnsetDate] = useState("")
	const [resolutionDate, setResolutionDate] = useState("")
	const [status, setStatus] = useState<ProblemStatus>("active")
	const [codes, setCodes] = useState<ProblemCodeValue>({
		icd10Code: "",
		icd10Display: "",
	})
	const [icd10Search, setIcd10Search] = useState("")

	const updateProblem = useUpdateProblemMutation()
	const activeProblemsQuery = useProblemsQuery({
		patientId: problem?.patientId ?? "",
		status: "active",
	})
	const activeProblems = activeProblemsQuery.data?.data ?? []
	const activeIcd10Codes = new Set(
		activeProblems
			.filter(activeProblem => activeProblem.id !== problem?.id)
			.flatMap(activeProblem => (activeProblem.icd10Code ? [activeProblem.icd10Code] : []))
	)
	const hasCode = Boolean(codes.icd10Code)
	const canSubmit = Boolean(problem && description.trim() && !updateProblem.isPending)

	useEffect(() => {
		if (!problem || !open) return

		setDescription(problem.description)
		setOnsetDate(problem.onsetDate ?? "")
		setResolutionDate(problem.resolutionDate ?? "")
		setStatus(problem.status)
		setCodes({
			icd10Code: problem.icd10Code ?? "",
			icd10Display: problem.icd10Display ?? "",
		})
		setIcd10Search("")
	}, [open, problem])

	function handleSubmit() {
		if (!problem || !canSubmit) return

		updateProblem.mutate(
			{
				id: problem.id,
				description: description.trim(),
				icd10Code: codes.icd10Code,
				icd10Display: codes.icd10Display,
				onsetDate: onsetDate || undefined,
				resolutionDate: status === "resolved" ? resolutionDate || undefined : null,
				status,
			},
			{
				onSuccess: () => onOpenChange(false),
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Edit Problem</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4">
					<div className="space-y-2">
						<Label htmlFor="edit-problem-description">Diagnosis *</Label>
						<Textarea
							id="edit-problem-description"
							rows={2}
							value={description}
							onChange={event => setDescription(event.target.value)}
						/>
					</div>

					<ProblemCodeFields
						inputId="edit-problem-icd10-search"
						value={codes}
						onChange={setCodes}
						icd10Search={icd10Search}
						onIcd10SearchChange={setIcd10Search}
						disabledIcd10Codes={status === "active" ? activeIcd10Codes : undefined}
						onDescriptionSuggestion={suggestion => {
							if (!description.trim()) setDescription(suggestion)
						}}
					/>

					{!hasCode && (
						<Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
							<AlertDescription className="text-amber-900 dark:text-amber-100">
								No ICD-10 code selected. This problem will be saved as text-only and can be coded
								later.
							</AlertDescription>
						</Alert>
					)}

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
							<Label htmlFor="edit-problem-onset-date">Onset Date</Label>
							<DatePicker id="edit-problem-onset-date" value={onsetDate} onChange={setOnsetDate} />
						</div>

						{status === "resolved" && (
							<div className="space-y-2">
								<Label htmlFor="edit-problem-resolution-date">Resolution Date</Label>
								<DatePicker
									id="edit-problem-resolution-date"
									value={resolutionDate}
									onChange={setResolutionDate}
								/>
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button onClick={handleSubmit} disabled={!canSubmit}>
						{updateProblem.isPending ? "Saving..." : "Save Problem"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
