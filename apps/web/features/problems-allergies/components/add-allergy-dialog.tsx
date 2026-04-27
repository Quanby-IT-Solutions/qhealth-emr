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
import {
	useAllergenSearchQuery,
	useAllergiesQuery,
	useCreateAllergyMutation,
	type AllergenType,
	type AllergySeverity,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

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
	const [allergenType, setAllergenType] = useState<AllergenType | "">("")
	const [reactionType, setReactionType] = useState("")
	const [severity, setSeverity] = useState<AllergySeverity | "">("")
	const [onsetDate, setOnsetDate] = useState("")

	const createAllergy = useCreateAllergyMutation()
	const { data: activeAllergies } = useAllergiesQuery({ patientId, isActive: true })
	const allergenSearch = useAllergenSearchQuery({
		search: allergenName,
		facilityId,
		allergenType: allergenType || undefined,
		limit: 8,
	})

	const duplicateAllergy = activeAllergies?.data.find(
		allergy => allergy.allergenName.trim().toLowerCase() === allergenName.trim().toLowerCase()
	)
	const canSubmit = Boolean(
		allergenName.trim() && allergenType && severity && facilityId && !createAllergy.isPending
	)

	function handleSubmit() {
		if (!canSubmit || !allergenType || !severity) return

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
			}
		)
	}

	function resetForm() {
		setAllergenName("")
		setAllergenType("")
		setReactionType("")
		setSeverity("")
		setOnsetDate("")
	}

	return (
		<Dialog
			open={open}
			onOpenChange={nextOpen => {
				if (!nextOpen) resetForm()
				onOpenChange(nextOpen)
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Add Allergy</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4">
					<div className="space-y-2">
						<Label>Allergen Name *</Label>
						<Input
							placeholder="Search or enter allergen"
							value={allergenName}
							onChange={event => setAllergenName(event.target.value)}
						/>
						{allergenSearch.isFetching && (
							<p className="text-muted-foreground text-xs">Searching allergens...</p>
						)}
						{allergenSearch.data?.data.length ? (
							<div className="bg-background max-h-40 overflow-y-auto rounded-md border">
								{allergenSearch.data.data.map(result => (
									<button
										key={`${result.allergenType}-${result.allergenName}-${result.source}`}
										type="button"
										className="hover:bg-muted flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
										onClick={() => {
											setAllergenName(result.allergenName)
											setAllergenType(result.allergenType)
										}}
									>
										<span>{result.allergenName}</span>
										<span className="text-muted-foreground text-xs capitalize">
											{result.allergenType}
										</span>
									</button>
								))}
							</div>
						) : null}
					</div>

					{duplicateAllergy && (
						<Alert>
							<AlertDescription>
								This patient already has an active {duplicateAllergy.allergenName} allergy. Confirm
								this is clinically distinct before saving another entry.
							</AlertDescription>
						</Alert>
					)}

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Type *</Label>
							<Select
								value={allergenType || undefined}
								onValueChange={value => setAllergenType(value as AllergenType)}
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
								onValueChange={value => setSeverity(value as AllergySeverity)}
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

					<div className="space-y-2">
						<Label>Reaction Type</Label>
						<Input
							placeholder="e.g. Anaphylaxis, rash, GI upset"
							value={reactionType}
							onChange={event => setReactionType(event.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label>Onset Date</Label>
						<Input
							type="date"
							value={onsetDate}
							onChange={event => setOnsetDate(event.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button onClick={handleSubmit} disabled={!canSubmit}>
						{createAllergy.isPending ? "Adding..." : "Add Allergy"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
