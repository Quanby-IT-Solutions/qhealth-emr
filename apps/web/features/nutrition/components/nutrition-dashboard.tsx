"use client"

import { useMemo, useState } from "react"

import {
	AlertTriangle,
	ClipboardList,
	Filter,
	Loader2,
	RefreshCw,
	TrendingUp,
	Utensils,
} from "lucide-react"

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

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	type WorklistAssessment,
	useNutritionWorklistQuery,
} from "@/features/nutrition/api/nutrition.hooks"

// ============================================================================
// Helpers
// ============================================================================

function RiskBadge({ risk }: { risk: string }) {
	if (risk === "high")
		return (
			<Badge className="bg-red-600 text-white">
				<AlertTriangle className="mr-1 size-3" />
				High
			</Badge>
		)
	if (risk === "moderate") return <Badge variant="secondary">Moderate</Badge>
	return (
		<Badge variant="outline" className="text-muted-foreground">
			Low
		</Badge>
	)
}

function MealPlanBadge({ status }: { status: WorklistAssessment["mealPlanStatus"] }) {
	if (status === "active") return <Badge className="bg-green-600 text-white">Active</Badge>
	if (status === "draft") return <Badge variant="secondary">Draft</Badge>
	return (
		<Badge variant="outline" className="text-muted-foreground">
			None
		</Badge>
	)
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

// ============================================================================
// Stat Card
// ============================================================================

interface StatCardProps {
	title: string
	value: number | string
	icon: React.ReactNode
	accent?: "default" | "warning" | "danger"
}

function StatCard({ title, value, icon, accent = "default" }: StatCardProps) {
	const accentClass =
		accent === "danger"
			? "text-red-600"
			: accent === "warning"
				? "text-amber-500"
				: "text-muted-foreground"

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<span className={accentClass}>{icon}</span>
			</CardHeader>
			<CardContent>
				<p className={`text-2xl font-bold ${accent === "danger" ? "text-red-600" : accent === "warning" ? "text-amber-600" : ""}`}>
					{value}
				</p>
			</CardContent>
		</Card>
	)
}

// ============================================================================
// Main Component — NutritionDashboard
// ============================================================================

export function NutritionDashboard() {
	const { data: profile, isLoading: profileLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const [riskFilter, setRiskFilter] = useState<"all" | "high" | "moderate" | "low">("all")
	const [page, setPage] = useState(1)

	const { data, isLoading, refetch } = useNutritionWorklistQuery(facilityId, {
		page,
		limit: 20,
		malnutritionRisk: riskFilter === "all" ? undefined : riskFilter,
	})

	const stats = useMemo(() => {
		const all = data?.data ?? []
		const today = new Date().toDateString()
		return {
			assessedToday: all.filter(
				(a) => new Date(a.assessedAt).toDateString() === today
			).length,
			highRisk: all.filter((a) => a.malnutritionRisk === "high").length,
			pending: all.filter((a) => !a.mealPlanStatus || a.mealPlanStatus === "none").length,
		}
	}, [data])

	if (profileLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Nutrition</h1>
					<p className="text-sm text-muted-foreground">Loading…</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Nutrition &amp; Dietetics</h1>
					<p className="text-sm text-muted-foreground">
						Malnutrition screening, meal planning, and FHIR diet order management
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={() => void refetch()}>
					<RefreshCw className="mr-1.5 size-3.5" />
					Refresh
				</Button>
			</div>

			{/* Stats */}
			<div className="grid gap-4 sm:grid-cols-3">
				<StatCard
					title="Assessed Today"
					value={isLoading ? "—" : stats.assessedToday}
					icon={<ClipboardList className="size-4" />}
				/>
				<StatCard
					title="High-Risk Patients"
					value={isLoading ? "—" : stats.highRisk}
					icon={<AlertTriangle className="size-4" />}
					accent="danger"
				/>
				<StatCard
					title="Pending Meal Plans"
					value={isLoading ? "—" : stats.pending}
					icon={<Utensils className="size-4" />}
					accent="warning"
				/>
			</div>

			{/* Worklist Table */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between pb-2 gap-4 flex-wrap">
					<CardTitle className="text-base flex items-center gap-2">
						<TrendingUp className="size-4" />
						Patient Assessment Worklist
					</CardTitle>
					<div className="flex items-center gap-2">
						<Filter className="size-4 text-muted-foreground" />
						<Select
							value={riskFilter}
							onValueChange={(v) => {
								setRiskFilter(v as typeof riskFilter)
								setPage(1)
							}}
						>
							<SelectTrigger className="w-36 h-8 text-xs">
								<SelectValue placeholder="Risk level" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Risk Levels</SelectItem>
								<SelectItem value="high">High Risk</SelectItem>
								<SelectItem value="moderate">Moderate Risk</SelectItem>
								<SelectItem value="low">Low Risk</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="flex items-center justify-center py-16">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : !data?.data?.length ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<Utensils className="mb-3 size-10 text-muted-foreground" />
							<p className="font-medium">No assessments found</p>
							<p className="text-sm text-muted-foreground mt-1">
								Nutrition assessments will appear here as clinicians complete
								screenings within patient encounters.
							</p>
						</div>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Patient</TableHead>
										<TableHead>MRN</TableHead>
										<TableHead>Ward</TableHead>
										<TableHead>Tool</TableHead>
										<TableHead>Score</TableHead>
										<TableHead>Risk</TableHead>
										<TableHead>Meal Plan</TableHead>
										<TableHead>Assessed</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.data.map((assessment) => (
										<TableRow key={assessment.id}>
											<TableCell className="font-medium">
												{assessment.patientName ?? "—"}
											</TableCell>
											<TableCell className="font-mono text-xs">
												{assessment.patientMrn ?? "—"}
											</TableCell>
											<TableCell>{assessment.ward ?? "—"}</TableCell>
											<TableCell className="uppercase text-xs">
												{assessment.screeningTool}
											</TableCell>
											<TableCell>{assessment.screeningScore}</TableCell>
											<TableCell>
												<RiskBadge risk={assessment.malnutritionRisk} />
											</TableCell>
											<TableCell>
												<MealPlanBadge status={assessment.mealPlanStatus} />
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{formatDate(assessment.assessedAt)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>

							{/* Pagination */}
							{data.totalPages > 1 && (
								<div className="flex items-center justify-between px-4 py-3 border-t">
									<p className="text-xs text-muted-foreground">
										Page {data.page} of {data.totalPages} · {data.total} total
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={page <= 1}
											onClick={() => setPage((p) => p - 1)}
										>
											Previous
										</Button>
										<Button
											variant="outline"
											size="sm"
											disabled={page >= data.totalPages}
											onClick={() => setPage((p) => p + 1)}
										>
											Next
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
