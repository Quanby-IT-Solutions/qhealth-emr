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
	useUpdateAllergyMutation,
	type AllergenType,
	type Allergy,
	type AllergySeverity,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

interface EditAllergyDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	allergy: Allergy | null
	facilityId: string
}

function normalizedAllergenKey(name: string, type: AllergenType | "") {
	return `${type}:${name.trim().toLowerCase()}`
}

function findDuplicateActiveAllergy(
	allergies: Allergy[] | undefined,
	name: string,
	type: AllergenType | "",
	excludeId: string
) {
	if (!name.trim() || !type) return undefined
	const key = normalizedAllergenKey(name, type)
	return allergies?.find(
		activeAllergy =>
			activeAllergy.id !== excludeId &&
			normalizedAllergenKey(activeAllergy.allergenName, activeAllergy.allergenType) === key
	)
}

export function EditAllergyDialog({
	open,
	onOpenChange,
	allergy,
	facilityId,
}: EditAllergyDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Allergy</DialogTitle>
				</DialogHeader>
				{allergy && open ? (
					<EditAllergyForm
						key={allergy.id}
						allergy={allergy}
						facilityId={facilityId}
						onSaved={() => onOpenChange(false)}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	)
}

function EditAllergyForm({
	allergy,
	facilityId,
	onSaved,
}: {
	allergy: Allergy
	facilityId: string
	onSaved: () => void
}) {
	const [allergenName, setAllergenName] = useState(allergy.allergenName)
	const [allergenType, setAllergenType] = useState<AllergenType | "">(allergy.allergenType)
	const [reactionType, setReactionType] = useState(allergy.reactionType ?? "")
	const [severity, setSeverity] = useState<AllergySeverity | "">(allergy.severity)
	const [onsetDate, setOnsetDate] = useState(allergy.onsetDate ?? "")

	const updateAllergy = useUpdateAllergyMutation()
	const { data: activeAllergies } = useAllergiesQuery({
		patientId: allergy.patientId,
		isActive: true,
	})
	const allergenSearch = useAllergenSearchQuery({
		search: allergenName,
		facilityId,
		allergenType: allergenType || undefined,
		limit: 8,
	})
	const duplicateAllergy = findDuplicateActiveAllergy(
		activeAllergies?.data,
		allergenName,
		allergenType,
		allergy.id
	)
	const canSubmit = Boolean(
		allergy &&
			allergenName.trim() &&
			allergenType &&
			severity &&
			!duplicateAllergy &&
			!updateAllergy.isPending
	)

	function handleSubmit() {
		if (!allergy || !canSubmit || !allergenType || !severity) return

		updateAllergy.mutate(
			{
				id: allergy.id,
				allergenName: allergenName.trim(),
				allergenType,
				reactionType: reactionType.trim() || undefined,
				severity,
				onsetDate: onsetDate || undefined,
			},
			{
				onSuccess: onSaved,
			}
		)
	}

	return (
		<>
				<div className="grid gap-4">
					{allergy?.isVerified && (
						<Alert>
							<AlertDescription>
								Saving clinical changes resets verification. Verify the allergy again before it can
								block medication orders.
							</AlertDescription>
						</Alert>
					)}

					<div className="space-y-2">
						<Label>Allergen Name *</Label>
						<p className="text-muted-foreground text-xs">
							Record the trigger or substance. Put symptoms such as itching or rash in
							Reaction Type.
						</p>
						<Input
							placeholder="Search or enter allergen, e.g. Penicillin"
							value={allergenName}
							onChange={event => setAllergenName(event.target.value)}
						/>
						{allergenSearch.data?.data.length ? (
							<div className="bg-background max-h-40 overflow-y-auto rounded-md border">
								{allergenSearch.data.data.map(result => {
									const disabled = Boolean(
										findDuplicateActiveAllergy(
											activeAllergies?.data,
											result.allergenName,
											result.allergenType,
											allergy.id
										)
									)
									return (
										<button
											key={`${result.allergenType}-${result.allergenName}-${result.source}`}
											type="button"
											disabled={disabled}
											className="hover:bg-muted disabled:text-muted-foreground disabled:hover:bg-transparent flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-70"
											onClick={() => {
												if (disabled) return
												setAllergenName(result.allergenName)
												setAllergenType(result.allergenType)
											}}
										>
											<span>{result.allergenName}</span>
											<span className="flex items-center gap-2 text-xs">
												{disabled && <span className="text-muted-foreground">Already active</span>}
												<span className="text-muted-foreground capitalize">
													{result.allergenType}
												</span>
											</span>
										</button>
									)
								})}
							</div>
						) : null}
					</div>

					{duplicateAllergy && (
						<Alert variant="destructive">
							<AlertDescription>
								This patient already has an active {duplicateAllergy.allergenName} allergy.
								Edit the existing allergy or deactivate it before saving this duplicate.
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
							placeholder="e.g. itching, rash, anaphylaxis, GI upset"
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
						{updateAllergy.isPending ? "Saving..." : "Save Allergy"}
					</Button>
				</DialogFooter>
		</>
	)
}
