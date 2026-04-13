"use client"

import { useState } from "react"

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
import { useCreateAllergyMutation } from "@/features/problems-allergies/api/problems-allergies.hooks"

interface AddAllergyDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	patientId: string
	facilityId: string
}

export function AddAllergyDialog({
	open,
	onOpenChange,
	patientId,
	facilityId,
}: AddAllergyDialogProps) {
	const [allergenName, setAllergenName] = useState("")
	const [allergenType, setAllergenType] = useState<"medication" | "food" | "environmental" | "">("")
	const [reactionType, setReactionType] = useState("")
	const [severity, setSeverity] = useState<"mild" | "moderate" | "severe" | "">("")
	const [onsetDate, setOnsetDate] = useState("")

	const createAllergy = useCreateAllergyMutation()

	function handleSubmit() {
		if (!allergenName.trim() || !allergenType || !severity) return

		createAllergy.mutate(
			{
				facilityId,
				patientId,
				allergenName: allergenName.trim(),
				allergenType,
				reactionType: reactionType.trim() || undefined,
				severity,
				onsetDate: onsetDate || undefined,
			},
			{
				onSuccess: () => {
					resetForm()
					onOpenChange(false)
				},
			},
		)
	}

	function resetForm() {
		setAllergenName("")
		setAllergenType("")
		setReactionType("")
		setSeverity("")
		setOnsetDate("")
	}

	const canSubmit = allergenName.trim() && allergenType && severity && !createAllergy.isPending

	return (
		<Dialog
			open={open}
			onOpenChange={val => {
				if (!val) resetForm()
				onOpenChange(val)
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Add Allergy</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4">
					{/* Allergen Name */}
					<div className="space-y-2">
						<Label>Allergen Name *</Label>
						<Input
							placeholder="e.g. Penicillin, Peanuts, Pollen"
							value={allergenName}
							onChange={e => setAllergenName(e.target.value)}
						/>
					</div>

					{/* Allergen Type & Severity side-by-side */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Type *</Label>
							<Select
								value={allergenType || undefined}
								onValueChange={v =>
									setAllergenType(
										(v as "medication" | "food" | "environmental") ?? "",
									)
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="medication">Medication</SelectItem>
									<SelectItem value="food">Food</SelectItem>
									<SelectItem value="environmental">Environmental</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Severity *</Label>
							<Select
								value={severity || undefined}
								onValueChange={v =>
									setSeverity((v as "mild" | "moderate" | "severe") ?? "")
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="mild">Mild</SelectItem>
									<SelectItem value="moderate">Moderate</SelectItem>
									<SelectItem value="severe">Severe</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Reaction Type */}
					<div className="space-y-2">
						<Label>Reaction Type</Label>
						<Input
							placeholder="e.g. Anaphylaxis, Rash, GI upset"
							value={reactionType}
							onChange={e => setReactionType(e.target.value)}
						/>
					</div>

					{/* Onset Date */}
					<div className="space-y-2">
						<Label>Onset Date</Label>
						<Input
							type="date"
							value={onsetDate}
							onChange={e => setOnsetDate(e.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button onClick={handleSubmit} disabled={!canSubmit}>
						{createAllergy.isPending ? "Adding…" : "Add Allergy"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
