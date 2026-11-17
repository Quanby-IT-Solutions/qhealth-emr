"use client"

import { useState } from "react"

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
	useCreateProblemMutation,
	useProblemsQuery,
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

	const createProblem = useCreateProblemMutation()
	const activeProblemsQuery = useProblemsQuery({ patientId, status: "active" })
	const activeProblems = activeProblemsQuery.data?.data ?? []
	const activeIcd10Codes = new Set(activeProblems.flatMap(problem => problem.icd10Code ?? []))
	const hasCode = Boolean(codes.icd10Code)
	const canSubmit = Boolean(description.trim() && facilityId && !createProblem.isPending)

	function handleSubmit() {
		if (!canSubmit) return

		createProblem.mutate(
			{
				facilityId,
				patientId,
				description: description.trim(),
				icd10Code: codes.icd10Code || undefined,
				icd10Display: codes.icd10Display || undefined,
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

	function handleCancel() {
		resetForm()
		onOpenChange(false)
	}

	function resetForm() {
		setDescription("")
		setOnsetDate("")
		setResolutionDate("")
		setStatus("active")
		setCodes(EMPTY_CODES)
		setIcd10Search("")
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
					<DialogTitle className="text-xl">Add Problem</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4">
					<div className="space-y-2">
						<Label htmlFor="add-problem-description">Diagnosis *</Label>
						<Textarea
							id="add-problem-description"
							rows={2}
							placeholder="Enter diagnosis"
							value={description}
							onChange={event => setDescription(event.target.value)}
						/>
					</div>

					<ProblemCodeFields
						inputId="add-problem-icd10-search"
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

					<div
						className={`grid gap-4 ${status === "resolved" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
					>
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
							<Label htmlFor="add-problem-onset-date">Onset Date</Label>
							<DatePicker id="add-problem-onset-date" value={onsetDate} onChange={setOnsetDate} />
						</div>

						{status === "resolved" && (
							<div className="space-y-2">
								<Label htmlFor="add-problem-resolution-date">Resolution Date</Label>
								<DatePicker
									id="add-problem-resolution-date"
									value={resolutionDate}
									onChange={setResolutionDate}
								/>
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						disabled={createProblem.isPending}
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!canSubmit}>
						{createProblem.isPending ? "Adding..." : "Add Problem"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
