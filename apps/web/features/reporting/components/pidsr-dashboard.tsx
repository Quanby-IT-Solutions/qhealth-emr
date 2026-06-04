"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ExternalLink } from "lucide-react"

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
	usePidsrCasesQuery,
	useSubmitPidsrCaseMutation,
	useSurveillanceFlagsQuery,
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
	if (cat === "category_1") return <Badge variant="destructive">Cat 1 — Immediate</Badge>
	if (cat === "category_2") return <Badge variant="outline">Cat 2 — Weekly</Badge>
	return <Badge variant="secondary">—</Badge>
}

function useCountdown(createdAt: string): { hoursLeft: number; isUrgent: boolean } | null {
	const [now, setNow] = useState(() => Date.now())
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 60_000)
		return () => clearInterval(id)
	}, [])
	const deadline = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000
	const msLeft = deadline - now
	if (msLeft <= 0) return { hoursLeft: 0, isUrgent: true }
	const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000))
	return { hoursLeft, isUrgent: hoursLeft < 6 }
}

function Cat1Countdown({ createdAt }: { createdAt: string }) {
	const info = useCountdown(createdAt)
	if (!info) return null
	if (info.hoursLeft <= 0)
		return (
			<Badge variant="destructive" className="text-xs">
				Overdue
			</Badge>
		)
	if (info.isUrgent)
		return (
			<Badge variant="destructive" className="text-xs">
				{info.hoursLeft}h left
			</Badge>
		)
	return (
		<Badge variant="outline" className="text-xs">
			{info.hoursLeft}h left
		</Badge>
	)
}

interface PidsrDashboardProps {
	facilityId: string
}

export function PidsrDashboard({ facilityId }: PidsrDashboardProps) {
	const router = useRouter()
	const searchParams = useSearchParams()

	const tab = (searchParams.get("tab") ?? "flags") as "flags" | "cases"
	const flagPage = Number(searchParams.get("flagPage") ?? "1")
	const casePage = Number(searchParams.get("casePage") ?? "1")
	const reviewFilter = searchParams.get("reviewed") ?? "false"
	const categoryFilter = searchParams.get("category") ?? "all"
	const caseStatusFilter = searchParams.get("status") ?? "all"
	const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

	function updateParam(key: string, value: string) {
		const params = new URLSearchParams(searchParams.toString())
		if (value === "" || value === "all" || value === "false" || value === "1") {
			params.delete(key)
		} else {
			params.set(key, value)
		}
		router.replace(`?${params.toString()}`, { scroll: false })
	}

	function setTab(value: "flags" | "cases") {
		updateParam("tab", value === "flags" ? "" : value)
	}
	function setFlagPage(fn: (p: number) => number) {
		updateParam("flagPage", String(fn(flagPage)))
	}
	function setCasePage(fn: (p: number) => number) {
		updateParam("casePage", String(fn(casePage)))
	}
	function setReviewFilter(v: string) {
		updateParam("reviewed", v)
	}
	function setCategoryFilter(v: string) {
		updateParam("category", v)
	}
	function setCaseStatusFilter(v: string) {
		updateParam("status", v)
	}

	const flagsQuery = useSurveillanceFlagsQuery({
		facilityId,
		page: flagPage,
		limit: 20,
		isReviewed: reviewFilter === "all" ? undefined : reviewFilter === "true",
		category:
			categoryFilter === "all" ? undefined : (categoryFilter as "category_1" | "category_2"),
	})

	const casesQuery = usePidsrCasesQuery({
		facilityId,
		page: casePage,
		limit: 20,
		reportStatus:
			caseStatusFilter === "all"
				? undefined
				: (caseStatusFilter as "draft" | "submitted" | "rejected" | "blocked"),
	})

	const submitMut = useSubmitPidsrCaseMutation()

	const flags = flagsQuery.data?.flags ?? []
	const cases = casesQuery.data?.cases ?? []

	// Count unreviewed cat1 flags for alert
	const unreviewed = flags.filter(f => !f.isReviewed && f.category === "category_1").length

	return (
		<div className="space-y-4">
			{/* Alert banner for pending cat1 */}
			{unreviewed > 0 && (
				<div className="flex items-center gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3">
					<Badge variant="destructive">Alert</Badge>
					<span className="text-sm font-medium text-red-800">
						{unreviewed} Category 1 surveillance flag{unreviewed > 1 ? "s" : ""} require immediate
						review and reporting.
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
									onValueChange={v => {
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
									onValueChange={v => {
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
										{flags.map(flag => (
											<TableRow key={flag.id}>
												<TableCell>
													<div className="font-medium">{flag.patientName ?? "—"}</div>
													<div className="text-muted-foreground text-xs">
														{flag.patientMrn ?? ""}
													</div>
												</TableCell>
												<TableCell>
													<div className="flex flex-col gap-1">
														{categoryBadge(flag.category)}
														{flag.category === "category_1" && !flag.isReviewed && (
															<Cat1Countdown createdAt={flag.createdAt} />
														)}
													</div>
												</TableCell>
												<TableCell>{flag.diseaseName ?? flag.triggerValue}</TableCell>
												<TableCell>
													<div className="flex flex-col gap-0.5">
														<Badge variant="secondary" className="w-fit">
															{flag.flagType === "icd10_match" ? "ICD-10" : "Keyword"}
														</Badge>
														{flag.triggeredBy && (
															<span className="text-muted-foreground font-mono text-xs">
																{flag.triggeredBy}
															</span>
														)}
													</div>
												</TableCell>
												<TableCell className="text-sm">{formatDate(flag.createdAt)}</TableCell>
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
											onClick={() => setFlagPage(p => p - 1)}
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
											onClick={() => setFlagPage(p => p + 1)}
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
								onValueChange={v => {
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
										{cases.map(c => (
											<TableRow key={c.id}>
												<TableCell>
													<div className="font-medium">{c.patientName ?? "—"}</div>
													<div className="text-muted-foreground text-xs">{c.patientMrn ?? ""}</div>
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
														<Link
															href={`/surveillance/pidsr/${c.id}`}
															title="Open submission page"
															className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex items-center justify-center rounded-md p-1"
														>
															<ExternalLink className="size-3.5" />
														</Link>
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
											onClick={() => setCasePage(p => p - 1)}
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
											onClick={() => setCasePage(p => p + 1)}
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
				<PidsrCaseDetail caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />
			)}
		</div>
	)
}
