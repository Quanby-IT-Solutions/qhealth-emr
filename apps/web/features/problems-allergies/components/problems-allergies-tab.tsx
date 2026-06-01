"use client"

import { useMemo, useState } from "react"
import {
	ArchiveX,
	BadgeCheck,
	Ban,
	CheckCircle2,
	MoreHorizontal,
	Pencil,
	Plus,
	RotateCcw,
	ShieldAlert,
} from "lucide-react"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import {
	useAllergiesQuery,
	useDeactivateAllergyMutation,
	useMarkProblemEnteredInErrorMutation,
	useProblemsQuery,
	useUpdateProblemMutation,
	useVerifyAllergyMutation,
	type AllergenType,
	type Allergy,
	type AllergySeverity,
	type Problem,
	type ProblemStatus,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

import { AddAllergyDialog } from "./add-allergy-dialog"
import { AddProblemDialog } from "./add-problem-dialog"
import { EditAllergyDialog } from "./edit-allergy-dialog"
import { EditProblemDialog } from "./edit-problem-dialog"
import { ResolveProblemDialog } from "./resolve-problem-dialog"

function formatDate(dateStr: string | null | undefined) {
	if (!dateStr) return "-"
	return new Date(dateStr).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function severityVariant(severity: AllergySeverity) {
	switch (severity) {
		case "severe":
			return "destructive" as const
		case "moderate":
			return "default" as const
		case "mild":
			return "secondary" as const
	}
}

function allergenTypeLabel(type: AllergenType) {
	switch (type) {
		case "medication":
			return "Medication"
		case "food":
			return "Food"
		case "environmental":
			return "Environmental"
	}
}

function problemStatusLabel(status: ProblemStatus) {
	switch (status) {
		case "active":
			return "Active"
		case "resolved":
			return "Resolved"
		case "entered_in_error":
			return "Entered in error"
	}
}

function problemStatusBadgeVariant(status: ProblemStatus) {
	switch (status) {
		case "active":
			return "default" as const
		case "resolved":
			return "secondary" as const
		case "entered_in_error":
			return "outline" as const
	}
}

const menuItemNeutralHover =
	"focus:bg-muted focus:text-foreground data-highlighted:bg-muted data-highlighted:text-foreground [&_svg]:text-muted-foreground focus:[&_svg]:text-muted-foreground data-highlighted:[&_svg]:text-muted-foreground"
const menuItemDestructiveNeutralHover =
	"focus:bg-muted data-highlighted:bg-muted [&_svg]:text-destructive focus:[&_svg]:text-destructive data-highlighted:[&_svg]:text-destructive"

type ProblemCodeFilter = "all" | "has_icd10" | "has_snomed" | "missing_icd10"
type ProblemOnsetFilter = "any" | "with_onset" | "last_30_days" | "custom"
type AllergySeverityFilter = "all" | AllergySeverity
type AllergyVerificationFilter = "all" | "verified" | "unverified"
type AllergyOnsetFilter = "any" | "with_onset" | "last_30_days" | "custom"

const problemCodeFilterLabels: Record<ProblemCodeFilter, string> = {
	all: "All codes",
	has_icd10: "Has ICD-10",
	has_snomed: "Has SNOMED",
	missing_icd10: "Missing ICD-10",
}

const problemOnsetFilterLabels: Record<ProblemOnsetFilter, string> = {
	any: "Any onset",
	with_onset: "With onset date",
	last_30_days: "Last 30 days",
	custom: "Custom range",
}
const allergenTypeFilterLabels: Record<AllergenType | "all", string> = {
	all: "All types",
	medication: "Medication",
	food: "Food",
	environmental: "Environmental",
}
const allergySeverityFilterLabels: Record<AllergySeverityFilter, string> = {
	all: "All severities",
	mild: "Mild",
	moderate: "Moderate",
	severe: "Severe",
}
const allergyVerificationFilterLabels: Record<AllergyVerificationFilter, string> = {
	all: "All verification",
	verified: "Verified",
	unverified: "Unverified",
}
const allergyOnsetFilterLabels: Record<AllergyOnsetFilter, string> = {
	any: "Any onset",
	with_onset: "With onset date",
	last_30_days: "Last 30 days",
	custom: "Custom range",
}
const filterFieldClassName = "flex min-w-0 flex-col gap-1"
const filterLabelClassName = "text-muted-foreground h-4 text-xs font-medium leading-4"
const filterControlClassName = "h-8 w-full rounded-full px-4"
const tableShellClassName = "hidden overflow-hidden rounded-lg border bg-background xl:block"
const tableHeaderRowClassName = "bg-muted/30 hover:bg-muted/30"
const tableHeadClassName = "text-muted-foreground h-10 px-4 text-xs font-semibold"
const tableCellClassName = "px-4 py-3 align-top"

function documentedByFilterLabel(value: string) {
	return value === "all" ? "All clinicians" : value
}

interface ProblemsAllergiesTabProps {
	patientId: string
	facilityId: string
	canWrite?: boolean
}

export function ProblemsAllergiesTab({
	patientId,
	facilityId,
	canWrite = false,
}: ProblemsAllergiesTabProps) {
	const [activeSection, setActiveSection] = useState<"problems" | "allergies">("problems")
	const [problemStatusFilter, setProblemStatusFilter] = useState<ProblemStatus>("active")
	const [problemSearch, setProblemSearch] = useState("")
	const [problemCodeFilter, setProblemCodeFilter] = useState<ProblemCodeFilter>("all")
	const [problemOnsetFilter, setProblemOnsetFilter] = useState<ProblemOnsetFilter>("any")
	const [problemOnsetStart, setProblemOnsetStart] = useState("")
	const [problemOnsetEnd, setProblemOnsetEnd] = useState("")
	const [problemDocumentedByFilter, setProblemDocumentedByFilter] = useState("all")
	const [allergenTypeFilter, setAllergenTypeFilter] = useState<AllergenType | "all">("all")
	const [allergySearch, setAllergySearch] = useState("")
	const [allergySeverityFilter, setAllergySeverityFilter] = useState<AllergySeverityFilter>("all")
	const [allergyVerificationFilter, setAllergyVerificationFilter] =
		useState<AllergyVerificationFilter>("all")
	const [allergyOnsetFilter, setAllergyOnsetFilter] = useState<AllergyOnsetFilter>("any")
	const [allergyOnsetStart, setAllergyOnsetStart] = useState("")
	const [allergyOnsetEnd, setAllergyOnsetEnd] = useState("")
	const [showAddProblem, setShowAddProblem] = useState(false)
	const [showAddAllergy, setShowAddAllergy] = useState(false)
	const [resolveProblemId, setResolveProblemId] = useState<string | null>(null)
	const [editingProblem, setEditingProblem] = useState<Problem | null>(null)
	const [editingAllergy, setEditingAllergy] = useState<Allergy | null>(null)
	const [problemToMarkEnteredInError, setProblemToMarkEnteredInError] = useState<Problem | null>(
		null
	)
	const [allergyToDeactivate, setAllergyToDeactivate] = useState<Allergy | null>(null)

	const { data: problemsData, isLoading: problemsLoading } = useProblemsQuery({
		patientId,
		status: problemStatusFilter,
	})
	const { data: allergiesData, isLoading: allergiesLoading } = useAllergiesQuery({
		patientId,
		isActive: true,
		allergenType: allergenTypeFilter === "all" ? undefined : allergenTypeFilter,
	})
	const updateProblem = useUpdateProblemMutation()
	const markProblemEnteredInError = useMarkProblemEnteredInErrorMutation()
	const deactivateAllergy = useDeactivateAllergyMutation()
	const verifyAllergy = useVerifyAllergyMutation()

	function reactivateProblem(problem: Problem) {
		updateProblem.mutate({
			id: problem.id,
			status: "active",
			resolutionDate: null,
		})
	}

	const problems = useMemo(() => problemsData?.data ?? [], [problemsData?.data])
	const documentedByOptions = useMemo(() => {
		const names = new Set<string>()
		for (const problem of problems) {
			const name = problem.documentingStaffName?.trim()
			if (name) names.add(name)
		}
		return Array.from(names).sort((a, b) => a.localeCompare(b))
	}, [problems])
	const filteredProblems = useMemo(() => {
		const search = problemSearch.trim().toLowerCase()
		const today = new Date()
		today.setHours(23, 59, 59, 999)
		const last30Days = new Date(today)
		last30Days.setDate(today.getDate() - 30)
		last30Days.setHours(0, 0, 0, 0)
		const customStart = problemOnsetStart ? new Date(`${problemOnsetStart}T00:00:00`) : null
		const customEnd = problemOnsetEnd ? new Date(`${problemOnsetEnd}T23:59:59`) : null

		return problems.filter(problem => {
			if (search) {
				const searchable = [
					problem.description,
					problem.icd10Code,
					problem.icd10Display,
					problem.snomedCode,
					problem.snomedDisplay,
					problem.documentingStaffName,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
				if (!searchable.includes(search)) return false
			}

			if (problemCodeFilter === "has_icd10" && !problem.icd10Code) return false
			if (problemCodeFilter === "has_snomed" && !problem.snomedCode) return false
			if (problemCodeFilter === "missing_icd10" && problem.icd10Code) return false

			if (
				problemDocumentedByFilter !== "all" &&
				problem.documentingStaffName !== problemDocumentedByFilter
			) {
				return false
			}

			if (problemOnsetFilter === "any") return true
			if (!problem.onsetDate) return false

			const onset = new Date(`${problem.onsetDate}T00:00:00`)
			if (Number.isNaN(onset.getTime())) return false
			if (problemOnsetFilter === "with_onset") return true
			if (problemOnsetFilter === "last_30_days") return onset >= last30Days && onset <= today
			if (problemOnsetFilter === "custom") {
				if (customStart && onset < customStart) return false
				if (customEnd && onset > customEnd) return false
			}
			return true
		})
	}, [
		problems,
		problemCodeFilter,
		problemDocumentedByFilter,
		problemOnsetEnd,
		problemOnsetFilter,
		problemOnsetStart,
		problemSearch,
	])
	const hasProblemFilters =
		problemStatusFilter !== "active" ||
		Boolean(problemSearch.trim()) ||
		problemCodeFilter !== "all" ||
		problemOnsetFilter !== "any" ||
		problemDocumentedByFilter !== "all"

	function clearProblemFilters() {
		setProblemStatusFilter("active")
		setProblemSearch("")
		setProblemCodeFilter("all")
		setProblemOnsetFilter("any")
		setProblemOnsetStart("")
		setProblemOnsetEnd("")
		setProblemDocumentedByFilter("all")
	}

	const allergies = useMemo(() => allergiesData?.data ?? [], [allergiesData?.data])
	const filteredAllergies = useMemo(() => {
		const search = allergySearch.trim().toLowerCase()
		const today = new Date()
		today.setHours(23, 59, 59, 999)
		const last30Days = new Date(today)
		last30Days.setDate(today.getDate() - 30)
		last30Days.setHours(0, 0, 0, 0)
		const customStart = allergyOnsetStart ? new Date(`${allergyOnsetStart}T00:00:00`) : null
		const customEnd = allergyOnsetEnd ? new Date(`${allergyOnsetEnd}T23:59:59`) : null

		return allergies.filter(allergy => {
			if (search) {
				const searchable = [
					allergy.allergenName,
					allergenTypeLabel(allergy.allergenType),
					allergy.reactionType,
					allergy.severity,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
				if (!searchable.includes(search)) return false
			}

			if (allergySeverityFilter !== "all" && allergy.severity !== allergySeverityFilter) {
				return false
			}
			if (allergyVerificationFilter === "verified" && !allergy.isVerified) return false
			if (allergyVerificationFilter === "unverified" && allergy.isVerified) return false

			if (allergyOnsetFilter === "any") return true
			if (!allergy.onsetDate) return false

			const onset = new Date(`${allergy.onsetDate}T00:00:00`)
			if (Number.isNaN(onset.getTime())) return false
			if (allergyOnsetFilter === "with_onset") return true
			if (allergyOnsetFilter === "last_30_days") return onset >= last30Days && onset <= today
			if (allergyOnsetFilter === "custom") {
				if (customStart && onset < customStart) return false
				if (customEnd && onset > customEnd) return false
			}
			return true
		})
	}, [
		allergies,
		allergyOnsetEnd,
		allergyOnsetFilter,
		allergyOnsetStart,
		allergySearch,
		allergySeverityFilter,
		allergyVerificationFilter,
	])
	const hasAllergyFilters =
		allergenTypeFilter !== "all" ||
		Boolean(allergySearch.trim()) ||
		allergySeverityFilter !== "all" ||
		allergyVerificationFilter !== "all" ||
		allergyOnsetFilter !== "any"

	function clearAllergyFilters() {
		setAllergenTypeFilter("all")
		setAllergySearch("")
		setAllergySeverityFilter("all")
		setAllergyVerificationFilter("all")
		setAllergyOnsetFilter("any")
		setAllergyOnsetStart("")
		setAllergyOnsetEnd("")
	}

	function renderProblemActions(problem: Problem, compact = false) {
		if (!canWrite) return null

		if (problem.status === "entered_in_error") {
			return (
				<div
					className={
						compact ? "text-muted-foreground text-sm" : "text-muted-foreground text-right text-sm"
					}
				>
					Audit only
				</div>
			)
		}

		if (!compact) {
			return (
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									type="button"
									size="icon"
									variant="ghost"
									className="size-8"
									aria-label="More problem actions"
								/>
							}
						>
							<MoreHorizontal className="size-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-44">
							<DropdownMenuItem
								className={menuItemNeutralHover}
								onClick={() => setEditingProblem(problem)}
							>
								<Pencil className="size-4" />
								Edit
							</DropdownMenuItem>
							{problem.status === "active" ? (
								<DropdownMenuItem
									className={menuItemNeutralHover}
									onClick={() => setResolveProblemId(problem.id)}
								>
									<CheckCircle2 className="size-4" />
									Resolve
								</DropdownMenuItem>
							) : problem.status === "resolved" ? (
								<DropdownMenuItem
									className={menuItemNeutralHover}
									onClick={() => reactivateProblem(problem)}
									disabled={updateProblem.isPending}
								>
									<RotateCcw className="size-4" />
									Reactivate
								</DropdownMenuItem>
							) : null}
							<DropdownMenuItem
								variant="destructive"
								className={menuItemDestructiveNeutralHover}
								onClick={() => setProblemToMarkEnteredInError(problem)}
							>
								<ArchiveX className="size-4" />
								Entered in Error
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)
		}

		return (
			<div className={compact ? "grid grid-cols-2 gap-2" : "flex flex-wrap justify-end gap-2"}>
				<Button
					size="sm"
					variant="outline"
					className={compact ? "justify-center" : ""}
					onClick={() => setEditingProblem(problem)}
				>
					<Pencil className="size-4" />
					Edit
				</Button>
				{problem.status === "active" ? (
					<Button
						size="sm"
						variant="outline"
						className={compact ? "justify-center" : ""}
						onClick={() => setResolveProblemId(problem.id)}
					>
						<CheckCircle2 className="size-4" />
						Resolve
					</Button>
				) : problem.status === "resolved" ? (
					<Button
						size="sm"
						variant="outline"
						className={compact ? "justify-center" : ""}
						onClick={() => reactivateProblem(problem)}
						disabled={updateProblem.isPending}
					>
						<RotateCcw className="size-4" />
						Reactivate
					</Button>
				) : null}
				<Button
					size="sm"
					variant="outline"
					className={compact ? "col-span-2 justify-center" : ""}
					onClick={() => setProblemToMarkEnteredInError(problem)}
				>
					<ArchiveX className="size-4" />
					Entered in Error
				</Button>
			</div>
		)
	}

	function renderAllergyActions(allergy: Allergy, compact = false) {
		if (!canWrite) return null

		if (!compact) {
			return (
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									type="button"
									size="icon"
									variant="ghost"
									className="size-8"
									aria-label="More allergy actions"
								/>
							}
						>
							<MoreHorizontal className="size-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-40">
							<DropdownMenuItem
								className={menuItemNeutralHover}
								onClick={() => setEditingAllergy(allergy)}
							>
								<Pencil className="size-4" />
								Edit
							</DropdownMenuItem>
							{!allergy.isVerified && (
								<DropdownMenuItem
									className={menuItemNeutralHover}
									onClick={() => verifyAllergy.mutate(allergy.id)}
									disabled={verifyAllergy.isPending}
								>
									<BadgeCheck className="size-4" />
									Verify
								</DropdownMenuItem>
							)}
							<DropdownMenuItem
								variant="destructive"
								className={menuItemDestructiveNeutralHover}
								onClick={() => setAllergyToDeactivate(allergy)}
							>
								<Ban className="size-4" />
								Deactivate
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)
		}

		return (
			<div className={compact ? "grid grid-cols-2 gap-2" : "flex flex-wrap justify-end gap-2"}>
				<Button
					size="sm"
					variant="outline"
					className={compact ? "justify-center" : ""}
					onClick={() => setEditingAllergy(allergy)}
				>
					<Pencil className="size-4" />
					Edit
				</Button>
				{!allergy.isVerified && (
					<Button
						size="sm"
						variant="outline"
						className={compact ? "justify-center" : ""}
						onClick={() => verifyAllergy.mutate(allergy.id)}
						disabled={verifyAllergy.isPending}
					>
						<BadgeCheck className="size-4" />
						Verify
					</Button>
				)}
				<Button
					size="sm"
					variant="outline"
					className={compact ? "col-span-2 justify-center" : ""}
					onClick={() => setAllergyToDeactivate(allergy)}
				>
					<Ban className="size-4" />
					Deactivate
				</Button>
			</div>
		)
	}

	function renderVerificationBadge(allergy: Allergy) {
		if (allergy.isVerified) {
			return (
				<Badge
					variant="outline"
					className="max-w-full gap-1 truncate border-emerald-400 whitespace-nowrap text-emerald-700 dark:text-emerald-400"
					title={
						allergy.verifiedByStaffName ? `Verified by ${allergy.verifiedByStaffName}` : "Verified"
					}
				>
					<BadgeCheck className="size-3" />
					Verified
				</Badge>
			)
		}
		return (
			<Badge
				variant="outline"
				className="max-w-full gap-1 truncate border-amber-400 whitespace-nowrap text-amber-700 dark:text-amber-400"
				title="Awaiting physician verification — does not block medication orders"
			>
				<ShieldAlert className="size-3" />
				Unverified
			</Badge>
		)
	}

	return (
		<div className="min-w-0">
			<Tabs
				value={activeSection}
				onValueChange={value => setActiveSection(value as "problems" | "allergies")}
				className="min-w-0 gap-4"
			>
				<div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
					<div className="hidden sm:block" />
					<TabsList className="grid h-auto w-full grid-cols-2 sm:w-[420px]">
						<TabsTrigger value="problems" className="px-6 py-1.5">
							Problems
						</TabsTrigger>
						<TabsTrigger value="allergies" className="px-6 py-1.5">
							Allergies
						</TabsTrigger>
					</TabsList>
					{allergiesData?.data.some(allergy => allergy.severity === "severe") ? (
						<div className="flex justify-center sm:justify-end">
							<Badge variant="destructive" className="w-fit">
								Severe allergy documented
							</Badge>
						</div>
					) : null}
				</div>

				<TabsContent value="problems" className="min-w-0">
					<Card className="min-w-0 overflow-hidden">
						<CardHeader className="gap-4">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<CardTitle>Problem List</CardTitle>
									<p className="text-muted-foreground text-sm">
										{hasProblemFilters
											? `${filteredProblems.length} of ${problemsData?.total ?? 0}`
											: (problemsData?.total ?? 0)}{" "}
										{problemStatusLabel(problemStatusFilter).toLowerCase()} problems
									</p>
								</div>
								{canWrite && (
									<Button size="sm" onClick={() => setShowAddProblem(true)}>
										<Plus className="size-4" />
										Add Problem
									</Button>
								)}
							</div>
							<div className="bg-muted/25 rounded-lg border px-4 py-5">
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(220px,1.4fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(170px,1fr)_auto] xl:items-start">
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Search</label>
										<Input
											value={problemSearch}
											onChange={event => setProblemSearch(event.target.value)}
											placeholder="Problem, ICD-10, SNOMED, clinician"
											aria-label="Search problems"
											className={filterControlClassName}
										/>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Status</label>
										<Select
											value={problemStatusFilter}
											onValueChange={value => setProblemStatusFilter(value as ProblemStatus)}
										>
											<SelectTrigger
												aria-label="Filter problem status"
												className={filterControlClassName}
											>
												<SelectValue>{problemStatusLabel(problemStatusFilter)}</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="active">Active</SelectItem>
												<SelectItem value="resolved">Resolved</SelectItem>
												<SelectItem value="entered_in_error">Entered in Error</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Code Type</label>
										<Select
											value={problemCodeFilter}
											onValueChange={value => setProblemCodeFilter(value as ProblemCodeFilter)}
										>
											<SelectTrigger
												aria-label="Filter problem codes"
												className={filterControlClassName}
											>
												<SelectValue>{problemCodeFilterLabels[problemCodeFilter]}</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All codes</SelectItem>
												<SelectItem value="has_icd10">Has ICD-10</SelectItem>
												<SelectItem value="has_snomed">Has SNOMED</SelectItem>
												<SelectItem value="missing_icd10">Missing ICD-10</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Onset</label>
										<Select
											value={problemOnsetFilter}
											onValueChange={value => setProblemOnsetFilter(value as ProblemOnsetFilter)}
										>
											<SelectTrigger
												aria-label="Filter problem onset date"
												className={filterControlClassName}
											>
												<SelectValue>{problemOnsetFilterLabels[problemOnsetFilter]}</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="any">Any onset</SelectItem>
												<SelectItem value="with_onset">With onset date</SelectItem>
												<SelectItem value="last_30_days">Last 30 days</SelectItem>
												<SelectItem value="custom">Custom range</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Documented By</label>
										<Select
											value={problemDocumentedByFilter}
											onValueChange={setProblemDocumentedByFilter}
										>
											<SelectTrigger
												aria-label="Filter documented by"
												className={filterControlClassName}
											>
												<SelectValue>
													{documentedByFilterLabel(problemDocumentedByFilter)}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All clinicians</SelectItem>
												{documentedByOptions.map(name => (
													<SelectItem key={name} value={name}>
														{name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={`${filterLabelClassName} invisible`} aria-hidden="true">
											Actions
										</label>
										<Button
											type="button"
											variant="outline"
											onClick={clearProblemFilters}
											disabled={!hasProblemFilters}
											className="h-8 w-full rounded-full px-5 sm:w-fit"
										>
											Clear
										</Button>
									</div>
								</div>
								{problemOnsetFilter === "custom" && (
									<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:w-[520px]">
										<div className={filterFieldClassName}>
											<label className={filterLabelClassName}>Onset From</label>
											<Input
												type="date"
												value={problemOnsetStart}
												onChange={event => setProblemOnsetStart(event.target.value)}
												aria-label="Problem onset start date"
												className={filterControlClassName}
											/>
										</div>
										<div className={filterFieldClassName}>
											<label className={filterLabelClassName}>Onset To</label>
											<Input
												type="date"
												value={problemOnsetEnd}
												onChange={event => setProblemOnsetEnd(event.target.value)}
												aria-label="Problem onset end date"
												className={filterControlClassName}
											/>
										</div>
									</div>
								)}
							</div>
						</CardHeader>
						<CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
							{problemsLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									Loading problems...
								</div>
							) : filteredProblems.length ? (
								<>
									<div className="divide-y rounded-md border xl:hidden">
										{filteredProblems.map(problem => (
											<div key={problem.id} className="space-y-3 p-4">
												<div className="flex min-w-0 items-start justify-between gap-3">
													<div className="min-w-0">
														<p className="font-medium break-words">{problem.description}</p>
														<p className="text-muted-foreground mt-1 text-xs">
															Onset {formatDate(problem.onsetDate)}
														</p>
													</div>
													<Badge variant={problemStatusBadgeVariant(problem.status)}>
														{problemStatusLabel(problem.status)}
													</Badge>
												</div>
												<div className="grid gap-3 text-sm sm:grid-cols-2">
													<div className="min-w-0">
														<p className="text-muted-foreground text-xs">Codes</p>
														<div className="space-y-1 text-xs break-words">
															{problem.icd10Code || problem.snomedCode ? (
																<>
																	{problem.icd10Code && (
																		<div title={problem.icd10Display ?? undefined}>
																			<span className="font-mono font-medium">
																				{problem.icd10Code}
																			</span>
																			<span className="text-muted-foreground"> ICD-10</span>
																		</div>
																	)}
																	{problem.snomedCode && (
																		<div title={problem.snomedDisplay ?? undefined}>
																			<span className="font-mono font-medium">
																				{problem.snomedCode}
																			</span>
																			<span className="text-muted-foreground"> SNOMED</span>
																		</div>
																	)}
																</>
															) : (
																"-"
															)}
														</div>
													</div>
													<div className="min-w-0">
														<p className="text-muted-foreground text-xs">Documented By</p>
														<p className="break-words">{problem.documentingStaffName ?? "-"}</p>
														<p className="text-muted-foreground text-xs">
															{formatDate(problem.createdAt)}
														</p>
													</div>
												</div>
												{problem.resolutionDate && (
													<p className="text-muted-foreground text-xs">
														Resolved {formatDate(problem.resolutionDate)}
													</p>
												)}
												{renderProblemActions(problem, true)}
											</div>
										))}
									</div>

									<div className={tableShellClassName}>
										<Table className="table-fixed">
											<colgroup>
												<col className="w-[30%]" />
												<col className="w-[16%]" />
												<col className="w-[10%]" />
												<col className="w-[12%]" />
												<col className="w-[14%]" />
												<col className="w-[10%]" />
												<col className="w-[8%]" />
											</colgroup>
											<TableHeader>
												<TableRow className={tableHeaderRowClassName}>
													<TableHead className={tableHeadClassName}>Problem</TableHead>
													<TableHead className={tableHeadClassName}>Codes</TableHead>
													<TableHead className={tableHeadClassName}>Onset</TableHead>
													<TableHead className={tableHeadClassName}>Status</TableHead>
													<TableHead className={tableHeadClassName}>Documented By</TableHead>
													<TableHead className={tableHeadClassName}>Date</TableHead>
													<TableHead className={`${tableHeadClassName} text-right`}>
														Actions
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredProblems.map(problem => (
													<TableRow key={problem.id} className="hover:bg-muted/30">
														<TableCell
															className={`${tableCellClassName} overflow-hidden font-medium`}
														>
															<div className="leading-5 break-words">{problem.description}</div>
															{problem.resolutionDate && (
																<div className="text-muted-foreground mt-1 text-xs">
																	Resolved {formatDate(problem.resolutionDate)}
																</div>
															)}
														</TableCell>
														<TableCell
															className={`${tableCellClassName} space-y-1.5 overflow-hidden text-xs`}
														>
															{problem.icd10Code && (
																<div
																	className="break-words"
																	title={problem.icd10Display ?? undefined}
																>
																	<span className="font-mono text-[11px] font-semibold">
																		{problem.icd10Code}
																	</span>
																	<span className="text-muted-foreground"> ICD-10</span>
																</div>
															)}
															{problem.snomedCode && (
																<div
																	className="break-words"
																	title={problem.snomedDisplay ?? undefined}
																>
																	<span className="font-mono text-[11px] font-semibold">
																		{problem.snomedCode}
																	</span>
																	<span className="text-muted-foreground"> SNOMED</span>
																</div>
															)}
														</TableCell>
														<TableCell
															className={`${tableCellClassName} text-muted-foreground overflow-hidden text-sm`}
														>
															{formatDate(problem.onsetDate)}
														</TableCell>
														<TableCell className={`${tableCellClassName} overflow-hidden`}>
															<Badge
																variant={problemStatusBadgeVariant(problem.status)}
																className="max-w-full truncate px-2 py-0 text-xs whitespace-nowrap"
															>
																{problemStatusLabel(problem.status)}
															</Badge>
														</TableCell>
														<TableCell className={`${tableCellClassName} overflow-hidden text-sm`}>
															<p
																className="truncate"
																title={problem.documentingStaffName ?? undefined}
															>
																{problem.documentingStaffName ?? "-"}
															</p>
														</TableCell>
														<TableCell className={`${tableCellClassName} overflow-hidden text-sm`}>
															<p
																className="text-muted-foreground truncate"
																title={formatDate(problem.createdAt)}
															>
																{formatDate(problem.createdAt)}
															</p>
														</TableCell>
														<TableCell className={`${tableCellClassName} pt-2.5`}>
															{renderProblemActions(problem)}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</>
							) : (
								<div className="text-muted-foreground py-8 text-center text-sm">
									{hasProblemFilters
										? "No problems match the selected filters."
										: `No ${problemStatusLabel(problemStatusFilter).toLowerCase()} problems recorded.`}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="allergies" className="min-w-0">
					<Card className="min-w-0 overflow-hidden">
						<CardHeader className="gap-4">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<CardTitle>Allergies</CardTitle>
									<p className="text-muted-foreground text-sm">
										{hasAllergyFilters
											? `${filteredAllergies.length} of ${allergiesData?.total ?? 0}`
											: (allergiesData?.total ?? 0)}{" "}
										active allergies
									</p>
								</div>
								{canWrite && (
									<Button size="sm" onClick={() => setShowAddAllergy(true)}>
										<Plus className="size-4" />
										Add Allergy
									</Button>
								)}
							</div>
							<div className="bg-muted/25 rounded-lg border px-4 py-5">
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(260px,1.5fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(160px,0.9fr)_minmax(150px,0.8fr)_auto] xl:items-start">
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Search</label>
										<Input
											value={allergySearch}
											onChange={event => setAllergySearch(event.target.value)}
											placeholder="Allergen, reaction, type, severity"
											aria-label="Search allergies"
											className={filterControlClassName}
										/>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Type</label>
										<Select
											value={allergenTypeFilter}
											onValueChange={value => setAllergenTypeFilter(value as AllergenType | "all")}
										>
											<SelectTrigger
												aria-label="Filter allergen type"
												className={filterControlClassName}
											>
												<SelectValue>{allergenTypeFilterLabels[allergenTypeFilter]}</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All types</SelectItem>
												<SelectItem value="medication">Medication</SelectItem>
												<SelectItem value="food">Food</SelectItem>
												<SelectItem value="environmental">Environmental</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Severity</label>
										<Select
											value={allergySeverityFilter}
											onValueChange={value =>
												setAllergySeverityFilter(value as AllergySeverityFilter)
											}
										>
											<SelectTrigger
												aria-label="Filter allergy severity"
												className={filterControlClassName}
											>
												<SelectValue>
													{allergySeverityFilterLabels[allergySeverityFilter]}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All severities</SelectItem>
												<SelectItem value="mild">Mild</SelectItem>
												<SelectItem value="moderate">Moderate</SelectItem>
												<SelectItem value="severe">Severe</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Verification</label>
										<Select
											value={allergyVerificationFilter}
											onValueChange={value =>
												setAllergyVerificationFilter(value as AllergyVerificationFilter)
											}
										>
											<SelectTrigger
												aria-label="Filter allergy verification"
												className={filterControlClassName}
											>
												<SelectValue>
													{allergyVerificationFilterLabels[allergyVerificationFilter]}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All verification</SelectItem>
												<SelectItem value="verified">Verified</SelectItem>
												<SelectItem value="unverified">Unverified</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={filterLabelClassName}>Onset</label>
										<Select
											value={allergyOnsetFilter}
											onValueChange={value => setAllergyOnsetFilter(value as AllergyOnsetFilter)}
										>
											<SelectTrigger
												aria-label="Filter allergy onset date"
												className={filterControlClassName}
											>
												<SelectValue>{allergyOnsetFilterLabels[allergyOnsetFilter]}</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="any">Any onset</SelectItem>
												<SelectItem value="with_onset">With onset date</SelectItem>
												<SelectItem value="last_30_days">Last 30 days</SelectItem>
												<SelectItem value="custom">Custom range</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className={filterFieldClassName}>
										<label className={`${filterLabelClassName} invisible`} aria-hidden="true">
											Actions
										</label>
										<Button
											type="button"
											variant="outline"
											onClick={clearAllergyFilters}
											disabled={!hasAllergyFilters}
											className="h-8 w-full rounded-full px-5 sm:w-fit"
										>
											Clear
										</Button>
									</div>
								</div>
								{allergyOnsetFilter === "custom" && (
									<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:w-[520px]">
										<div className={filterFieldClassName}>
											<label className={filterLabelClassName}>Onset From</label>
											<Input
												type="date"
												value={allergyOnsetStart}
												onChange={event => setAllergyOnsetStart(event.target.value)}
												aria-label="Allergy onset start date"
												className={filterControlClassName}
											/>
										</div>
										<div className={filterFieldClassName}>
											<label className={filterLabelClassName}>Onset To</label>
											<Input
												type="date"
												value={allergyOnsetEnd}
												onChange={event => setAllergyOnsetEnd(event.target.value)}
												aria-label="Allergy onset end date"
												className={filterControlClassName}
											/>
										</div>
									</div>
								)}
							</div>
						</CardHeader>
						<CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
							{allergiesLoading ? (
								<div className="text-muted-foreground py-8 text-center text-sm">
									Loading allergies...
								</div>
							) : filteredAllergies.length ? (
								<>
									{filteredAllergies.some(a => !a.isVerified) && (
										<p
											className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
											role="note"
										>
											Unverified allergies are visible in the chart but do not block medication
											orders. Verify each entry before relying on CDS for hard stops.
										</p>
									)}
									<div className="divide-y rounded-md border xl:hidden">
										{filteredAllergies.map(allergy => (
											<div key={allergy.id} className="space-y-3 p-4">
												<div className="flex min-w-0 items-start justify-between gap-3">
													<div className="min-w-0">
														<p className="font-medium break-words">{allergy.allergenName}</p>
														<p className="text-muted-foreground mt-1 text-xs">
															{allergenTypeLabel(allergy.allergenType)} · Onset{" "}
															{formatDate(allergy.onsetDate)}
														</p>
													</div>
													<div className="flex shrink-0 flex-col items-end gap-1">
														<Badge variant={severityVariant(allergy.severity)}>
															{allergy.severity}
														</Badge>
														{renderVerificationBadge(allergy)}
													</div>
												</div>
												<div className="min-w-0 text-sm">
													<p className="text-muted-foreground text-xs">Reaction</p>
													<p className="break-words">{allergy.reactionType ?? "-"}</p>
												</div>
												{renderAllergyActions(allergy, true)}
											</div>
										))}
									</div>

									<div className={tableShellClassName}>
										<Table className="table-fixed">
											<colgroup>
												<col className="w-[27%]" />
												<col className="w-[22%]" />
												<col className="w-[25%]" />
												<col className="w-[16%]" />
												<col className="w-[10%]" />
											</colgroup>
											<TableHeader>
												<TableRow className={tableHeaderRowClassName}>
													<TableHead className={tableHeadClassName}>Allergen</TableHead>
													<TableHead className={tableHeadClassName}>Reaction</TableHead>
													<TableHead className={tableHeadClassName}>Safety</TableHead>
													<TableHead className={tableHeadClassName}>Onset</TableHead>
													<TableHead className={`${tableHeadClassName} text-right`}>
														Actions
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredAllergies.map(allergy => (
													<TableRow
														key={allergy.id}
														className={`hover:bg-muted/30 ${
															allergy.severity === "severe"
																? "border-l-destructive/70 bg-destructive/5 border-l-2"
																: ""
														}`}
													>
														<TableCell
															className={`${tableCellClassName} overflow-hidden font-medium`}
														>
															<div className="leading-5 break-words">{allergy.allergenName}</div>
															<div className="text-muted-foreground mt-1 text-xs">
																{allergenTypeLabel(allergy.allergenType)}
															</div>
														</TableCell>
														<TableCell className={`${tableCellClassName} overflow-hidden text-sm`}>
															<span className="break-words">{allergy.reactionType ?? "-"}</span>
														</TableCell>
														<TableCell className={`${tableCellClassName} overflow-hidden`}>
															<div className="flex flex-wrap items-center gap-2">
																<Badge
																	variant={severityVariant(allergy.severity)}
																	className="max-w-full truncate whitespace-nowrap"
																>
																	{allergy.severity}
																</Badge>
																{renderVerificationBadge(allergy)}
															</div>
														</TableCell>
														<TableCell
															className={`${tableCellClassName} text-muted-foreground overflow-hidden text-sm`}
														>
															{formatDate(allergy.onsetDate)}
														</TableCell>
														<TableCell className={`${tableCellClassName} pt-2.5`}>
															{renderAllergyActions(allergy)}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</>
							) : (
								<div className="text-muted-foreground py-8 text-center text-sm">
									{hasAllergyFilters
										? "No allergies match the selected filters."
										: "No active allergies documented."}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<AddProblemDialog
				open={showAddProblem}
				onOpenChange={setShowAddProblem}
				patientId={patientId}
				facilityId={facilityId}
			/>
			<EditProblemDialog
				open={!!editingProblem}
				onOpenChange={open => {
					if (!open) setEditingProblem(null)
				}}
				problem={editingProblem}
			/>
			<AddAllergyDialog
				open={showAddAllergy}
				onOpenChange={setShowAddAllergy}
				patientId={patientId}
				facilityId={facilityId}
			/>
			<EditAllergyDialog
				open={!!editingAllergy}
				onOpenChange={open => {
					if (!open) setEditingAllergy(null)
				}}
				allergy={editingAllergy}
				facilityId={facilityId}
			/>
			{resolveProblemId && (
				<ResolveProblemDialog
					open={!!resolveProblemId}
					onOpenChange={open => {
						if (!open) setResolveProblemId(null)
					}}
					problemId={resolveProblemId}
				/>
			)}

			<AlertDialog
				open={!!problemToMarkEnteredInError}
				onOpenChange={open => {
					if (!open) setProblemToMarkEnteredInError(null)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Mark problem as entered in error?</AlertDialogTitle>
						<AlertDialogDescription>
							This hides {problemToMarkEnteredInError?.description} from active and resolved
							clinical lists while keeping the audited record.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (!problemToMarkEnteredInError) return
								markProblemEnteredInError.mutate(problemToMarkEnteredInError.id, {
									onSuccess: () => setProblemToMarkEnteredInError(null),
								})
							}}
						>
							Mark Entered in Error
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={!!allergyToDeactivate}
				onOpenChange={open => {
					if (!open) setAllergyToDeactivate(null)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate allergy?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes {allergyToDeactivate?.allergenName} from active CDS allergy checks.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (!allergyToDeactivate) return
								deactivateAllergy.mutate(allergyToDeactivate.id, {
									onSuccess: () => setAllergyToDeactivate(null),
								})
							}}
						>
							Deactivate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
