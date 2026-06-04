"use client"

import { useState } from "react"
import { differenceInHours, format } from "date-fns"
import { AlertCircle, CheckCircle, Clock, Pencil } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/core/components/ui/tooltip"
import {
	useCreateNbsScreeningMutation,
	useUpdateNbsScreeningMutation,
	type CreateNbsScreeningInput,
	type NbsScreening,
	type NbsSpecimenType,
	type NbsStatus,
	type UpdateNbsScreeningInput,
} from "@/features/nbs/api/nbs.hooks"

// ============================================================================
// Constants
// ============================================================================

const SPECIMEN_TYPE_LABELS: Record<NbsSpecimenType, string> = {
	dried_blood_spot: "Dried Blood Spot (DBS)",
	cord_blood: "Cord Blood",
	heel_prick: "Heel Prick",
}

type ResultValue = "positive" | "negative" | "borderline"

const RESULT_BADGE: Record<ResultValue, { label: string; className: string }> = {
	negative: {
		label: "Negative",
		className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	},
	borderline: {
		label: "Borderline",
		className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
	},
	positive: {
		label: "Positive",
		className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
	},
}

const NBS_CONDITIONS = [
	{ key: "result_ch", label: "CH", full: "Congenital Hypothyroidism" },
	{ key: "result_cah", label: "CAH", full: "Congenital Adrenal Hyperplasia" },
	{ key: "result_g6pd", label: "G6PD", full: "G6PD Deficiency" },
	{ key: "result_gal", label: "GAL", full: "Galactosemia" },
	{ key: "result_pku", label: "PKU", full: "Phenylketonuria" },
	{ key: "result_msud", label: "MSUD", full: "Maple Syrup Urine Disease" },
] as const

type ConditionKey = (typeof NBS_CONDITIONS)[number]["key"]

interface ResultsState {
	result_ch: ResultValue | ""
	result_cah: ResultValue | ""
	result_g6pd: ResultValue | ""
	result_gal: ResultValue | ""
	result_pku: ResultValue | ""
	result_msud: ResultValue | ""
}

// ============================================================================
// Results panel (display only)
// ============================================================================

function ResultsPanel({ screening }: { screening: NbsScreening }) {
	return (
		<div className="bg-muted/30 space-y-2 rounded-md border p-3">
			<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
				NBS Panel Results
			</p>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{NBS_CONDITIONS.map(({ key, label, full }) => {
					const val = screening[key]
					if (!val) return null
					const cfg = RESULT_BADGE[val]
					return (
						<div key={key} className="flex items-center gap-2">
							<Badge className={cfg.className}>{cfg.label}</Badge>
							<span className="text-muted-foreground text-xs" title={full}>
								{label}
							</span>
						</div>
					)
				})}
			</div>
			{screening.result_overall && (
				<div className="mt-1 flex items-center gap-2 border-t pt-2">
					<span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						Overall:
					</span>
					<Badge
						className={
							screening.result_overall === "normal"
								? "bg-green-100 text-green-800"
								: screening.result_overall === "borderline"
									? "bg-amber-100 text-amber-800"
									: "bg-red-100 text-red-800"
						}
					>
						{screening.result_overall.charAt(0).toUpperCase() + screening.result_overall.slice(1)}
					</Badge>
				</div>
			)}
		</div>
	)
}

// ============================================================================
// Main component
// ============================================================================

interface NbsScreeningFormProps {
	encounterId: string
	patientId: string
	facilityId: string
	birthDatetime: string
	existing?: NbsScreening | null
}

export function NbsScreeningForm({
	encounterId,
	patientId,
	facilityId,
	birthDatetime,
	existing,
}: NbsScreeningFormProps) {
	const createMutation = useCreateNbsScreeningMutation()
	const updateMutation = useUpdateNbsScreeningMutation()
	const [editing, setEditing] = useState(false)

	// Collection fields
	const [specimenType, setSpecimenType] = useState<NbsSpecimenType | "">(
		existing?.specimenType ?? ""
	)
	const [specimenBarcode, setSpecimenBarcode] = useState(existing?.specimenBarcode ?? "")
	const [specimenCollectedAt, setSpecimenCollectedAt] = useState(
		existing?.specimenCollectedAt
			? new Date(existing.specimenCollectedAt).toISOString().slice(0, 16)
			: ""
	)
	const [specimenSentAt, setSpecimenSentAt] = useState(
		existing?.specimenSentAt ? new Date(existing.specimenSentAt).toISOString().slice(0, 16) : ""
	)
	const [resultReceivedAt, setResultReceivedAt] = useState(
		existing?.resultReceivedAt ? new Date(existing.resultReceivedAt).toISOString().slice(0, 16) : ""
	)

	// Result entry
	const [results, setResults] = useState<ResultsState>({
		result_ch: existing?.result_ch ?? "",
		result_cah: existing?.result_cah ?? "",
		result_g6pd: existing?.result_g6pd ?? "",
		result_gal: existing?.result_gal ?? "",
		result_pku: existing?.result_pku ?? "",
		result_msud: existing?.result_msud ?? "",
	})
	const [resultOverall, setResultOverall] = useState<"normal" | "abnormal" | "borderline" | "">(
		existing?.result_overall ?? ""
	)

	const [status, setStatus] = useState<NbsStatus>(existing?.status ?? "pending")
	const [notes, setNotes] = useState(existing?.notes ?? "")

	const isPending = createMutation.isPending || updateMutation.isPending
	const isError = createMutation.isError || updateMutation.isError

	// Calculate hours from birth
	const hoursFromBirth = specimenCollectedAt
		? differenceInHours(new Date(specimenCollectedAt), new Date(birthDatetime))
		: null
	const isIdealWindow = hoursFromBirth !== null && hoursFromBirth >= 24 && hoursFromBirth <= 48
	const isTooEarly = hoursFromBirth !== null && hoursFromBirth < 24
	const isLate = hoursFromBirth !== null && hoursFromBirth > 48

	const updateResult = (key: ConditionKey, val: string) =>
		setResults(prev => ({ ...prev, [key]: val as ResultValue | "" }))

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!existing) {
			const input: CreateNbsScreeningInput = {
				encounterId,
				patientId,
				facilityId,
				birthDatetime,
				specimenType: specimenType || undefined,
				specimenBarcode: specimenBarcode.trim() || undefined,
				specimenCollectedAt: specimenCollectedAt
					? new Date(specimenCollectedAt).toISOString()
					: undefined,
				notes: notes.trim() || undefined,
			}
			createMutation.mutate(input, { onSuccess: () => setEditing(false) })
		} else {
			const input: UpdateNbsScreeningInput = {
				id: existing.id,
				specimenType: specimenType || undefined,
				specimenBarcode: specimenBarcode.trim() || undefined,
				specimenCollectedAt: specimenCollectedAt
					? new Date(specimenCollectedAt).toISOString()
					: undefined,
				specimenSentAt: specimenSentAt ? new Date(specimenSentAt).toISOString() : undefined,
				resultReceivedAt: resultReceivedAt ? new Date(resultReceivedAt).toISOString() : undefined,
				status,
				result_ch: (results.result_ch || undefined) as ResultValue | undefined,
				result_cah: (results.result_cah || undefined) as ResultValue | undefined,
				result_g6pd: (results.result_g6pd || undefined) as ResultValue | undefined,
				result_gal: (results.result_gal || undefined) as ResultValue | undefined,
				result_pku: (results.result_pku || undefined) as ResultValue | undefined,
				result_msud: (results.result_msud || undefined) as ResultValue | undefined,
				result_overall: (resultOverall || undefined) as
					| "normal"
					| "abnormal"
					| "borderline"
					| undefined,
				notes: notes.trim() || undefined,
			}
			updateMutation.mutate(input, { onSuccess: () => setEditing(false) })
		}
	}

	// ── Read-only view ──────────────────────────────────────────────────────
	if (existing && !editing) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-start justify-between">
					<CardTitle className="text-sm">Specimen &amp; Results</CardTitle>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="gap-1.5"
						onClick={() => setEditing(true)}
					>
						<Pencil className="size-3.5" />
						Edit
					</Button>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Specimen Type
						</p>
						<p className="text-sm">
							{existing.specimenType ? SPECIMEN_TYPE_LABELS[existing.specimenType] : "—"}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Barcode
						</p>
						<p className="font-mono text-sm">{existing.specimenBarcode ?? "—"}</p>
					</div>
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Collected At
						</p>
						<p className="text-sm">
							{existing.specimenCollectedAt
								? new Date(existing.specimenCollectedAt).toLocaleString()
								: "—"}
							{existing.specimenCollectedAt && (
								<Badge
									variant="outline"
									className={`ml-2 px-1.5 py-0 text-[10px] ${isIdealWindow ? "border-green-200 text-green-600" : isTooEarly ? "border-amber-200 text-amber-600" : "border-red-200 text-red-600"}`}
								>
									{hoursFromBirth}h
								</Badge>
							)}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Sent At
						</p>
						<p className="text-sm">
							{existing.specimenSentAt ? new Date(existing.specimenSentAt).toLocaleString() : "—"}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							Results Received
						</p>
						<p className="text-sm">
							{existing.resultReceivedAt
								? new Date(existing.resultReceivedAt).toLocaleString()
								: "—"}
						</p>
					</div>
					{(existing.result_ch || existing.result_cah || existing.result_g6pd) && (
						<div className="sm:col-span-2">
							<ResultsPanel screening={existing} />
						</div>
					)}
					{existing.notes && (
						<div className="sm:col-span-2">
							<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
								Notes
							</p>
							<p className="text-muted-foreground text-sm whitespace-pre-wrap">{existing.notes}</p>
						</div>
					)}
				</CardContent>
			</Card>
		)
	}

	// ── Edit / create form ──────────────────────────────────────────────────
	return (
		<form onSubmit={handleSubmit}>
			<Card>
				<CardHeader className="flex flex-row items-start justify-between">
					<CardTitle className="text-sm">
						{existing ? "Edit Specimen &amp; Results" : "Specimen Collection"}
					</CardTitle>
					{existing && (
						<Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
							Cancel
						</Button>
					)}
				</CardHeader>
				<CardContent className="space-y-5">
					{/* Specimen */}
					<div>
						<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
							Specimen
						</p>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="specimenType">Specimen Type</Label>
								<Select
									value={specimenType}
									onValueChange={v => setSpecimenType(v as NbsSpecimenType | "")}
								>
									<SelectTrigger id="specimenType">
										<SelectValue>
											{specimenType
												? SPECIMEN_TYPE_LABELS[specimenType as NbsSpecimenType]
												: "Select type..."}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{Object.entries(SPECIMEN_TYPE_LABELS).map(([val, label]) => (
											<SelectItem key={val} value={val}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="specimenBarcode">Barcode / Specimen ID</Label>
								<Input
									id="specimenBarcode"
									placeholder="Scan or type barcode"
									value={specimenBarcode}
									onChange={e => setSpecimenBarcode(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="specimenCollectedAt">Date/Time Collected</Label>
									{hoursFromBirth !== null && (
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger>
													<div className="flex cursor-help items-center gap-1">
														<Clock
															className={`h-3 w-3 ${isIdealWindow ? "text-green-500" : isTooEarly ? "text-amber-500" : "text-red-500"}`}
														/>
														<span
															className={`text-[10px] font-bold ${isIdealWindow ? "text-green-600" : isTooEarly ? "text-amber-600" : "text-red-600"}`}
														>
															{hoursFromBirth}h from birth
														</span>
													</div>
												</TooltipTrigger>
												<TooltipContent side="top" className="max-w-50 text-[11px]">
													<p>Birth: {format(new Date(birthDatetime), "MMM dd, HH:mm")}</p>
													<hr className="my-1" />
													{isIdealWindow && (
														<p className="text-green-600">Perfect! Within the 24-48h window.</p>
													)}
													{isTooEarly && (
														<p className="text-amber-600">
															Screening before 24h of life may result in false negatives.
														</p>
													)}
													{isLate && (
														<p className="text-red-600">
															Late screening. Ideal window is 24-48h of life.
														</p>
													)}
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									)}
								</div>
								<Input
									id="specimenCollectedAt"
									type="datetime-local"
									className={
										isTooEarly
											? "border-amber-400 focus-visible:ring-amber-500"
											: isLate
												? "border-red-400 focus-visible:ring-red-500"
												: ""
									}
									value={specimenCollectedAt}
									onChange={e => setSpecimenCollectedAt(e.target.value)}
								/>
								{isTooEarly && (
									<p className="text-[10px] font-medium text-amber-600">
										Warning: Collecting before 24 hours (Currently {hoursFromBirth}h).
									</p>
								)}
							</div>
							{existing && (
								<div className="space-y-1.5">
									<Label htmlFor="specimenSentAt">Date/Time Sent to Lab</Label>
									<Input
										id="specimenSentAt"
										type="datetime-local"
										value={specimenSentAt}
										onChange={e => setSpecimenSentAt(e.target.value)}
									/>
								</div>
							)}
						</div>
					</div>

					{/* Results entry (update only) */}
					{existing && (
						<div>
							<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
								Panel Results
							</p>
							<div className="grid gap-3 sm:grid-cols-2">
								{NBS_CONDITIONS.map(({ key, label, full }) => (
									<div key={key} className="space-y-1.5">
										<Label htmlFor={key} title={full}>
											{label} <span className="text-muted-foreground font-normal">({full})</span>
										</Label>
										<Select value={results[key]} onValueChange={v => updateResult(key, v ?? "")}>
											<SelectTrigger id={key}>
												<SelectValue>{results[key] || "—"}</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="negative">Negative</SelectItem>
												<SelectItem value="borderline">Borderline</SelectItem>
												<SelectItem value="positive">Positive</SelectItem>
											</SelectContent>
										</Select>
									</div>
								))}
								<div className="space-y-1.5 sm:col-span-2">
									<Label htmlFor="resultOverall">Overall Result</Label>
									<Select
										value={resultOverall}
										onValueChange={v =>
											setResultOverall(v as "normal" | "abnormal" | "borderline" | "")
										}
									>
										<SelectTrigger id="resultOverall">
											<SelectValue>{resultOverall || "—"}</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="normal">Normal</SelectItem>
											<SelectItem value="borderline">Borderline</SelectItem>
											<SelectItem value="abnormal">Abnormal</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="mt-4 grid gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="resultReceivedAt">Date/Time Results Received</Label>
									<Input
										id="resultReceivedAt"
										type="datetime-local"
										value={resultReceivedAt}
										onChange={e => setResultReceivedAt(e.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="screeningStatus">Status</Label>
									<Select value={status} onValueChange={v => setStatus(v as NbsStatus)}>
										<SelectTrigger id="screeningStatus">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="pending">Pending</SelectItem>
											<SelectItem value="collected">Collected</SelectItem>
											<SelectItem value="sent">Sent to Lab</SelectItem>
											<SelectItem value="resulted">Resulted</SelectItem>
											<SelectItem value="positive">Positive (Abnormal)</SelectItem>
											<SelectItem value="negative">Negative (Normal)</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					)}

					<div className="space-y-1.5">
						<Label htmlFor="notes">Notes (optional)</Label>
						<Textarea
							id="notes"
							rows={2}
							placeholder="Additional notes on specimen collection or results…"
							value={notes}
							onChange={e => setNotes(e.target.value)}
						/>
					</div>

					{isError && (
						<div className="text-destructive flex items-center gap-2 text-sm">
							<AlertCircle className="size-4 shrink-0" />
							<span>Failed to save. Please try again.</span>
						</div>
					)}
					{(createMutation.isSuccess || updateMutation.isSuccess) && (
						<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
							<CheckCircle className="size-4 shrink-0" />
							<span>Saved successfully.</span>
						</div>
					)}

					<div className="flex gap-2">
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving…" : "Save"}
						</Button>
					</div>
				</CardContent>
			</Card>
		</form>
	)
}
