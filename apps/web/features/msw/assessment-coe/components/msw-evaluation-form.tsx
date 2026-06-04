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

import { useMswEvaluationQuery, useUpsertAssessmentMutation } from "../api/assessment.hooks"

// ============================================================================
// Types (co-located)
// ============================================================================

type EmploymentStatus =
	| "employed"
	| "self_employed"
	| "unemployed"
	| "retired"
	| "student"
	| "housewife"
	| "ofw"
	| "other"

type FinancialClass = "a" | "b" | "c1" | "c2" | "c3" | "d"

type HomeOwnership = "owned" | "rented" | "informal_settler" | "with_relatives" | "other"

// ============================================================================
// Constants
// ============================================================================

const EMPLOYMENT_OPTIONS: { value: EmploymentStatus; label: string }[] = [
	{ value: "employed", label: "Employed (private/government)" },
	{ value: "self_employed", label: "Self-employed" },
	{ value: "unemployed", label: "Unemployed" },
	{ value: "retired", label: "Retired" },
	{ value: "student", label: "Student" },
	{ value: "housewife", label: "Housewife / Homemaker" },
	{ value: "ofw", label: "Overseas Filipino Worker (OFW)" },
	{ value: "other", label: "Other" },
]

const FINANCIAL_CLASS_OPTIONS: { value: FinancialClass; label: string; description: string }[] = [
	{ value: "a", label: "Class A", description: "Financially capable / sufficient resources" },
	{ value: "b", label: "Class B", description: "Middle income" },
	{ value: "c1", label: "Class C1", description: "Low income — formal sector" },
	{ value: "c2", label: "Class C2", description: "Low income — informal sector" },
	{ value: "c3", label: "Class C3", description: "Near-poor" },
	{ value: "d", label: "Class D", description: "Below poverty threshold / indigent" },
]

const HOME_OWNERSHIP_OPTIONS: { value: HomeOwnership; label: string }[] = [
	{ value: "owned", label: "Owned" },
	{ value: "rented", label: "Rented" },
	{ value: "informal_settler", label: "Informal settler" },
	{ value: "with_relatives", label: "Living with relatives" },
	{ value: "other", label: "Other" },
]

// ============================================================================
// Form state
// ============================================================================

interface FormState {
	employmentStatus: EmploymentStatus
	occupation: string
	monthlyFamilyIncome: string
	numberOfDependents: string
	monthlyExpenses: string
	incomeSource: string
	homeOwnership: HomeOwnership
	financialClass: FinancialClass
	classificationNotes: string
	psychosocialAssessment: string
	recommendedInterventions: string
}

const EMPTY: FormState = {
	employmentStatus: "unemployed",
	occupation: "",
	monthlyFamilyIncome: "",
	numberOfDependents: "",
	monthlyExpenses: "",
	incomeSource: "",
	homeOwnership: "owned",
	financialClass: "c3",
	classificationNotes: "",
	psychosocialAssessment: "",
	recommendedInterventions: "",
}

function findingsToForm(f: Record<string, unknown>): FormState {
	return {
		employmentStatus: (f.employmentStatus as EmploymentStatus | undefined) ?? "unemployed",
		occupation: (f.occupation as string | undefined) ?? "",
		monthlyFamilyIncome: String(f.monthlyFamilyIncome ?? ""),
		numberOfDependents: String(f.numberOfDependents ?? ""),
		monthlyExpenses: String(f.monthlyExpenses ?? ""),
		incomeSource: (f.incomeSources as Array<{ source: string }> | undefined)?.[0]?.source ?? "",
		homeOwnership: (f.homeOwnership as HomeOwnership | undefined) ?? "owned",
		financialClass: (f.financialClass as FinancialClass | undefined) ?? "c3",
		classificationNotes: (f.classificationNotes as string | undefined) ?? "",
		psychosocialAssessment: (f.psychosocialAssessment as string | undefined) ?? "",
		recommendedInterventions: (f.recommendedInterventions as string | undefined) ?? "",
	}
}

// ============================================================================
// Component
// ============================================================================

interface MswEvaluationFormProps {
	encounterId: string
	patientId: string
	facilityId?: string
	onSaved?: () => void
}

export function MswEvaluationForm({
	encounterId,
	patientId,
	facilityId = "",
	onSaved,
}: MswEvaluationFormProps) {
	const { data: evaluation, isLoading } = useMswEvaluationQuery(encounterId)
	const upsertMutation = useUpsertAssessmentMutation()
	const [editing, setEditing] = useState(false)
	const [form, setForm] = useState<FormState>(EMPTY)

	const findings = evaluation?.evaluationFindings as Record<string, unknown> | null | undefined
	const hasFindings = findings != null

	const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
		setForm(prev => ({ ...prev, [field]: value }))

	const startEditing = () => {
		setForm(findings ? findingsToForm(findings) : EMPTY)
		setEditing(true)
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		upsertMutation.mutate(
			{
				encounterId,
				patientId: evaluation?.patientId ?? patientId,
				facilityId: evaluation?.facilityId ?? facilityId,
				evaluationFindings: {
					employmentStatus: form.employmentStatus,
					occupation: form.occupation || undefined,
					monthlyFamilyIncome: Number(form.monthlyFamilyIncome),
					numberOfDependents: Number(form.numberOfDependents),
					monthlyExpenses: form.monthlyExpenses ? Number(form.monthlyExpenses) : undefined,
					incomeSources: form.incomeSource
						? [
								{
									source: form.incomeSource,
									amount: Number(form.monthlyFamilyIncome),
									frequency: "monthly" as const,
								},
							]
						: [],
					homeOwnership: form.homeOwnership || undefined,
					financialClass: form.financialClass,
					classificationNotes: form.classificationNotes || undefined,
					psychosocialAssessment: form.psychosocialAssessment || undefined,
					recommendedInterventions: form.recommendedInterventions || undefined,
				},
			},
			{
				onSuccess: () => {
					setEditing(false)
					onSaved?.()
				},
			}
		)
	}

	if (isLoading) {
		return (
			<Card>
				<CardContent className="text-muted-foreground py-6 text-center text-sm">
					Loading financial evaluation…
				</CardContent>
			</Card>
		)
	}

	// ── Read-only view ─────────────────────────────────────────────────────────
	if (hasFindings && !editing) {
		const fc = FINANCIAL_CLASS_OPTIONS.find(o => o.value === findings.financialClass)
		return (
			<Card>
				<CardHeader className="flex flex-row items-start justify-between">
					<CardTitle className="text-base">Financial Evaluation</CardTitle>
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
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Employment Status
						</p>
						<p className="text-sm">
							{EMPLOYMENT_OPTIONS.find(o => o.value === findings.employmentStatus)?.label ??
								String(findings.employmentStatus ?? "—")}
							{findings.occupation ? ` — ${findings.occupation}` : ""}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Monthly Family Income
						</p>
						<p className="text-sm font-medium">
							&#8369;{Number(findings.monthlyFamilyIncome ?? 0).toLocaleString()}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Number of Dependents
						</p>
						<p className="text-sm">{String(findings.numberOfDependents ?? "—")}</p>
					</div>
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Monthly Expenses
						</p>
						<p className="text-sm">
							{findings.monthlyExpenses != null
								? `₱${Number(findings.monthlyExpenses).toLocaleString()}`
								: "—"}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Income Source
						</p>
						<p className="text-sm">
							{(findings.incomeSources as Array<{ source: string }> | undefined)?.[0]?.source ??
								"—"}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Financial Class
						</p>
						<p className="text-sm font-medium">
							{fc?.label ?? String(findings.financialClass)}{" "}
							{fc && <span className="text-muted-foreground font-normal">— {fc.description}</span>}
						</p>
					</div>
					{!!findings.psychosocialAssessment && (
						<div className="sm:col-span-2">
							<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
								Psychosocial Assessment
							</p>
							<p className="text-sm whitespace-pre-wrap">
								{String(findings.psychosocialAssessment)}
							</p>
						</div>
					)}
					{!!findings.recommendedInterventions && (
						<div className="sm:col-span-2">
							<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
								Recommended Interventions
							</p>
							<p className="text-sm whitespace-pre-wrap">
								{String(findings.recommendedInterventions)}
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		)
	}

	// ── Edit / create form ─────────────────────────────────────────────────────
	return (
		<form onSubmit={handleSubmit}>
			<Card>
				<CardHeader className="flex flex-row items-start justify-between">
					<CardTitle className="text-base">
						{hasFindings ? "Edit Financial Evaluation" : "Financial Evaluation"}
					</CardTitle>
					{hasFindings && (
						<Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
							Cancel
						</Button>
					)}
				</CardHeader>
				<CardContent className="space-y-5">
					{/* Employment */}
					<div>
						<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
							Employment &amp; Income
						</p>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="employmentStatus">Employment Status</Label>
								<Select
									value={form.employmentStatus}
									onValueChange={v => update("employmentStatus", v as EmploymentStatus)}
								>
									<SelectTrigger id="employmentStatus">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{EMPLOYMENT_OPTIONS.map(o => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="occupation">Occupation / Employer (optional)</Label>
								<Input
									id="occupation"
									placeholder="e.g. construction worker, nurse…"
									value={form.occupation}
									onChange={e => update("occupation", e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="monthlyFamilyIncome">
									Monthly Family Income (&#8369;) <span className="text-destructive">*</span>
								</Label>
								<Input
									id="monthlyFamilyIncome"
									type="number"
									min={0}
									placeholder="e.g. 12000"
									value={form.monthlyFamilyIncome}
									onChange={e => update("monthlyFamilyIncome", e.target.value)}
									required
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="incomeSource">Primary Income Source (optional)</Label>
								<Input
									id="incomeSource"
									placeholder="e.g. sari-sari store, DSWD subsidy…"
									value={form.incomeSource}
									onChange={e => update("incomeSource", e.target.value)}
								/>
							</div>
						</div>
					</div>

					{/* Household */}
					<div>
						<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
							Household Profile
						</p>
						<div className="grid gap-4 sm:grid-cols-3">
							<div className="space-y-1.5">
								<Label htmlFor="numberOfDependents">
									No. of Dependents <span className="text-destructive">*</span>
								</Label>
								<Input
									id="numberOfDependents"
									type="number"
									min={0}
									placeholder="e.g. 4"
									value={form.numberOfDependents}
									onChange={e => update("numberOfDependents", e.target.value)}
									required
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="monthlyExpenses">Monthly Expenses (&#8369;, optional)</Label>
								<Input
									id="monthlyExpenses"
									type="number"
									min={0}
									placeholder="e.g. 8000"
									value={form.monthlyExpenses}
									onChange={e => update("monthlyExpenses", e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="homeOwnership">Home Ownership</Label>
								<Select
									value={form.homeOwnership}
									onValueChange={v => update("homeOwnership", v as HomeOwnership)}
								>
									<SelectTrigger id="homeOwnership">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{HOME_OWNERSHIP_OPTIONS.map(o => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* Classification */}
					<div>
						<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
							Classification
						</p>
						<div className="space-y-1.5">
							<Label htmlFor="financialClass">Financial Class</Label>
							<Select
								value={form.financialClass}
								onValueChange={v => update("financialClass", v as FinancialClass)}
							>
								<SelectTrigger id="financialClass">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FINANCIAL_CLASS_OPTIONS.map(o => (
										<SelectItem key={o.value} value={o.value}>
											{o.label} — {o.description}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Assessment */}
					<div>
						<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
							Assessment Notes
						</p>
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="psychosocialAssessment">Psychosocial Assessment</Label>
								<Textarea
									id="psychosocialAssessment"
									rows={4}
									placeholder="Document socioeconomic conditions, family background, support systems…"
									value={form.psychosocialAssessment}
									onChange={e => update("psychosocialAssessment", e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="recommendedInterventions">
									Recommended Interventions (optional)
								</Label>
								<Textarea
									id="recommendedInterventions"
									rows={3}
									placeholder="MSW recommendations for assistance, referrals, or follow-up…"
									value={form.recommendedInterventions}
									onChange={e => update("recommendedInterventions", e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="classificationNotes">Classification Notes (optional)</Label>
								<Textarea
									id="classificationNotes"
									rows={2}
									placeholder="Basis for financial classification…"
									value={form.classificationNotes}
									onChange={e => update("classificationNotes", e.target.value)}
								/>
							</div>
						</div>
					</div>

					{upsertMutation.isError && (
						<div className="text-destructive flex items-center gap-2 text-sm">
							<AlertCircle className="size-4 shrink-0" />
							<span>Failed to save evaluation. Please try again.</span>
						</div>
					)}

					{upsertMutation.isSuccess && (
						<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
							<CheckCircle className="size-4 shrink-0" />
							<span>Evaluation saved successfully.</span>
						</div>
					)}

					<div className="flex gap-2">
						<Button type="submit" disabled={upsertMutation.isPending}>
							{upsertMutation.isPending ? "Saving…" : "Save Evaluation"}
						</Button>
						{!hasFindings && (
							<Button
								type="button"
								variant="ghost"
								onClick={() => setForm(EMPTY)}
								disabled={upsertMutation.isPending}
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
