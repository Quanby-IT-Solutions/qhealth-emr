"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import {
	useAllergiesQuery,
	useProblemsQuery,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

import { AddAllergyDialog } from "./add-allergy-dialog"
import { AddProblemDialog } from "./add-problem-dialog"
import { ResolveProblemDialog } from "./resolve-problem-dialog"

function formatDate(dateStr: string | null | undefined) {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function severityVariant(severity: "mild" | "moderate" | "severe" | "life-threatening") {
	switch (severity) {
		case "life-threatening":
		case "severe":
			return "destructive" as const
		case "moderate":
			return "default" as const
		case "mild":
			return "secondary" as const
	}
}

function allergenTypeLabel(type: "medication" | "food" | "environmental") {
	switch (type) {
		case "medication":
			return "Medication"
		case "food":
			return "Food"
		case "environmental":
			return "Environmental"
	}
}

interface ProblemsAllergiesTabProps {
	patientId: string
	facilityId: string
}

export function ProblemsAllergiesTab({ patientId, facilityId }: ProblemsAllergiesTabProps) {
	const [problemStatusFilter, setProblemStatusFilter] = useState<"active" | "resolved" | undefined>(
		"active",
	)
	const [showAddProblem, setShowAddProblem] = useState(false)
	const [showAddAllergy, setShowAddAllergy] = useState(false)
	const [resolveProblemId, setResolveProblemId] = useState<string | null>(null)

	const {
		data: problemsData,
		isLoading: problemsLoading,
	} = useProblemsQuery({ patientId, status: problemStatusFilter })

	const {
		data: allergiesData,
		isLoading: allergiesLoading,
	} = useAllergiesQuery({ patientId, isActive: true })

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			{/* Problems Panel */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Problems</CardTitle>
						<p className="text-muted-foreground text-sm">
							{problemsData?.total ?? 0} total
						</p>
					</div>
					<div className="flex items-center gap-2">
						<div className="flex gap-1">
							<Button
								size="sm"
								variant={problemStatusFilter === "active" ? "default" : "outline"}
								onClick={() => setProblemStatusFilter("active")}
							>
								Active
							</Button>
							<Button
								size="sm"
								variant={problemStatusFilter === "resolved" ? "default" : "outline"}
								onClick={() => setProblemStatusFilter("resolved")}
							>
								Resolved
							</Button>
							<Button
								size="sm"
								variant={problemStatusFilter === undefined ? "default" : "outline"}
								onClick={() => setProblemStatusFilter(undefined)}
							>
								All
							</Button>
						</div>
						<Button size="sm" onClick={() => setShowAddProblem(true)}>
							Add Problem
						</Button>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{problemsLoading ? (
						<div className="text-muted-foreground py-8 text-center text-sm">
							Loading problems…
						</div>
					) : problemsData && problemsData.data.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Problem</TableHead>
									<TableHead>ICD-10</TableHead>
									<TableHead>Onset</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Provider</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{problemsData.data.map(problem => (
									<TableRow key={problem.id}>
										<TableCell className="font-medium">
											{problem.description}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{problem.icd10Code ? (
												<span title={problem.icd10Display ?? undefined}>
													{problem.icd10Code}
												</span>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell>{formatDate(problem.onsetDate)}</TableCell>
										<TableCell>
											<Badge
												variant={
													problem.status === "active"
														? "default"
														: "secondary"
												}
											>
												{problem.status}
											</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{problem.documentingStaffName ?? "—"}
										</TableCell>
										<TableCell>
											{problem.status === "active" && (
												<Button
													size="sm"
													variant="outline"
													onClick={() => setResolveProblemId(problem.id)}
												>
													Resolve
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<div className="text-muted-foreground py-8 text-center text-sm">
							No {problemStatusFilter ?? ""} problems recorded.
						</div>
					)}
				</CardContent>
			</Card>

			{/* Allergies Panel */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Allergies</CardTitle>
						<p className="text-muted-foreground text-sm">
							{allergiesData?.total ?? 0} active
						</p>
					</div>
					<Button size="sm" onClick={() => setShowAddAllergy(true)}>
						Add Allergy
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					{allergiesLoading ? (
						<div className="text-muted-foreground py-8 text-center text-sm">
							Loading allergies…
						</div>
					) : allergiesData && allergiesData.data.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Allergen</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Reaction</TableHead>
									<TableHead>Severity</TableHead>
									<TableHead>Onset</TableHead>
									<TableHead>Provider</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{allergiesData.data.map(allergy => (
									<TableRow key={allergy.id}>
										<TableCell className="font-medium">
											{allergy.allergenName}
										</TableCell>
										<TableCell className="text-sm">
											{allergenTypeLabel(allergy.allergenType)}
										</TableCell>
										<TableCell className="text-sm">
											{allergy.reactionType ?? "—"}
										</TableCell>
										<TableCell>
											<Badge variant={severityVariant(allergy.severity)}>
												{allergy.severity}
											</Badge>
										</TableCell>
										<TableCell>{formatDate(allergy.onsetDate)}</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{allergy.documentingStaffName ?? "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<div className="text-muted-foreground py-8 text-center text-sm">
							No known allergies documented.
						</div>
					)}
				</CardContent>
			</Card>

			{/* Dialogs */}
			<AddProblemDialog
				open={showAddProblem}
				onOpenChange={setShowAddProblem}
				patientId={patientId}
				facilityId={facilityId}
			/>

			<AddAllergyDialog
				open={showAddAllergy}
				onOpenChange={setShowAddAllergy}
				patientId={patientId}
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
		</div>
	)
}
