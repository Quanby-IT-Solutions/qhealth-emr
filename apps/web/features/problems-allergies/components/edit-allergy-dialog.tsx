"use client"

import { useEffect, useState } from "react"

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

export function EditAllergyDialog({
	open,
	onOpenChange,
	allergy,
	facilityId,
}: EditAllergyDialogProps) {
	const [allergenName, setAllergenName] = useState("")
	const [allergenType, setAllergenType] = useState<AllergenType | "">("")
	const [reactionType, setReactionType] = useState("")
	const [severity, setSeverity] = useState<AllergySeverity | "">("")
	const [onsetDate, setOnsetDate] = useState("")

	const updateAllergy = useUpdateAllergyMutation()
	const allergenSearch = useAllergenSearchQuery({
		search: allergenName,
		facilityId,
		allergenType: allergenType || undefined,
		limit: 8,
	})
	const canSubmit = Boolean(
		allergy && allergenName.trim() && allergenType && severity && !updateAllergy.isPending
	)

	useEffect(() => {
		if (!allergy || !open) return
		setAllergenName(allergy.allergenName)
		setAllergenType(allergy.allergenType)
		setReactionType(allergy.reactionType ?? "")
		setSeverity(allergy.severity)
		setOnsetDate(allergy.onsetDate ?? "")
	}, [allergy, open])

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
				onSuccess: () => onOpenChange(false),
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Allergy</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4">
					<div className="space-y-2">
						<Label>Allergen Name *</Label>
						<Input value={allergenName} onChange={event => setAllergenName(event.target.value)} />
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
						<Input value={reactionType} onChange={event => setReactionType(event.target.value)} />
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
			</DialogContent>
		</Dialog>
	)
}
