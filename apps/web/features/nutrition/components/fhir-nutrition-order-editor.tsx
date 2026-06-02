"use client"

import { useState } from "react"

import { CheckCircle2, Code2, Loader2, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"

import {
	type CreateMealPlanInput,
	useSaveMealPlanMutation,
} from "@/features/nutrition/api/nutrition.hooks"

// ============================================================================
// Constants (mirrors DietTypeEnum + FeedingRouteEnum from contracts)
// ============================================================================

const DIET_TYPES = [
	{ value: "regular", label: "Regular" },
	{ value: "diabetic", label: "Diabetic" },
	{ value: "renal", label: "Renal" },
	{ value: "cardiac", label: "Cardiac" },
	{ value: "low_sodium", label: "Low Sodium" },
	{ value: "high_protein", label: "High Protein" },
	{ value: "soft", label: "Soft" },
	{ value: "liquid", label: "Liquid" },
	{ value: "npo", label: "NPO (Nothing by Mouth)" },
	{ value: "enteral", label: "Enteral" },
	{ value: "parenteral", label: "Parenteral (TPN/PPN)" },
	{ value: "other", label: "Other" },
] as const

const FEEDING_ROUTES = [
	{ value: "oral", label: "Oral" },
	{ value: "enteral", label: "Enteral (NGT/PEG/NJT)" },
	{ value: "parenteral", label: "Parenteral (IV)" },
	{ value: "mixed", label: "Mixed (Oral + Enteral/Parenteral)" },
] as const

const TEXTURE_MODIFICATIONS = [
	"Regular",
	"Soft/Minced",
	"Minced & Moist",
	"Pureed",
	"Liquidised",
	"Thin Liquids",
	"Nectar-Thick Liquids",
	"Honey-Thick Liquids",
	"Pudding-Thick Liquids",
]

const COMMON_SUPPLEMENTS = [
	"Multivitamin",
	"Vitamin C",
	"Vitamin D",
	"Calcium",
	"Iron",
	"Zinc",
	"Omega-3",
	"Protein Powder",
	"Ensure / Sustagen",
]

const COMMON_RESTRICTIONS = [
	"Low sodium (<2g/day)",
	"Low potassium",
	"Low phosphorus",
	"Fluid restriction",
	"Low fat",
	"Lactose-free",
	"Gluten-free",
	"Diabetic (low GI)",
	"Allergy: shellfish",
	"Allergy: nuts",
]

// ============================================================================
// FHIR R4 NutritionOrder JSON builder
// ============================================================================

interface FhirNutritionOrderInput {
	encounterId: string
	patientId: string
	dietType: string
	feedingRoute: string
	caloricTarget: number
	proteinTarget: number
	carbTarget: number
	fatTarget: number
	textureModification: string
	fluidRestriction: boolean
	fluidTarget: number
	enteralFormula: string
	parenteralFormula: string
	supplements: string[]
	restrictions: string[]
	specialInstructions: string
}

function buildFhirNutritionOrder(input: FhirNutritionOrderInput) {
	const now = new Date().toISOString()
	return {
		resourceType: "NutritionOrder",
		status: "active",
		intent: "order",
		dateTime: now,
		patient: { reference: `Patient/${input.patientId}` },
		encounter: { reference: `Encounter/${input.encounterId}` },
		oralDiet:
			input.feedingRoute === "oral" || input.feedingRoute === "mixed"
				? {
						type: [
							{
								coding: [
									{
										system: "http://snomed.info/sct",
										display: input.dietType,
									},
								],
								text: input.dietType,
							},
						],
						texture:
							input.textureModification && input.textureModification !== "Regular"
								? [
										{
											modifier: {
												coding: [{ display: input.textureModification }],
												text: input.textureModification,
											},
										},
									]
								: undefined,
						nutrient: [
							{ modifier: { text: "Energy" }, amount: { value: input.caloricTarget, unit: "kcal/d" } },
							{ modifier: { text: "Protein" }, amount: { value: input.proteinTarget, unit: "g/d" } },
							{ modifier: { text: "Carbohydrate" }, amount: { value: input.carbTarget, unit: "g/d" } },
							{ modifier: { text: "Fat" }, amount: { value: input.fatTarget, unit: "g/d" } },
						].filter((n) => n.amount.value > 0),
						fluidConsistencyType: input.fluidRestriction
							? [
									{
										coding: [{ display: "Fluid restriction" }],
										text: `${input.fluidTarget} mL/day`,
									},
								]
							: undefined,
						instruction: input.specialInstructions || undefined,
					}
				: undefined,
		enteralFormula:
			input.feedingRoute === "enteral" || input.feedingRoute === "mixed"
				? {
						baseFormulaProductName: input.enteralFormula || undefined,
						routeofAdministration: { coding: [{ display: "Enteral tube feeding" }] },
						caloricDensity: input.caloricTarget
							? { value: input.caloricTarget, unit: "kcal/d" }
							: undefined,
					}
				: undefined,
		supplement:
			input.supplements.length > 0
				? input.supplements.map((s) => ({
						type: { coding: [{ display: s }], text: s },
					}))
				: undefined,
		note:
			input.restrictions.length > 0
				? [{ text: `Restrictions: ${input.restrictions.join(", ")}` }]
				: undefined,
	}
}

// ============================================================================
// Multi-item picker (supplements, restrictions)
// ============================================================================

interface TagPickerProps {
	label: string
	options: string[]
	selected: string[]
	onChange: (next: string[]) => void
	customPlaceholder?: string
}

function TagPicker({ label, options, selected, onChange, customPlaceholder }: TagPickerProps) {
	const [custom, setCustom] = useState("")

	function toggle(option: string) {
		onChange(
			selected.includes(option)
				? selected.filter((s) => s !== option)
				: [...selected, option]
		)
	}

	function addCustom() {
		const trimmed = custom.trim()
		if (!trimmed || selected.includes(trimmed)) {
			setCustom("")
			return
		}
		onChange([...selected, trimmed])
		setCustom("")
	}

	return (
		<div className="space-y-2">
			<Label className="text-xs font-medium">{label}</Label>
			<div className="flex flex-wrap gap-2">
				{options.map((opt) => (
					<button
						key={opt}
						type="button"
						onClick={() => toggle(opt)}
						className={`rounded-full border px-3 py-1 text-xs transition-colors ${
							selected.includes(opt)
								? "bg-primary text-primary-foreground border-primary"
								: "hover:bg-muted"
						}`}
					>
						{opt}
					</button>
				))}
			</div>
			{selected.filter((s) => !options.includes(s)).length > 0 && (
				<div className="flex flex-wrap gap-1.5 mt-1">
					{selected
						.filter((s) => !options.includes(s))
						.map((s) => (
							<Badge key={s} variant="secondary" className="gap-1">
								{s}
								<button
									type="button"
									onClick={() => onChange(selected.filter((x) => x !== s))}
									aria-label="Remove"
								>
									<Trash2 className="size-2.5" />
								</button>
							</Badge>
						))}
				</div>
			)}
			{customPlaceholder && (
				<div className="flex gap-2 mt-1">
					<Input
						placeholder={customPlaceholder}
						value={custom}
						onChange={(e) => setCustom(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && addCustom()}
						className="h-7 text-xs"
					/>
					<Button type="button" variant="outline" size="sm" onClick={addCustom}>
						<Plus className="size-3.5" />
					</Button>
				</div>
			)}
		</div>
	)
}

// ============================================================================
// Main FHIR NutritionOrder Editor
// ============================================================================

interface FhirNutritionOrderEditorProps {
	assessmentId: string
	encounterId: string
	patientId: string
	onSaved?: () => void
}

export function FhirNutritionOrderEditor({
	assessmentId,
	encounterId,
	patientId,
	onSaved,
}: FhirNutritionOrderEditorProps) {
	const saveMutation = useSaveMealPlanMutation()

	const [dietType, setDietType] = useState("regular")
	const [feedingRoute, setFeedingRoute] = useState("oral")
	const [caloricTarget, setCaloricTarget] = useState(2000)
	const [proteinTarget, setProteinTarget] = useState(80)
	const [carbTarget, setCarbTarget] = useState(250)
	const [fatTarget, setFatTarget] = useState(65)
	const [textureModification, setTextureModification] = useState("Regular")
	const [fluidRestriction, setFluidRestriction] = useState(false)
	const [fluidTarget, setFluidTarget] = useState(1500)
	const [enteralFormula, setEnteralFormula] = useState("")
	const [parenteralFormula, setParenteralFormula] = useState("")
	const [supplements, setSupplements] = useState<string[]>([])
	const [restrictions, setRestrictions] = useState<string[]>([])
	const [specialInstructions, setSpecialInstructions] = useState("")
	const [showFhirJson, setShowFhirJson] = useState(false)
	const [saved, setSaved] = useState(false)

	const fhirInput: FhirNutritionOrderInput = {
		encounterId,
		patientId,
		dietType,
		feedingRoute,
		caloricTarget,
		proteinTarget,
		carbTarget,
		fatTarget,
		textureModification,
		fluidRestriction,
		fluidTarget,
		enteralFormula,
		parenteralFormula,
		supplements,
		restrictions,
		specialInstructions,
	}

	const fhirJson = buildFhirNutritionOrder(fhirInput)

	async function handleSave() {
		const payload: CreateMealPlanInput = {
			assessmentId,
			mealPlan: {
				dietType,
				caloricTarget,
				proteinTarget,
				carbTarget,
				fatTarget,
				feedingRoute: feedingRoute as "oral" | "enteral" | "parenteral" | "mixed",
				enteralFormula: enteralFormula || undefined,
				parenteralFormula: parenteralFormula || undefined,
				supplements: supplements.length > 0 ? supplements : undefined,
				restrictions: restrictions.length > 0 ? restrictions : undefined,
				specialInstructions: specialInstructions || undefined,
			},
		}
		await saveMutation.mutateAsync(payload)
		setSaved(true)
		onSaved?.()
	}

	if (saved) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center py-10 text-center">
					<CheckCircle2 className="size-12 text-green-500 mb-3" />
					<p className="font-semibold">NutritionOrder Saved</p>
					<p className="text-sm text-muted-foreground mt-1">
						Diet order and meal plan have been saved.
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="font-semibold">FHIR NutritionOrder</h3>
				<p className="text-sm text-muted-foreground">
					Configure diet type, feeding route, macronutrient targets, and supplements.
					The order will be encoded as a FHIR R4 NutritionOrder resource.
				</p>
			</div>

			{/* Diet Type & Route */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Diet &amp; Route</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1">
						<Label className="text-xs">Diet Type</Label>
						<Select value={dietType} onValueChange={v => setDietType(v ?? "")}>
							<SelectTrigger>
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

					<div className="space-y-1">
						<Label className="text-xs">Feeding Route</Label>
						<Select value={feedingRoute} onValueChange={v => setFeedingRoute(v ?? "")}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FEEDING_ROUTES.map((r) => (
									<SelectItem key={r.value} value={r.value}>
										{r.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{(feedingRoute === "oral" || feedingRoute === "mixed") && (
						<div className="space-y-1">
							<Label className="text-xs">Texture Modification (IDDSI)</Label>
							<Select value={textureModification} onValueChange={v => setTextureModification(v ?? "")}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TEXTURE_MODIFICATIONS.map((t) => (
										<SelectItem key={t} value={t}>
											{t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{(feedingRoute === "enteral" || feedingRoute === "mixed") && (
						<div className="space-y-1">
							<Label className="text-xs">Enteral Formula / Product</Label>
							<Input
								placeholder="e.g., Nutren 1.0, Isocal, Peptamen…"
								value={enteralFormula}
								onChange={(e) => setEnteralFormula(e.target.value)}
							/>
						</div>
					)}

					{feedingRoute === "parenteral" && (
						<div className="space-y-1">
							<Label className="text-xs">Parenteral Formula (TPN/PPN)</Label>
							<Input
								placeholder="e.g., Kabiven Peripheral, Aminomel Energy…"
								value={parenteralFormula}
								onChange={(e) => setParenteralFormula(e.target.value)}
							/>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Macronutrient Targets */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Macronutrient Targets</CardTitle>
					<CardDescription>Per day targets</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-4">
					{[
						{ label: "Energy (kcal)", value: caloricTarget, onChange: setCaloricTarget },
						{ label: "Protein (g)", value: proteinTarget, onChange: setProteinTarget },
						{ label: "Carbohydrate (g)", value: carbTarget, onChange: setCarbTarget },
						{ label: "Fat (g)", value: fatTarget, onChange: setFatTarget },
					].map(({ label, value, onChange }) => (
						<div key={label} className="space-y-1">
							<Label className="text-xs">{label}</Label>
							<Input
								type="number"
								min={0}
								value={value}
								onChange={(e) => onChange(Number(e.target.value))}
							/>
						</div>
					))}
				</CardContent>
			</Card>

			{/* Fluid restriction */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Fluid Management</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center gap-2">
						<Checkbox
							id="fluid-restriction"
							checked={fluidRestriction}
							onCheckedChange={(v) => setFluidRestriction(!!v)}
						/>
						<Label htmlFor="fluid-restriction" className="text-sm cursor-pointer">
							Apply fluid restriction
						</Label>
					</div>
					{fluidRestriction && (
						<div className="space-y-1">
							<Label className="text-xs">Daily Fluid Allowance (mL)</Label>
							<Input
								type="number"
								min={0}
								value={fluidTarget}
								onChange={(e) => setFluidTarget(Number(e.target.value))}
								className="w-40"
							/>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Supplements */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Supplements</CardTitle>
				</CardHeader>
				<CardContent>
					<TagPicker
						label="Select supplements"
						options={COMMON_SUPPLEMENTS}
						selected={supplements}
						onChange={setSupplements}
						customPlaceholder="Add custom supplement…"
					/>
				</CardContent>
			</Card>

			{/* Dietary Restrictions */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Dietary Restrictions</CardTitle>
				</CardHeader>
				<CardContent>
					<TagPicker
						label="Select restrictions"
						options={COMMON_RESTRICTIONS}
						selected={restrictions}
						onChange={setRestrictions}
						customPlaceholder="Add custom restriction…"
					/>
				</CardContent>
			</Card>

			{/* Special Instructions */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Special Instructions</CardTitle>
				</CardHeader>
				<CardContent>
					<Textarea
						rows={3}
						placeholder="Additional notes for kitchen or nursing staff, allergy warnings, timing preferences…"
						value={specialInstructions}
						onChange={(e) => setSpecialInstructions(e.target.value)}
					/>
				</CardContent>
			</Card>

			{/* FHIR JSON preview */}
			<div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setShowFhirJson((v) => !v)}
					className="mb-2"
				>
					<Code2 className="mr-1.5 size-3.5" />
					{showFhirJson ? "Hide" : "Preview"} FHIR R4 JSON
				</Button>
				{showFhirJson && (
					<pre className="rounded-md border bg-muted p-4 text-xs overflow-auto max-h-80">
						{JSON.stringify(fhirJson, null, 2)}
					</pre>
				)}
			</div>

			<Separator />

			{/* Actions */}
			<div className="flex justify-end">
				<Button
					onClick={handleSave}
					disabled={saveMutation.isPending}
				>
					{saveMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
					Save NutritionOrder
				</Button>
			</div>
		</div>
	)
}
