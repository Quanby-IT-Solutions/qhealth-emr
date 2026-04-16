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

import type {
	BeneficiaryClass,
	CreateFinancialEvaluationInput,
	FinancialClassification,
} from "@/features/msw/api/msw.hooks"
import {
	useCreateFinancialEvaluationMutation,
	useFinancialEvaluationQuery,
	useUpdateFinancialEvaluationMutation,
} from "@/features/msw/api/msw.hooks"

// ============================================================================
// Constants
// ============================================================================

const BENEFICIARY_CLASS_OPTIONS: { value: BeneficiaryClass; label: string }[] = [
	{ value: "sponsored", label: "Sponsored Member (Indigent)" },
	{ value: "indigent", label: "Indigent" },
	{ value: "employed", label: "Employed (Private/Government)" },
	{ value: "self_employed", label: "Self-Employed" },
	{ value: "lifetime", label: "Lifetime Member" },
	{ value: "ofw", label: "Overseas Filipino Worker (OFW)" },
	{ value: "other", label: "Other" },
]

const FINANCIAL_CLASS_OPTIONS: { value: FinancialClassification; label: string; description: string }[] =
	[
		{ value: "a", label: "Class A", description: "Financially capable / sufficient resources" },
		{ value: "b", label: "Class B", description: "Middle income" },
		{ value: "c", label: "Class C", description: "Low income" },
		{
			value: "d",
			label: "Class D",
			description: "Below poverty threshold / indigent",
		},
	]

// ============================================================================
// Form state
// ============================================================================

interface FormState {
	householdSize: string
	monthlyHouseholdIncome: string
	monthlyExpenses: string
	hasRegularIncome: "yes" | "no"
	incomeSource: string
	beneficiaryClass: BeneficiaryClass
	financialClass: FinancialClassification
	findings: string
	recommendations: string
	socialHistoryNotes: string
}

const EMPTY: FormState = {
	householdSize: "",
	monthlyHouseholdIncome: "",
	monthlyExpenses: "",
	hasRegularIncome: "yes",
	incomeSource: "",
	beneficiaryClass: "sponsored",
	financialClass: "c",
	findings: "",
	recommendations: "",
	socialHistoryNotes: "",
}

// ============================================================================
// Component
// ============================================================================

interface MswEvaluationFormProps {
	encounterId: string
	patientId: string
	onSaved?: () => void
}

export function MswEvaluationForm({ encounterId, patientId, onSaved }: MswEvaluationFormProps) {
	const { data: existing, isLoading } = useFinancialEvaluationQuery(encounterId)
	const createMutation = useCreateFinancialEvaluationMutation()
	const updateMutation = useUpdateFinancialEvaluationMutation()
	const [editing, setEditing] = useState(false)
	const [form, setForm] = useState<FormState>(EMPTY)

	const isPending = createMutation.isPending || updateMutation.isPending
	const isError = createMutation.isError || updateMutation.isError

	const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
		setForm((prev) => ({ ...prev, [field]: value }))

	const startEditing = () => {
		if (existing) {
			setForm({
				householdSize: String(existing.householdSize),
				monthlyHouseholdIncome: String(existing.monthlyHouseholdIncome),
				monthlyExpenses: String(existing.monthlyExpenses),
				hasRegularIncome: existing.hasRegularIncome ? "yes" : "no",
				incomeSource: existing.incomeSource ?? "",
				beneficiaryClass: existing.beneficiaryClass,
				financialClass: existing.financialClass,
				findings: existing.findings,
				recommendations: existing.recommendations ?? "",
				socialHistoryNotes: existing.socialHistoryNotes ?? "",
			})
		} else {
			setForm(EMPTY)
		}
		setEditing(true)
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const payload: CreateFinancialEvaluationInput = {
			encounterId,
			patientId,
			householdSize: Number(form.householdSize),
			monthlyHouseholdIncome: Number(form.monthlyHouseholdIncome),
			monthlyExpenses: Number(form.monthlyExpenses),
			hasRegularIncome: form.hasRegularIncome === "yes",
			incomeSource: form.incomeSource.trim() || undefined,
			beneficiaryClass: form.beneficiaryClass,
			financialClass: form.financialClass,
			findings: form.findings.trim(),
			recommendations: form.recommendations.trim() || undefined,
			socialHistoryNotes: form.socialHistoryNotes.trim() || undefined,
		}

		if (existing) {
			updateMutation.mutate(
				{ id: existing.id, ...payload },
				{
					onSuccess: () => {
						setEditing(false)
						onSaved?.()
					},
				}
			)
		} else {
			createMutation.mutate(payload, {
				onSuccess: () => {
					setEditing(false)
					onSaved?.()
				},
			})
		}
	}

	if (isLoading) {
		return (
			<Card>
				<CardContent className="py-6 text-center text-sm text-muted-foreground">
					Loading financial evaluation…
				</CardContent>
			</Card>
		)
	}

	// ── Read-only view ─────────────────────────────────────────────────────────
	if (existing && !editing) {
		const fc = FINANCIAL_CLASS_OPTIONS.find((o) => o.value === existing.financialClass)
		const bc = BENEFICIARY_CLASS_OPTIONS.find((o) => o.value === existing.beneficiaryClass)

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
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
							Household Size
						</p>
						<p className="text-sm">{existing.householdSize} persons</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
							Monthly Household Income
						</p>
						<p className="text-sm font-medium">
							₱{existing.monthlyHouseholdIncome.toLocaleString()}
						</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
							Monthly Expenses
						</p>
						<p className="text-sm">₱{existing.monthlyExpenses.toLocaleString()}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
							Income Source
						</p>
						<p className="text-sm">{existing.incomeSource ?? "—"}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
							Beneficiary Class
						</p>
						<p className="text-sm">{bc?.label ?? existing.beneficiaryClass}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
							Financial Class
						</p>
						<p className="text-sm font-medium">
							{fc?.label} —{" "}
							<span className="font-normal text-muted-foreground">
								{fc?.description}
							</span>
						</p>
					</div>
					<div className="sm:col-span-2">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
							Findings
						</p>
						<p className="text-sm whitespace-pre-wrap">{existing.findings}</p>
					</div>
					{existing.recommendations && (
						<div className="sm:col-span-2">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
								Recommendations
							</p>
							<p className="text-sm whitespace-pre-wrap">{existing.recommendations}</p>
						</div>
					)}
					{existing.socialHistoryNotes && (
						<div className="sm:col-span-2">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
								Social History Notes
							</p>
							<p className="text-sm whitespace-pre-wrap text-muted-foreground">
								{existing.socialHistoryNotes}
							</p>
						</div>
					)}
					<div className="sm:col-span-2 border-t pt-3 mt-1 text-xs text-muted-foreground">
						Evaluated by{" "}
						<span className="font-medium">{existing.performedByName}</span> ·{" "}
						{new Date(existing.performedAt).toLocaleDateString(undefined, {
							day: "numeric",
							month: "long",
							year: "numeric",
						})}
					</div>
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
						{existing ? "Edit Financial Evaluation" : "Financial Evaluation"}
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
					{/* Household profile */}
					<div>
						<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Household Profile
						</p>
						<div className="grid gap-4 sm:grid-cols-3">
							<div className="space-y-1.5">
								<Label htmlFor="householdSize">Household Size</Label>
								<Input
									id="householdSize"
									type="number"
									min={1}
									placeholder="e.g. 5"
									value={form.householdSize}
									onChange={(e) => update("householdSize", e.target.value)}
									required
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="monthlyIncome">Monthly Household Income (₱)</Label>
								<Input
									id="monthlyIncome"
									type="number"
									min={0}
									placeholder="e.g. 12000"
									value={form.monthlyHouseholdIncome}
									onChange={(e) => update("monthlyHouseholdIncome", e.target.value)}
									required
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="monthlyExpenses">Monthly Expenses (₱)</Label>
								<Input
									id="monthlyExpenses"
									type="number"
									min={0}
									placeholder="e.g. 10000"
									value={form.monthlyExpenses}
									onChange={(e) => update("monthlyExpenses", e.target.value)}
									required
								/>
							</div>
						</div>
					</div>

					{/* Income */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="hasRegularIncome">Regular Income</Label>
							<Select
								value={form.hasRegularIncome}
								onValueChange={(v) => update("hasRegularIncome", v as "yes" | "no")}
							>
								<SelectTrigger id="hasRegularIncome">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="yes">Yes — has regular income</SelectItem>
									<SelectItem value="no">No — no regular income</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="incomeSource">Income Source (optional)</Label>
							<Input
								id="incomeSource"
								placeholder="e.g. farmer, construction worker…"
								value={form.incomeSource}
								onChange={(e) => update("incomeSource", e.target.value)}
							/>
						</div>
					</div>

					{/* Classification */}
					<div>
						<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Classification
						</p>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="beneficiaryClass">PhilHealth Beneficiary Class</Label>
								<Select
									value={form.beneficiaryClass}
									onValueChange={(v) => update("beneficiaryClass", v as BeneficiaryClass)}
								>
									<SelectTrigger id="beneficiaryClass">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{BENEFICIARY_CLASS_OPTIONS.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="financialClass">Financial Classification</Label>
								<Select
									value={form.financialClass}
									onValueChange={(v) =>
										update("financialClass", v as FinancialClassification)
									}
								>
									<SelectTrigger id="financialClass">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{FINANCIAL_CLASS_OPTIONS.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label} — {o.description}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* Findings */}
					<div>
						<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Assessment
						</p>
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="findings">
									Findings <span className="text-destructive">*</span>
								</Label>
								<Textarea
									id="findings"
									rows={4}
									placeholder="Document financial assessment findings, family background, socioeconomic conditions…"
									value={form.findings}
									onChange={(e) => update("findings", e.target.value)}
									required
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="recommendations">Recommendations (optional)</Label>
								<Textarea
									id="recommendations"
									rows={3}
									placeholder="MSW recommendations for assistance, referrals, or follow-up…"
									value={form.recommendations}
									onChange={(e) => update("recommendations", e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="socialHistory">Social History Notes (optional)</Label>
								<Textarea
									id="socialHistory"
									rows={2}
									placeholder="Living conditions, support system, other relevant social history…"
									value={form.socialHistoryNotes}
									onChange={(e) => update("socialHistoryNotes", e.target.value)}
								/>
							</div>
						</div>
					</div>

					{isError && (
						<div className="flex items-center gap-2 text-sm text-destructive">
							<AlertCircle className="size-4 shrink-0" />
							<span>Failed to save evaluation. Please try again.</span>
						</div>
					)}

					{(createMutation.isSuccess || updateMutation.isSuccess) && (
						<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
							<CheckCircle className="size-4 shrink-0" />
							<span>Evaluation saved successfully.</span>
						</div>
					)}

					<div className="flex gap-2">
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving…" : "Save Evaluation"}
						</Button>
						{!existing && (
							<Button
								type="button"
								variant="ghost"
								onClick={() => setForm(EMPTY)}
								disabled={isPending}
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
