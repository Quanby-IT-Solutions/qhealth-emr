"use client"

import { useState } from "react"

import { AlertCircle, CheckCircle2, ClipboardList, Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"

import {
	type ScreeningScoreInput,
	type ScreeningScoreResult,
	useScoreScreeningMutation,
} from "../api/nutrition.hooks"

// ============================================================================
// Types
// ============================================================================

type ToolKey = "nrs_2002" | "must" | "sga"

// ============================================================================
// Risk badge
// ============================================================================

function RiskBadge({ risk }: { risk: "low" | "moderate" | "high" }) {
	const map = {
		low: "bg-green-100 text-green-800 border-green-200",
		moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
		high: "bg-red-100 text-red-800 border-red-200",
	}
	return (
		<Badge className={`border font-semibold capitalize ${map[risk]}`}>{risk} risk</Badge>
	)
}

// ============================================================================
// Helpers
// ============================================================================

interface RadioOption {
	value: string
	label: string
	description?: string
}

function RadioQuestion({
	label,
	options,
	value,
	onChange,
}: {
	label: string
	options: RadioOption[]
	value: string
	onChange: (v: string) => void
}) {
	return (
		<div className="space-y-2">
			<p className="text-sm font-medium">{label}</p>
			<RadioGroup value={value} onValueChange={v => onChange(String(v))} className="space-y-1">
				{options.map((opt) => (
					<div key={opt.value} className="flex items-start gap-2 rounded-md border p-3 hover:bg-muted/40">
						<RadioGroupItem value={opt.value} id={`${label}-${opt.value}`} className="mt-0.5" />
						<Label htmlFor={`${label}-${opt.value}`} className="cursor-pointer leading-none">
							<span className="font-medium">{opt.label}</span>
							{opt.description && (
								<span className="block text-xs text-muted-foreground">{opt.description}</span>
							)}
						</Label>
					</div>
				))}
			</RadioGroup>
		</div>
	)
}

// ============================================================================
// NRS-2002 Form
// ============================================================================

const NRS_IMPAIRMENT_OPTIONS: RadioOption[] = [
	{ value: "0", label: "Score 0 — Normal nutritional status", description: "No impairment" },
	{
		value: "1",
		label: "Score 1 — Mild impairment",
		description: "Weight loss >5% in 3 months OR food intake 50–75% of requirement past week",
	},
	{
		value: "2",
		label: "Score 2 — Moderate impairment",
		description: "Weight loss >5% in 2 months OR BMI 18.5–20.5 with impaired general condition",
	},
	{
		value: "3",
		label: "Score 3 — Severe impairment",
		description: "Weight loss >5% in 1 month OR BMI <18.5 with impaired general condition",
	},
]

const NRS_DISEASE_OPTIONS: RadioOption[] = [
	{ value: "0", label: "Score 0 — Normal requirements", description: "No metabolic stress" },
	{
		value: "1",
		label: "Score 1 — Mild increase",
		description: "Hip fracture, chronic illness (COPD, diabetes, dialysis, cirrhosis, oncology)",
	},
	{
		value: "2",
		label: "Score 2 — Moderate increase",
		description: "Major abdominal surgery, stroke, severe pneumonia, hematologic malignancy",
	},
	{
		value: "3",
		label: "Score 3 — Severe increase",
		description: "Head injury, bone marrow transplant, ICU patient (APACHE >10)",
	},
]

function Nrs2002Form({
	age,
	onAgeChange,
	impairment,
	onImpairmentChange,
	disease,
	onDiseaseChange,
}: {
	age: string
	onAgeChange: (v: string) => void
	impairment: string
	onImpairmentChange: (v: string) => void
	disease: string
	onDiseaseChange: (v: string) => void
}) {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<p className="text-sm font-medium">Patient Age</p>
				<Select value={age} onValueChange={v => onAgeChange(v ?? "")}>
					<SelectTrigger className="w-48">
						<SelectValue placeholder="Select age range" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="under70">Under 70 years (+0)</SelectItem>
						<SelectItem value="70plus">70 years or older (+1)</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<Separator />
			<RadioQuestion
				label="Nutritional Impairment Score (choose one)"
				options={NRS_IMPAIRMENT_OPTIONS}
				value={impairment}
				onChange={onImpairmentChange}
			/>
			<Separator />
			<RadioQuestion
				label="Severity of Disease Score (choose one)"
				options={NRS_DISEASE_OPTIONS}
				value={disease}
				onChange={onDiseaseChange}
			/>
		</div>
	)
}

// ============================================================================
// MUST Form
// ============================================================================

const MUST_BMI_OPTIONS: RadioOption[] = [
	{ value: "0", label: "Score 0 — BMI > 20", description: "Normal / overweight" },
	{ value: "1", label: "Score 1 — BMI 18.5–20", description: "Borderline" },
	{ value: "2", label: "Score 2 — BMI < 18.5", description: "Underweight" },
]

const MUST_WEIGHT_OPTIONS: RadioOption[] = [
	{ value: "0", label: "Score 0 — Weight loss < 5% in past 3–6 months" },
	{ value: "1", label: "Score 1 — Weight loss 5–10% in past 3–6 months" },
	{ value: "2", label: "Score 2 — Weight loss > 10% in past 3–6 months" },
]

const MUST_ACUTE_OPTIONS: RadioOption[] = [
	{ value: "0", label: "Score 0 — No acute disease effect or normal intake" },
	{
		value: "2",
		label: "Score 2 — Acutely ill with no or very little nutritional intake likely for ≥ 5 days",
	},
]

function MustForm({
	bmi,
	onBmiChange,
	weight,
	onWeightChange,
	acute,
	onAcuteChange,
}: {
	bmi: string
	onBmiChange: (v: string) => void
	weight: string
	onWeightChange: (v: string) => void
	acute: string
	onAcuteChange: (v: string) => void
}) {
	return (
		<div className="space-y-6">
			<RadioQuestion
				label="Step 1 — BMI Score"
				options={MUST_BMI_OPTIONS}
				value={bmi}
				onChange={onBmiChange}
			/>
			<Separator />
			<RadioQuestion
				label="Step 2 — Unplanned Weight Loss Score"
				options={MUST_WEIGHT_OPTIONS}
				value={weight}
				onChange={onWeightChange}
			/>
			<Separator />
			<RadioQuestion
				label="Step 3 — Acute Disease Effect"
				options={MUST_ACUTE_OPTIONS}
				value={acute}
				onChange={onAcuteChange}
			/>
		</div>
	)
}

// ============================================================================
// SGA Form
// ============================================================================

const SGA_OPTIONS: RadioOption[] = [
	{
		value: "A",
		label: "SGA-A — Well-nourished",
		description: "No significant changes in weight, dietary intake, or functional capacity; no signs of malnutrition on physical exam",
	},
	{
		value: "B",
		label: "SGA-B — Mildly to moderately malnourished",
		description: "Definite decrease in subcutaneous fat and/or mild muscle wasting; history of weight loss or decreased intake",
	},
	{
		value: "C",
		label: "SGA-C — Severely malnourished",
		description: "Severe muscle wasting, loss of subcutaneous fat, and/or edema/ascites with nutritional implications",
	},
]

function SgaForm({
	rating,
	onRatingChange,
}: {
	rating: string
	onRatingChange: (v: string) => void
}) {
	return (
		<RadioQuestion
			label="Global Assessment Rating (clinician judgment)"
			options={SGA_OPTIONS}
			value={rating}
			onChange={onRatingChange}
		/>
	)
}

// ============================================================================
// Result panel
// ============================================================================

function ScoreResult({ result }: { result: ScreeningScoreResult }) {
	const toolLabel: Record<string, string> = {
		nrs_2002: "NRS-2002",
		must: "MUST",
		sga: "SGA",
	}
	return (
		<div className="space-y-4 rounded-lg border bg-muted/30 p-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<CheckCircle2 className="size-5 text-green-600" />
					<span className="font-semibold">
						{toolLabel[result.tool] ?? result.tool} — Score {result.score}
					</span>
				</div>
				<RiskBadge risk={result.risk} />
			</div>
			<Alert
				variant={result.risk === "high" ? "destructive" : "default"}
				className={result.risk === "moderate" ? "border-yellow-300 bg-yellow-50" : ""}
			>
				<AlertCircle className="size-4" />
				<AlertTitle>{result.interpretation}</AlertTitle>
				<AlertDescription>{result.recommendation}</AlertDescription>
			</Alert>
		</div>
	)
}

// ============================================================================
// Main component
// ============================================================================

export interface ScreeningToolProps {
	/** Optional — pre-fills the tool selector */
	defaultTool?: ToolKey
	/** Called when scoring completes — allows parent to pre-fill screening fields */
	onResult?: (result: ScreeningScoreResult) => void
}

export function ScreeningTool({ defaultTool = "nrs_2002", onResult }: ScreeningToolProps) {
	const [tool, setTool] = useState<ToolKey>(defaultTool)
	const [result, setResult] = useState<ScreeningScoreResult | null>(null)

	// NRS-2002 state
	const [nrsAge, setNrsAge] = useState("under70")
	const [nrsImpairment, setNrsImpairment] = useState("0")
	const [nrsDisease, setNrsDisease] = useState("0")

	// MUST state
	const [mustBmi, setMustBmi] = useState("0")
	const [mustWeight, setMustWeight] = useState("0")
	const [mustAcute, setMustAcute] = useState("0")

	// SGA state
	const [sgaRating, setSgaRating] = useState<"A" | "B" | "C">("A")

	const { mutate, isPending } = useScoreScreeningMutation()

	function buildInput(): ScreeningScoreInput {
		if (tool === "nrs_2002") {
			return {
				tool: "nrs_2002",
				nutritionalImpairmentScore: Number(nrsImpairment),
				severityOfDiseaseScore: Number(nrsDisease),
				age: nrsAge === "70plus" ? 75 : 50,
			}
		}
		if (tool === "must") {
			return {
				tool: "must",
				bmiScore: Number(mustBmi),
				weightLossScore: Number(mustWeight),
				acuteDiseaseEffect: Number(mustAcute),
			}
		}
		return { tool: "sga", rating: sgaRating }
	}

	function handleCalculate() {
		setResult(null)
		mutate(buildInput(), {
			onSuccess: (res) => {
				setResult(res)
				onResult?.(res)
			},
		})
	}

	function handleToolChange(v: string) {
		setTool(v as ToolKey)
		setResult(null)
	}

	const toolLabel: Record<ToolKey, string> = {
		nrs_2002: "NRS-2002 (Nutritional Risk Screening)",
		must: "MUST (Malnutrition Universal Screening Tool)",
		sga: "SGA (Subjective Global Assessment)",
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ClipboardList className="size-5" />
					Nutritional Screening
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Tool selector */}
				<div className="space-y-2">
					<Label>Screening Tool</Label>
					<RadioGroup
						value={tool}
						onValueChange={v => handleToolChange(String(v))}
						className="grid gap-2 sm:grid-cols-3"
					>
						{(["nrs_2002", "must", "sga"] as const).map((t) => (
							<div
								key={t}
								className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
									tool === t ? "border-primary bg-primary/5" : "hover:bg-muted/40"
								}`}
							>
								<RadioGroupItem value={t} id={`tool-${t}`} />
								<Label htmlFor={`tool-${t}`} className="cursor-pointer text-sm font-medium leading-tight">
									{t === "nrs_2002" ? "NRS-2002" : t === "must" ? "MUST" : "SGA"}
								</Label>
							</div>
						))}
					</RadioGroup>
					<p className="text-xs text-muted-foreground">{toolLabel[tool]}</p>
				</div>

				<Separator />

				{/* Tool-specific form */}
				{tool === "nrs_2002" && (
					<Nrs2002Form
						age={nrsAge}
						onAgeChange={setNrsAge}
						impairment={nrsImpairment}
						onImpairmentChange={setNrsImpairment}
						disease={nrsDisease}
						onDiseaseChange={setNrsDisease}
					/>
				)}
				{tool === "must" && (
					<MustForm
						bmi={mustBmi}
						onBmiChange={setMustBmi}
						weight={mustWeight}
						onWeightChange={setMustWeight}
						acute={mustAcute}
						onAcuteChange={setMustAcute}
					/>
				)}
				{tool === "sga" && (
					<SgaForm rating={sgaRating} onRatingChange={(v) => setSgaRating(v as "A" | "B" | "C")} />
				)}

				<Button onClick={handleCalculate} disabled={isPending} className="w-full">
					{isPending ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							Calculating…
						</>
					) : (
						"Calculate Score"
					)}
				</Button>

				{result && <ScoreResult result={result} />}
			</CardContent>
		</Card>
	)
}
