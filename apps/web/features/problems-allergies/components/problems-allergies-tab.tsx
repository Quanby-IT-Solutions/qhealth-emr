"use client"

import { useState } from "react"
import {
	ArchiveX,
	Ban,
	BadgeCheck,
	CheckCircle2,
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
	const [allergenTypeFilter, setAllergenTypeFilter] = useState<AllergenType | "all">("all")
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

	function renderProblemActions(problem: Problem, compact = false) {
		if (!canWrite) return null

		if (problem.status === "entered_in_error") {
			return (
				<div
					className={
						compact
							? "text-muted-foreground text-sm"
							: "text-muted-foreground text-right text-sm"
					}
				>
					Audit only
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
						variant="default"
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
					className="gap-1 border-emerald-400 text-emerald-700 dark:text-emerald-400"
					title={
						allergy.verifiedByStaffName
							? `Verified by ${allergy.verifiedByStaffName}`
							: "Verified"
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
				className="gap-1 border-amber-400 text-amber-700 dark:text-amber-400"
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
								{problemsData?.total ?? 0} {problemStatusLabel(problemStatusFilter).toLowerCase()}{" "}
								problems
							</p>
						</div>
						{canWrite && (
							<Button size="sm" onClick={() => setShowAddProblem(true)}>
								<Plus className="size-4" />
								Add Problem
							</Button>
						)}
					</div>
					<Tabs
						value={problemStatusFilter}
						onValueChange={value => setProblemStatusFilter(value as ProblemStatus)}
					>
						<TabsList>
							<TabsTrigger value="active">Active</TabsTrigger>
							<TabsTrigger value="resolved">Resolved</TabsTrigger>
							<TabsTrigger value="entered_in_error">Entered in Error</TabsTrigger>
						</TabsList>
					</Tabs>
				</CardHeader>
				<CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
					{problemsLoading ? (
						<div className="text-muted-foreground py-8 text-center text-sm">
							Loading problems...
						</div>
					) : problemsData?.data.length ? (
						<>
							<div className="divide-y rounded-md border lg:hidden">
								{problemsData.data.map(problem => (
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
																	<span className="font-mono font-medium">{problem.icd10Code}</span>
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

							<div className="hidden rounded-md border lg:block">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Problem</TableHead>
											<TableHead>Codes</TableHead>
											<TableHead>Onset</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Documented By</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{problemsData.data.map(problem => (
											<TableRow key={problem.id}>
												<TableCell className="max-w-80 min-w-56 font-medium whitespace-normal">
													<div className="break-words">{problem.description}</div>
													{problem.resolutionDate && (
														<div className="text-muted-foreground mt-1 text-xs">
															Resolved {formatDate(problem.resolutionDate)}
														</div>
													)}
												</TableCell>
												<TableCell className="min-w-40 space-y-1 text-xs whitespace-normal">
													{problem.icd10Code && (
														<div className="break-words" title={problem.icd10Display ?? undefined}>
															<span className="font-mono font-medium">{problem.icd10Code}</span>
															<span className="text-muted-foreground"> ICD-10</span>
														</div>
													)}
													{problem.snomedCode && (
														<div className="break-words" title={problem.snomedDisplay ?? undefined}>
															<span className="font-mono font-medium">{problem.snomedCode}</span>
															<span className="text-muted-foreground"> SNOMED</span>
														</div>
													)}
												</TableCell>
												<TableCell>{formatDate(problem.onsetDate)}</TableCell>
												<TableCell>
													<Badge variant={problemStatusBadgeVariant(problem.status)}>
														{problemStatusLabel(problem.status)}
													</Badge>
												</TableCell>
												<TableCell className="text-muted-foreground max-w-48 text-sm whitespace-normal">
													<span className="break-words">{problem.documentingStaffName ?? "-"}</span>
												</TableCell>
												<TableCell className="min-w-48">{renderProblemActions(problem)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</>
					) : (
						<div className="text-muted-foreground py-8 text-center text-sm">
							No {problemStatusLabel(problemStatusFilter).toLowerCase()} problems recorded.
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
								{allergiesData?.total ?? 0} active allergies
							</p>
						</div>
						{canWrite && (
							<Button size="sm" onClick={() => setShowAddAllergy(true)}>
								<Plus className="size-4" />
								Add Allergy
							</Button>
						)}
					</div>
					<Select
						value={allergenTypeFilter}
						onValueChange={value => setAllergenTypeFilter(value as AllergenType | "all")}
					>
						<SelectTrigger className="w-full sm:w-56">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All types</SelectItem>
							<SelectItem value="medication">Medication</SelectItem>
							<SelectItem value="food">Food</SelectItem>
							<SelectItem value="environmental">Environmental</SelectItem>
						</SelectContent>
					</Select>
				</CardHeader>
				<CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
					{allergiesLoading ? (
						<div className="text-muted-foreground py-8 text-center text-sm">
							Loading allergies...
						</div>
					) : allergiesData?.data.length ? (
						<>
							{allergiesData.data.some(a => !a.isVerified) && (
								<p
									className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
									role="note"
								>
									Unverified allergies are visible in the chart but do not block medication orders.
									Verify each entry before relying on CDS for hard stops.
								</p>
							)}
							<div className="divide-y rounded-md border lg:hidden">
								{allergiesData.data.map(allergy => (
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
												<Badge variant={severityVariant(allergy.severity)}>{allergy.severity}</Badge>
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

							<div className="hidden rounded-md border lg:block">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Allergen</TableHead>
											<TableHead>Type</TableHead>
											<TableHead>Reaction</TableHead>
											<TableHead>Severity</TableHead>
											<TableHead>Verification</TableHead>
											<TableHead>Onset</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{allergiesData.data.map(allergy => (
											<TableRow key={allergy.id}>
												<TableCell className="max-w-48 font-medium whitespace-normal">
													<span className="break-words">{allergy.allergenName}</span>
												</TableCell>
												<TableCell className="text-sm whitespace-normal">
													{allergenTypeLabel(allergy.allergenType)}
												</TableCell>
												<TableCell className="max-w-48 text-sm whitespace-normal">
													<span className="break-words">{allergy.reactionType ?? "-"}</span>
												</TableCell>
												<TableCell>
													<Badge variant={severityVariant(allergy.severity)}>
														{allergy.severity}
													</Badge>
												</TableCell>
												<TableCell>{renderVerificationBadge(allergy)}</TableCell>
												<TableCell>{formatDate(allergy.onsetDate)}</TableCell>
												<TableCell className="min-w-40">{renderAllergyActions(allergy)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</>
					) : (
						<div className="text-muted-foreground py-8 text-center text-sm">
							No active allergies documented.
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
