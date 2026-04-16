"use client"

import { useState } from "react"

import { AlertCircle, CheckCircle, Pencil } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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

import type { CreateMealPlanInput, UpdateMealPlanInput } from "@/features/nutrition/api/nutrition.hooks"
import {
	useMealPlanQuery,
	useSaveMealPlanMutation,
} from "@/features/nutrition/api/nutrition.hooks"

// ============================================================================
// Constants
// ============================================================================

const DIET_TYPES = [
	{ value: "regular", label: "Regular" },
	{ value: "soft", label: "Soft" },
	{ value: "mechanical_soft", label: "Mechanical Soft" },
	{ value: "pureed", label: "Puréed" },
	{ value: "liquid_full", label: "Full Liquid" },
	{ value: "liquid_clear", label: "Clear Liquid" },
	{ value: "diabetic", label: "Diabetic / Carb-Controlled" },
	{ value: "renal", label: "Renal" },
	{ value: "cardiac", label: "Cardiac / Low-Sodium" },
	{ value: "low_fat", label: "Low-Fat" },
	{ value: "high_protein", label: "High-Protein" },
	{ value: "npo", label: "NPO (Nothing by Mouth)" },
]

const RESTRICTION_OPTIONS = [
	"Low sodium",
	"Low fat",
	"Low potassium",
	"Low phosphorus",
	"Gluten-free",
	"Lactose-free",
	"Diabetic",
	"Renal",
	"Halal",
	"Kosher",
	"Vegetarian",
	"Vegan",
	"Nut-free",
	"Shellfish-free",
]

// ============================================================================
// Types
// ============================================================================

interface FormState {
	caloricTarget: string
	proteinGoalGrams: string
	carbGoalGrams: string
	fatGoalGrams: string
	dietType: string
	restrictions: string[]
	notes: string
}

const EMPTY_FORM: FormState = {
	caloricTarget: "",
	proteinGoalGrams: "",
	carbGoalGrams: "",
	fatGoalGrams: "",
	dietType: "regular",
	restrictions: [],
	notes: "",
}

// ============================================================================
// Component
// ============================================================================

interface MealPlanEditorProps {
	encounterId: string
	patientId: string
	onSaved?: () => void
}

export function MealPlanEditor({ encounterId, patientId, onSaved }: MealPlanEditorProps) {
	const { data: existing, isLoading } = useMealPlanQuery(encounterId)
	const saveMutation = useSaveMealPlanMutation()

	const [editing, setEditing] = useState(false)
	const [form, setForm] = useState<FormState>(EMPTY_FORM)

	const update = (field: keyof FormState, value: FormState[typeof field]) =>
		setForm((prev) => ({ ...prev, [field]: value }))

	const toggleRestriction = (r: string) => {
		setForm((prev) => ({
			...prev,
			restrictions: prev.restrictions.includes(r)
				? prev.restrictions.filter((x) => x !== r)
				: [...prev.restrictions, r],
		}))
	}

	const startEditing = () => {
		if (existing) {
			setForm({
				caloricTarget: String(existing.caloricTarget),
				proteinGoalGrams: String(existing.proteinGoalGrams),
				carbGoalGrams: String(existing.carbGoalGrams),
				fatGoalGrams: String(existing.fatGoalGrams),
				dietType: existing.dietType,
				restrictions: existing.restrictions,
				notes: existing.notes ?? "",
			})
		} else {
			setForm(EMPTY_FORM)
		}
		setEditing(true)
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const payload: CreateMealPlanInput | UpdateMealPlanInput = {
			...(existing ? { id: existing.id } : {}),
			encounterId,
			patientId,
			caloricTarget: Number(form.caloricTarget),
			proteinGoalGrams: Number(form.proteinGoalGrams),
			carbGoalGrams: Number(form.carbGoalGrams),
			fatGoalGrams: Number(form.fatGoalGrams),
			dietType: form.dietType,
			restrictions: form.restrictions,
			notes: form.notes.trim() || undefined,
		}

		saveMutation.mutate(payload, {
			onSuccess: () => {
				setEditing(false)
				onSaved?.()
			},
		})
	}

	// ── Loading ──────────────────────────────────────────────────────────────
	if (isLoading) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">
					Loading meal plan…
				</CardContent>
			</Card>
		)
	}

	// ── Display mode (meal plan exists, not editing) ─────────────────────────
	if (existing && !editing) {
		const dietLabel =
			DIET_TYPES.find((d) => d.value === existing.dietType)?.label ?? existing.dietType

		return (
			<Card>
				<CardHeader className="flex flex-row items-start justify-between">
					<CardTitle className="text-base">Meal Plan</CardTitle>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="gap-1.5"
						onClick={startEditing}
					>
						<Pencil className="size-3.5" />
						Edit
					</Button>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
							Diet Type
						</p>
						<p className="text-sm font-medium">{dietLabel}</p>
					</div>
					<div>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
							Caloric Target
						</p>
						<p className="text-sm font-medium">{existing.caloricTarget} kcal/day</p>
					</div>
					<div>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
							Macronutrient Goals
						</p>
						<p className="text-sm">
							Protein: <span className="font-medium">{existing.proteinGoalGrams}g</span>
							{" · "}Carbs: <span className="font-medium">{existing.carbGoalGrams}g</span>
							{" · "}Fat: <span className="font-medium">{existing.fatGoalGrams}g</span>
						</p>
					</div>
					{existing.restrictions.length > 0 && (
						<div className="sm:col-span-2">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
								Dietary Restrictions
							</p>
							<div className="flex flex-wrap gap-1.5">
								{existing.restrictions.map((r) => (
									<span
										key={r}
										className="rounded-full border bg-muted px-2.5 py-0.5 text-xs"
									>
										{r}
									</span>
								))}
							</div>
						</div>
					)}
					{existing.notes && (
						<div className="sm:col-span-2">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
								Notes
							</p>
							<p className="text-sm text-muted-foreground">{existing.notes}</p>
						</div>
					)}
					<div className="sm:col-span-2 text-xs text-muted-foreground border-t pt-3 mt-1">
						Last updated by {existing.createdByName} ·{" "}
						{new Date(existing.updatedAt).toLocaleDateString(undefined, {
							day: "numeric",
							month: "short",
							year: "numeric",
						})}
					</div>
				</CardContent>
			</Card>
		)
	}

	// ── Edit / create form ───────────────────────────────────────────────────
	return (
		<form onSubmit={handleSubmit}>
			<Card>
				<CardHeader className="flex flex-row items-start justify-between">
					<CardTitle className="text-base">
						{existing ? "Edit Meal Plan" : "Create Meal Plan"}
					</CardTitle>
					{existing && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setEditing(false)}
						>
							Cancel
						</Button>
					)}
				</CardHeader>
				<CardContent className="space-y-5">
					{/* Diet type */}
					<div className="space-y-1.5">
						<Label htmlFor="dietType">Diet Type</Label>
						<Select value={form.dietType} onValueChange={(v) => update("dietType", v)}>
							<SelectTrigger id="dietType">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{DIET_TYPES.map((d) => (
									<SelectItem key={d.value} value={d.value}>
										{d.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Caloric target */}
					<div className="space-y-1.5">
						<Label htmlFor="caloricTarget">Daily Caloric Target (kcal)</Label>
						<Input
							id="caloricTarget"
							type="number"
							min={0}
							placeholder="e.g. 2000"
							value={form.caloricTarget}
							onChange={(e) => update("caloricTarget", e.target.value)}
							required
						/>
					</div>

					{/* Macros */}
					<div className="grid gap-4 sm:grid-cols-3">
						<div className="space-y-1.5">
							<Label htmlFor="proteinGoal">Protein Goal (g)</Label>
							<Input
								id="proteinGoal"
								type="number"
								min={0}
								placeholder="e.g. 80"
								value={form.proteinGoalGrams}
								onChange={(e) => update("proteinGoalGrams", e.target.value)}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="carbGoal">Carbs Goal (g)</Label>
							<Input
								id="carbGoal"
								type="number"
								min={0}
								placeholder="e.g. 250"
								value={form.carbGoalGrams}
								onChange={(e) => update("carbGoalGrams", e.target.value)}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="fatGoal">Fat Goal (g)</Label>
							<Input
								id="fatGoal"
								type="number"
								min={0}
								placeholder="e.g. 65"
								value={form.fatGoalGrams}
								onChange={(e) => update("fatGoalGrams", e.target.value)}
								required
							/>
						</div>
					</div>

					{/* Dietary restrictions */}
					<div className="space-y-2">
						<Label>Dietary Restrictions</Label>
						<div className="flex flex-wrap gap-2">
							{RESTRICTION_OPTIONS.map((r) => {
								const active = form.restrictions.includes(r)
								return (
									<button
										key={r}
										type="button"
										onClick={() => toggleRestriction(r)}
										className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
											active
												? "bg-primary text-primary-foreground border-primary"
												: "border-input bg-background hover:bg-accent hover:text-accent-foreground"
										}`}
									>
										{r}
									</button>
								)
							})}
						</div>
					</div>

					{/* Notes */}
					<div className="space-y-1.5">
						<Label htmlFor="mealPlanNotes">Notes (optional)</Label>
						<Textarea
							id="mealPlanNotes"
							placeholder="Add any relevant dietary guidance or clinical notes…"
							rows={3}
							value={form.notes}
							onChange={(e) => update("notes", e.target.value)}
						/>
					</div>

					{saveMutation.isError && (
						<div className="flex items-center gap-2 text-sm text-destructive">
							<AlertCircle className="size-4 shrink-0" />
							<span>Failed to save meal plan. Please try again.</span>
						</div>
					)}

					{saveMutation.isSuccess && (
						<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
							<CheckCircle className="size-4 shrink-0" />
							<span>Meal plan saved.</span>
						</div>
					)}

					<div className="flex gap-2">
						<Button type="submit" disabled={saveMutation.isPending}>
							{saveMutation.isPending ? "Saving…" : "Save Meal Plan"}
						</Button>
						{!existing && (
							<Button
								type="button"
								variant="ghost"
								onClick={() => setForm(EMPTY_FORM)}
								disabled={saveMutation.isPending}
							>
								Clear
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		</form>
	)
}
