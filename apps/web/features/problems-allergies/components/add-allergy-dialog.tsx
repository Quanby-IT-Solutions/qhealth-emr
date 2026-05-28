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
	type Allergy,
	type AllergenType,
	type AllergySeverity,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

interface AddAllergyDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	patientId: string
	facilityId: string
}

function normalizedAllergenKey(name: string, type: AllergenType | "") {
	return `${type}:${name.trim().toLowerCase()}`
}

function findDuplicateActiveAllergy(
	allergies: Allergy[] | undefined,
	name: string,
	type: AllergenType | ""
) {
	if (!name.trim() || !type) return undefined
	const key = normalizedAllergenKey(name, type)
	return allergies?.find(
		allergy => normalizedAllergenKey(allergy.allergenName, allergy.allergenType) === key
	)
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
	const [allergenSearchOpen, setAllergenSearchOpen] = useState(false)

	const createAllergy = useCreateAllergyMutation()
	const { data: activeAllergies } = useAllergiesQuery({ patientId, isActive: true })
	const allergenSearch = useAllergenSearchQuery({
		search: allergenName,
		facilityId,
		allergenType: allergenType || undefined,
		limit: 8,
	})
	const allergenResults = allergenSearch.data?.data ?? []
	const canShowAllergenResults = allergenSearchOpen && allergenName.trim().length >= 2

	const duplicateAllergy = findDuplicateActiveAllergy(
		activeAllergies?.data,
		allergenName,
		allergenType
	)
	const canSubmit = Boolean(
		allergenName.trim() &&
			allergenType &&
			severity &&
			facilityId &&
			!duplicateAllergy &&
			!createAllergy.isPending
	)

	function selectAllergen(result: { allergenName: string; allergenType: AllergenType }) {
		setAllergenName(result.allergenName)
		setAllergenType(result.allergenType)
		closeAllergenSearch()
	}

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

	function handleCancel() {
		resetForm()
		onOpenChange(false)
	}

	function closeAllergenSearch() {
		setAllergenSearchOpen(false)
	}

	function closeAllergenSearchAfterSelectionChance() {
		window.setTimeout(closeAllergenSearch, 100)
	}

	function resetForm() {
		setAllergenName("")
		setAllergenType("")
		setReactionType("")
		setSeverity("")
		setOnsetDate("")
		setAllergenSearchOpen(false)
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
					<DialogTitle className="text-xl">Add Allergy</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4">
					<div className="space-y-2">
						<Label>Allergen Name *</Label>
						<p className="text-muted-foreground text-xs">
							Record the trigger or substance, for example Penicillin, shrimp, latex, or dust
							mites. Put symptoms such as itching or rash in Reaction Type.
						</p>
						<div className="relative">
							<Input
								placeholder="Search or enter allergen, e.g. Penicillin"
								value={allergenName}
								onChange={event => {
									setAllergenName(event.target.value)
									setAllergenSearchOpen(event.target.value.trim().length >= 2)
								}}
								onFocus={() => setAllergenSearchOpen(allergenName.trim().length >= 2)}
								onBlur={closeAllergenSearchAfterSelectionChance}
								onKeyDown={event => {
									if (event.key === "Escape") closeAllergenSearch()
									if (event.key === "Enter" && allergenResults[0]) {
										event.preventDefault()
										selectAllergen(allergenResults[0])
									}
								}}
								aria-expanded={canShowAllergenResults}
								autoComplete="off"
							/>
							{canShowAllergenResults && (
								<div className="bg-popover text-popover-foreground ring-foreground/10 absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border p-1 text-sm shadow-md ring-1">
									{allergenSearch.isFetching ? (
										<div className="text-muted-foreground px-3 py-3">Searching allergens...</div>
									) : allergenResults.length ? (
										allergenResults.map(result => {
											const disabled = Boolean(
												findDuplicateActiveAllergy(
													activeAllergies?.data,
													result.allergenName,
													result.allergenType
												)
											)
											return (
												<button
													key={`${result.allergenType}-${result.allergenName}-${result.source}`}
													type="button"
													disabled={disabled}
													className="hover:bg-muted focus:bg-muted disabled:text-muted-foreground disabled:hover:bg-transparent flex w-full items-start justify-between gap-3 rounded-sm px-3 py-2 text-left outline-hidden disabled:cursor-not-allowed disabled:opacity-70"
													onMouseDown={event => event.preventDefault()}
													onClick={() => {
														if (!disabled) selectAllergen(result)
													}}
												>
													<span className="min-w-0 break-words">{result.allergenName}</span>
													<span className="flex shrink-0 items-center gap-2 text-xs">
														{disabled && <span className="text-muted-foreground">Already active</span>}
														<span className="text-muted-foreground capitalize">
															{result.allergenType}
														</span>
													</span>
												</button>
											)
										})
									) : (
										<div className="text-muted-foreground px-3 py-3">
											No catalog match. You can save this as a custom allergen.
										</div>
									)}
								</div>
							)}
						</div>
					</div>

					{duplicateAllergy && (
						<Alert variant="destructive">
							<AlertDescription>
								This patient already has an active {duplicateAllergy.allergenName} allergy.
								Edit the existing allergy or deactivate it before adding another active entry.
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
									<SelectValue placeholder="Select allergen type" />
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
									<SelectValue placeholder="Select severity" />
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
					<Button type="button" variant="outline" onClick={handleCancel} disabled={createAllergy.isPending}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!canSubmit}>
						{createAllergy.isPending ? "Adding..." : "Add Allergy"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
