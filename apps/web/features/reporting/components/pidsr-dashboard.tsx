"use client"

import { useState } from "react"

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
import {
	useSurveillanceFlagsQuery,
	usePidsrCasesQuery,
	useSubmitPidsrCaseMutation,
} from "@/features/reporting/api/reporting.hooks"
import { PidsrCaseDetail } from "@/features/reporting/components/pidsr-case-detail"

function formatDate(d: string | null | undefined) {
	if (!d) return "—"
	return new Date(d).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function categoryBadge(cat: string | null | undefined) {
	if (cat === "category_1")
		return <Badge variant="destructive">Cat 1 — Immediate</Badge>
	if (cat === "category_2")
		return <Badge variant="outline">Cat 2 — Weekly</Badge>
	return <Badge variant="secondary">—</Badge>
}

interface PidsrDashboardProps {
	facilityId: string
}

export function PidsrDashboard({ facilityId }: PidsrDashboardProps) {
	const [tab, setTab] = useState<"flags" | "cases">("flags")
	const [flagPage, setFlagPage] = useState(1)
	const [casePage, setCasePage] = useState(1)
	const [reviewFilter, setReviewFilter] = useState("false")
	const [categoryFilter, setCategoryFilter] = useState("all")
	const [caseStatusFilter, setCaseStatusFilter] = useState("all")
	const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

	const flagsQuery = useSurveillanceFlagsQuery({
		facilityId,
		page: flagPage,
		limit: 20,
		isReviewed: reviewFilter === "all" ? undefined : reviewFilter === "true",
		category: categoryFilter === "all" ? undefined : categoryFilter,
	})

	const casesQuery = usePidsrCasesQuery({
		facilityId,
		page: casePage,
		limit: 20,
		reportStatus: caseStatusFilter === "all" ? undefined : caseStatusFilter,
	})

	const submitMut = useSubmitPidsrCaseMutation()

	const flags = flagsQuery.data?.flags ?? []
	const cases = casesQuery.data?.cases ?? []

	// Count unreviewed cat1 flags for alert
	const unreviewed = flags.filter((f) => !f.isReviewed && f.category === "category_1").length

	return (
		<div className="space-y-4">
			{/* Alert banner for pending cat1 */}
			{unreviewed > 0 && (
				<div className="flex items-center gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3">
					<Badge variant="destructive">Alert</Badge>
					<span className="text-sm font-medium text-red-800">
						{unreviewed} Category 1 surveillance flag{unreviewed > 1 ? "s" : ""} require
						immediate review and reporting.
					</span>
				</div>
			)}

			{/* Sub-tab toggle */}
			<div className="flex gap-2">
				<Button
					variant={tab === "flags" ? "default" : "outline"}
					size="sm"
					onClick={() => setTab("flags")}
				>
					Surveillance Flags
					{flagsQuery.data && flagsQuery.data.total > 0 && (
						<Badge variant="secondary" className="ml-2">
							{flagsQuery.data.total}
						</Badge>
					)}
				</Button>
				<Button
					variant={tab === "cases" ? "default" : "outline"}
					size="sm"
					onClick={() => setTab("cases")}
				>
					PIDSR Cases
					{casesQuery.data && casesQuery.data.total > 0 && (
						<Badge variant="secondary" className="ml-2">
							{casesQuery.data.total}
						</Badge>
					)}
				</Button>
			</div>

			{tab === "flags" && (
				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<CardTitle>Auto-Detected Surveillance Flags</CardTitle>
							<div className="flex gap-2">
								<Select
									value={reviewFilter}
									onValueChange={(v) => {
										if (v) setReviewFilter(v)
									}}
								>
									<SelectTrigger className="w-36">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Flags</SelectItem>
										<SelectItem value="false">Pending Review</SelectItem>
										<SelectItem value="true">Reviewed</SelectItem>
									</SelectContent>
								</Select>
								<Select
									value={categoryFilter}
									onValueChange={(v) => {
										if (v) setCategoryFilter(v)
									}}
								>
									<SelectTrigger className="w-40">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Categories</SelectItem>
										<SelectItem value="category_1">Category 1 (Immediate)</SelectItem>
										<SelectItem value="category_2">Category 2 (Weekly)</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{flagsQuery.isLoading ? (
							<p className="text-muted-foreground py-8 text-center">Loading flags…</p>
						) : flags.length === 0 ? (
							<p className="text-muted-foreground py-8 text-center">No surveillance flags found.</p>
						) : (
							<>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Patient</TableHead>
											<TableHead>Category</TableHead>
											<TableHead>Disease</TableHead>
											<TableHead>Trigger</TableHead>
											<TableHead>Date</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{flags.map((flag) => (
											<TableRow key={flag.id}>
												<TableCell>
													<div className="font-medium">{flag.patientName ?? "—"}</div>
													<div className="text-muted-foreground text-xs">
														{flag.patientMrn ?? ""}
													</div>
												</TableCell>
												<TableCell>{categoryBadge(flag.category)}</TableCell>
												<TableCell>{flag.diseaseName ?? flag.triggerValue}</TableCell>
												<TableCell>
													<Badge variant="secondary">
														{flag.flagType === "icd10_match" ? "ICD-10" : "Keyword"}
													</Badge>
												</TableCell>
												<TableCell className="text-sm">
													{formatDate(flag.createdAt)}
												</TableCell>
												<TableCell>
													{flag.isReviewed ? (
														<Badge variant="default">Reviewed</Badge>
													) : (
														<Badge variant="outline">Pending</Badge>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								{(flagsQuery.data?.totalPages ?? 0) > 1 && (
									<div className="mt-4 flex justify-center gap-2">
										<Button
											size="sm"
											variant="outline"
											disabled={flagPage <= 1}
											onClick={() => setFlagPage((p) => p - 1)}
										>
											Previous
										</Button>
										<span className="text-muted-foreground self-center text-sm">
											Page {flagPage} of {flagsQuery.data?.totalPages}
										</span>
										<Button
											size="sm"
											variant="outline"
											disabled={flagPage >= (flagsQuery.data?.totalPages ?? 1)}
											onClick={() => setFlagPage((p) => p + 1)}
										>
											Next
										</Button>
									</div>
								)}
							</>
						)}
					</CardContent>
				</Card>
			)}

			{tab === "cases" && (
				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<CardTitle>PIDSR Cases</CardTitle>
							<Select
								value={caseStatusFilter}
								onValueChange={(v) => {
									if (v) setCaseStatusFilter(v)
								}}
							>
								<SelectTrigger className="w-36">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Statuses</SelectItem>
									<SelectItem value="draft">Draft</SelectItem>
									<SelectItem value="submitted">Submitted</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</CardHeader>
					<CardContent>
						{casesQuery.isLoading ? (
							<p className="text-muted-foreground py-8 text-center">Loading cases…</p>
						) : cases.length === 0 ? (
							<p className="text-muted-foreground py-8 text-center">No PIDSR cases found.</p>
						) : (
							<>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Patient</TableHead>
											<TableHead>Disease</TableHead>
											<TableHead>Classification</TableHead>
											<TableHead>Diagnosis Date</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{cases.map((c) => (
											<TableRow key={c.id}>
												<TableCell>
													<div className="font-medium">{c.patientName ?? "—"}</div>
													<div className="text-muted-foreground text-xs">
														{c.patientMrn ?? ""}
													</div>
												</TableCell>
												<TableCell>
													<div>{c.diseaseName}</div>
													<div className="text-muted-foreground text-xs">{c.diseaseCode}</div>
												</TableCell>
												<TableCell>
													<Badge variant="secondary">{c.caseClassification}</Badge>
												</TableCell>
												<TableCell>{formatDate(c.diagnosisDate)}</TableCell>
												<TableCell>
													{c.reportStatus === "submitted" ? (
														<Badge variant="default">Submitted</Badge>
													) : (
														<Badge variant="outline">Draft</Badge>
													)}
												</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-1">
														<Button
															size="sm"
															variant="outline"
															onClick={() => setSelectedCaseId(c.id)}
														>
															View
														</Button>
														{c.reportStatus === "draft" && (
															<Button
																size="sm"
																onClick={() => submitMut.mutate({ id: c.id })}
																disabled={submitMut.isPending}
															>
																Submit
															</Button>
														)}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								{(casesQuery.data?.totalPages ?? 0) > 1 && (
									<div className="mt-4 flex justify-center gap-2">
										<Button
											size="sm"
											variant="outline"
											disabled={casePage <= 1}
											onClick={() => setCasePage((p) => p - 1)}
										>
											Previous
										</Button>
										<span className="text-muted-foreground self-center text-sm">
											Page {casePage} of {casesQuery.data?.totalPages}
										</span>
										<Button
											size="sm"
											variant="outline"
											disabled={casePage >= (casesQuery.data?.totalPages ?? 1)}
											onClick={() => setCasePage((p) => p + 1)}
										>
											Next
										</Button>
									</div>
								)}
							</>
						)}
					</CardContent>
				</Card>
			)}

			{selectedCaseId && (
				<PidsrCaseDetail
					caseId={selectedCaseId}
					onClose={() => setSelectedCaseId(null)}
				/>
			)}
		</div>
	)
}
