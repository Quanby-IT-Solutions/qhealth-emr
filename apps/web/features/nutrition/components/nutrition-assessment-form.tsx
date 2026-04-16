"use client"

import { useState } from "react"

import { AlertCircle, CheckCircle, ChevronDown } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"

import { MalnutritionRiskBadge } from "@/features/nutrition/components/malnutrition-risk-badge"

import type { MalnutritionRisk, ScreeningTool } from "@/features/nutrition/api/nutrition.hooks"
import {
	useCreateNutritionAssessmentMutation,
	useNutritionAssessmentsQuery,
} from "@/features/nutrition/api/nutrition.hooks"

// ============================================================================
// Score calculation helpers
// ============================================================================

function calcNrs2002(
	nutritionalScore: number,
	diseaseScore: number,
	ageOver70: boolean
): { score: number; risk: MalnutritionRisk } {
	const total = nutritionalScore + diseaseScore + (ageOver70 ? 1 : 0)
	const risk: MalnutritionRisk = total === 0 ? "low" : total <= 2 ? "moderate" : "high"
	return { score: total, risk }
}

function calcMust(
	bmiScore: number,
	weightLossScore: number,
	acuteIllnessScore: number
): { score: number; risk: MalnutritionRisk } {
	const total = bmiScore + weightLossScore + acuteIllnessScore
	const risk: MalnutritionRisk = total === 0 ? "low" : total === 1 ? "moderate" : "high"
	return { score: total, risk }
}

function calcSga(grade: string): { score: number; risk: MalnutritionRisk } {
	if (grade === "A") return { score: 0, risk: "low" }
	if (grade === "B") return { score: 1, risk: "moderate" }
	return { score: 2, risk: "high" }
}

// ============================================================================
// Component
// ============================================================================

interface NutritionAssessmentFormProps {
	encounterId: string
	patientId: string
	onSaved?: () => void
}

const TOOL_LABELS: Record<ScreeningTool, string> = {
	nrs2002: "NRS-2002",
	must: "MUST",
	sga: "SGA",
}

const NRS2002_NUTRITIONAL_OPTIONS = [
	{ value: "0", label: "0 – Normal nutritional status" },
	{ value: "1", label: "1 – Weight loss > 5% in 3 months OR intake < 50–75% of requirement" },
	{ value: "2", label: "2 – Weight loss > 5% in 2 months OR BMI 18.5–20.5 + poor intake" },
	{ value: "3", label: "3 – Weight loss > 5% in 1 month OR BMI < 18.5 + poor intake" },
]

const NRS2002_DISEASE_OPTIONS = [
	{ value: "0", label: "0 – Normal requirements" },
	{ value: "1", label: "1 – Hip fracture / chronic disease (COPD, cirrhosis, dialysis, DM, cancer)" },
	{ value: "2", label: "2 – Major abdominal surgery / stroke / severe pneumonia / haematologic malignancy" },
	{ value: "3", label: "3 – Head injury / bone marrow transplant / ICU patients (APACHE > 10)" },
]

const MUST_BMI_OPTIONS = [
	{ value: "0", label: "0 – BMI > 20 kg/m²" },
	{ value: "1", label: "1 – BMI 18.5–20 kg/m²" },
	{ value: "2", label: "2 – BMI < 18.5 kg/m²" },
]

const MUST_WEIGHT_OPTIONS = [
	{ value: "0", label: "0 – Unplanned weight loss < 5% in 3–6 months" },
	{ value: "1", label: "1 – Unplanned weight loss 5–10% in 3–6 months" },
	{ value: "2", label: "2 – Unplanned weight loss > 10% in 3–6 months" },
]

const MUST_ACUTE_OPTIONS = [
	{ value: "0", label: "0 – No acute illness / no nutritional impact" },
	{ value: "2", label: "2 – Acutely ill and no / very little nutritional intake for > 5 days" },
]

const SGA_GRADE_OPTIONS = [
	{
		value: "A",
		label: "A – Well-nourished (normal or improved nutritional status)",
	},
	{
		value: "B",
		label: "B – Mild–moderate malnutrition (some features of malnutrition)",
	},
	{
		value: "C",
		label: "C – Severely malnourished (clear signs of malnutrition)",
	},
]

export function NutritionAssessmentForm({
	encounterId,
	patientId,
	onSaved,
}: NutritionAssessmentFormProps) {
	const [tool, setTool] = useState<ScreeningTool>("nrs2002")
	const [nrsNutritional, setNrsNutritional] = useState("0")
	const [nrsDisease, setNrsDisease] = useState("0")
	const [nrsAgeOver70, setNrsAgeOver70] = useState("no")
	const [mustBmi, setMustBmi] = useState("0")
	const [mustWeight, setMustWeight] = useState("0")
	const [mustAcute, setMustAcute] = useState("0")
	const [sgaGrade, setSgaGrade] = useState("A")
	const [notes, setNotes] = useState("")
	const [showHistory, setShowHistory] = useState(false)

	const { data: history, isLoading: historyLoading } = useNutritionAssessmentsQuery(
		encounterId,
		{ limit: 10 }
	)
	const createMutation = useCreateNutritionAssessmentMutation()

	// Derive current score / risk
	const derived = (() => {
		if (tool === "nrs2002") {
			return calcNrs2002(
				Number(nrsNutritional),
				Number(nrsDisease),
				nrsAgeOver70 === "yes"
			)
		}
		if (tool === "must") {
			return calcMust(Number(mustBmi), Number(mustWeight), Number(mustAcute))
		}
		return calcSga(sgaGrade)
	})()

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		createMutation.mutate(
			{
				encounterId,
				patientId,
				screeningTool: tool,
				score: derived.score,
				riskLevel: derived.risk,
				notes: notes.trim() || undefined,
			},
			{
				onSuccess: () => {
					// Reset fields
					setNrsNutritional("0")
					setNrsDisease("0")
					setNrsAgeOver70("no")
					setMustBmi("0")
					setMustWeight("0")
					setMustAcute("0")
					setSgaGrade("A")
					setNotes("")
					onSaved?.()
				},
			}
		)
	}

	return (
		<div className="space-y-6">
			<form onSubmit={handleSubmit}>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Malnutrition Screening</CardTitle>
					</CardHeader>
					<CardContent className="space-y-5">
						{/* Tool selector */}
						<div className="space-y-1.5">
							<Label htmlFor="screeningTool">Screening Tool</Label>
							<div className="flex gap-2">
								{(Object.keys(TOOL_LABELS) as ScreeningTool[]).map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => setTool(t)}
										className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
											tool === t
												? "bg-primary text-primary-foreground border-primary"
												: "border-input bg-background hover:bg-accent hover:text-accent-foreground"
										}`}
									>
										{TOOL_LABELS[t]}
									</button>
								))}
							</div>
						</div>

						{/* NRS-2002 fields */}
						{tool === "nrs2002" && (
							<>
								<div className="space-y-1.5">
									<Label htmlFor="nrsNutritional">Nutritional Status Score</Label>
									<Select value={nrsNutritional} onValueChange={setNrsNutritional}>
										<SelectTrigger id="nrsNutritional">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{NRS2002_NUTRITIONAL_OPTIONS.map((o) => (
												<SelectItem key={o.value} value={o.value}>
													{o.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="nrsDisease">Disease Severity Score</Label>
									<Select value={nrsDisease} onValueChange={setNrsDisease}>
										<SelectTrigger id="nrsDisease">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{NRS2002_DISEASE_OPTIONS.map((o) => (
												<SelectItem key={o.value} value={o.value}>
													{o.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="nrsAge">Age ≥ 70 years</Label>
									<Select value={nrsAgeOver70} onValueChange={setNrsAgeOver70}>
										<SelectTrigger id="nrsAge">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="no">No</SelectItem>
											<SelectItem value="yes">Yes (+1 point)</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</>
						)}

						{/* MUST fields */}
						{tool === "must" && (
							<>
								<div className="space-y-1.5">
									<Label htmlFor="mustBmi">BMI Score</Label>
									<Select value={mustBmi} onValueChange={setMustBmi}>
										<SelectTrigger id="mustBmi">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{MUST_BMI_OPTIONS.map((o) => (
												<SelectItem key={o.value} value={o.value}>
													{o.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="mustWeight">Weight Loss Score</Label>
									<Select value={mustWeight} onValueChange={setMustWeight}>
										<SelectTrigger id="mustWeight">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{MUST_WEIGHT_OPTIONS.map((o) => (
												<SelectItem key={o.value} value={o.value}>
													{o.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="mustAcute">Acute Disease Effect Score</Label>
									<Select value={mustAcute} onValueChange={setMustAcute}>
										<SelectTrigger id="mustAcute">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{MUST_ACUTE_OPTIONS.map((o) => (
												<SelectItem key={o.value} value={o.value}>
													{o.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</>
						)}

						{/* SGA fields */}
						{tool === "sga" && (
							<div className="space-y-1.5">
								<Label htmlFor="sgaGrade">Subjective Global Assessment Grade</Label>
								<Select value={sgaGrade} onValueChange={setSgaGrade}>
									<SelectTrigger id="sgaGrade">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{SGA_GRADE_OPTIONS.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{/* Score summary */}
						<div className="flex items-center gap-3 rounded-md border bg-muted/40 px-4 py-3">
							{tool === "sga" ? (
								<span className="text-sm font-medium">
									SGA Grade{" "}
									<span className="font-bold uppercase">{sgaGrade}</span>
								</span>
							) : (
								<span className="text-sm font-medium">
									Total Score:{" "}
									<span className="font-bold">{derived.score}</span>
								</span>
							)}
							<MalnutritionRiskBadge risk={derived.risk} />
						</div>

						{/* Notes */}
						<div className="space-y-1.5">
							<Label htmlFor="assessmentNotes">Clinical Notes (optional)</Label>
							<Textarea
								id="assessmentNotes"
								placeholder="Add relevant clinical observations…"
								rows={3}
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
							/>
						</div>

						{createMutation.isError && (
							<div className="flex items-center gap-2 text-sm text-destructive">
								<AlertCircle className="size-4 shrink-0" />
								<span>Failed to save assessment. Please try again.</span>
							</div>
						)}

						{createMutation.isSuccess && (
							<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
								<CheckCircle className="size-4 shrink-0" />
								<span>Assessment saved successfully.</span>
							</div>
						)}

						<Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto">
							{createMutation.isPending ? "Saving…" : "Save Assessment"}
						</Button>
					</CardContent>
				</Card>
			</form>

			{/* Assessment history */}
			<div>
				<button
					type="button"
					className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
					onClick={() => setShowHistory((p) => !p)}
				>
					<ChevronDown
						className={`size-4 transition-transform ${showHistory ? "rotate-180" : ""}`}
					/>
					Assessment History
					{history && history.total > 0 && (
						<span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
							{history.total}
						</span>
					)}
				</button>

				{showHistory && (
					<Card className="mt-3">
						<CardContent className="pt-4">
							{historyLoading ? (
								<p className="text-sm text-muted-foreground">Loading history…</p>
							) : !history?.assessments.length ? (
								<p className="text-sm text-muted-foreground">No prior assessments for this encounter.</p>
							) : (
								<div className="divide-y">
									{history.assessments.map((a) => (
										<div key={a.id} className="flex items-center justify-between py-3 text-sm">
											<div className="flex flex-col gap-0.5">
												<span className="font-medium">
													{TOOL_LABELS[a.screeningTool]}
													{a.screeningTool !== "sga" && ` — Score ${a.score}`}
													{a.screeningTool === "sga" &&
														` — Grade ${a.score === 0 ? "A" : a.score === 1 ? "B" : "C"}`}
												</span>
												<span className="text-xs text-muted-foreground">
													{a.assessedByName} ·{" "}
													{new Date(a.assessedAt).toLocaleDateString(undefined, {
														day: "numeric",
														month: "short",
														year: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</span>
												{a.notes && (
													<span className="mt-0.5 text-xs text-muted-foreground italic">
														{a.notes}
													</span>
												)}
											</div>
											<MalnutritionRiskBadge risk={a.riskLevel} />
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	)
}
