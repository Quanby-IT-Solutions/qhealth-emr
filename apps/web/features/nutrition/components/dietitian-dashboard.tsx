"use client"

import Link from "next/link"
import { useMemo } from "react"

import {
	AlertTriangle,
	ArrowUpRight,
	ClipboardList,
	Clock3,
	RefreshCw,
	TrendingUp,
	Utensils,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import {
	type WorklistAssessment,
	useNutritionWorklistQuery,
} from "@/features/nutrition/api/nutrition.hooks"

type WorklistAssessmentWithOptionalAssessedAt = WorklistAssessment & {
	assessedAt?: string
}

function assessmentTime(item: WorklistAssessment): string {
	const withOptionalTime = item as WorklistAssessmentWithOptionalAssessedAt
	return withOptionalTime.assessedAt ?? item.updatedAt ?? item.createdAt
}

function riskBadge(risk: string) {
	if (risk === "high") {
		return <Badge variant="destructive">High</Badge>
	}
	if (risk === "moderate") {
		return <Badge variant="secondary">Moderate</Badge>
	}
	return <Badge variant="outline">Low</Badge>
}

function mealPlanBadge(status: WorklistAssessment["mealPlanStatus"]) {
	if (status === "active") {
		return <Badge className="bg-green-600 text-white">Plan Active</Badge>
	}
	if (status === "draft") {
		return <Badge variant="secondary">Draft Plan</Badge>
	}
	return <Badge variant="outline">No Plan</Badge>
}

function formatTime(iso: string) {
	return new Date(iso).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function hoursSince(iso: string) {
	const ms = Date.now() - new Date(iso).getTime()
	return Math.max(0, Math.floor(ms / (1000 * 60 * 60)))
}

function StatCard({
	title,
	value,
	subtitle,
	icon,
}: {
	title: string
	value: number | string
	subtitle: string
	icon: React.ReactNode
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<span className="text-muted-foreground">{icon}</span>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				<p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
			</CardContent>
		</Card>
	)
}

export function DietitianDashboard() {
	const { data: profile, isLoading: profileLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const worklist = useNutritionWorklistQuery(facilityId, { limit: 100 })
	const items = worklist.data?.data ?? []

	const summary = useMemo(() => {
		const last24Hours = items.filter(item => hoursSince(assessmentTime(item)) <= 24).length
		const highRisk = items.filter(item => item.malnutritionRisk === "high").length
		const plansMissing = items.filter(
			item => !item.mealPlanStatus || item.mealPlanStatus === "none"
		).length
		const plansActive = items.filter(item => item.mealPlanStatus === "active").length

		return {
			last24Hours,
			highRisk,
			plansMissing,
			plansActive,
		}
	}, [items])

	const priorityItems = useMemo(() => {
		const riskRank = { high: 0, moderate: 1, low: 2 }
		const planRank = { none: 0, draft: 1, active: 2 }

		return [...items]
			.sort((a, b) => {
				const riskDelta = riskRank[a.malnutritionRisk] - riskRank[b.malnutritionRisk]
				if (riskDelta !== 0) return riskDelta

				const aPlan = a.mealPlanStatus ?? "none"
				const bPlan = b.mealPlanStatus ?? "none"
				const planDelta = planRank[aPlan] - planRank[bPlan]
				if (planDelta !== 0) return planDelta

				return (
					new Date(assessmentTime(b)).getTime() - new Date(assessmentTime(a)).getTime()
				)
			})
			.slice(0, 8)
	}, [items])

	const recentItems = useMemo(() => {
		return [...items]
			.sort(
				(a, b) =>
					new Date(assessmentTime(b)).getTime() - new Date(assessmentTime(a)).getTime()
			)
			.slice(0, 6)
	}, [items])

	if (profileLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Dietitian Dashboard</h1>
					<p className="text-sm text-muted-foreground">Loading dashboard...</p>
				</div>
			</div>
		)
	}

	if (!facilityId) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Dietitian Dashboard</h1>
					<p className="text-sm text-muted-foreground">Viewing as Clinical Dietitian</p>
				</div>
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">
						No facility assignment found for this account.
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">Dietitian Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						Shift overview and nutrition priorities before entering full charting workflow
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void worklist.refetch()}
					disabled={worklist.isFetching}
				>
					<RefreshCw className={`mr-1.5 size-4 ${worklist.isFetching ? "animate-spin" : ""}`} />
					Refresh
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Assessed Last 24h"
					value={worklist.isLoading ? "-" : summary.last24Hours}
					subtitle="New or updated nutrition assessments"
					icon={<ClipboardList className="size-4" />}
				/>
				<StatCard
					title="High-Risk Caseload"
					value={worklist.isLoading ? "-" : summary.highRisk}
					subtitle="Patients flagged for immediate review"
					icon={<AlertTriangle className="size-4" />}
				/>
				<StatCard
					title="Plans Missing"
					value={worklist.isLoading ? "-" : summary.plansMissing}
					subtitle="Assessments without an active meal plan"
					icon={<Utensils className="size-4" />}
				/>
				<StatCard
					title="Active Meal Plans"
					value={worklist.isLoading ? "-" : summary.plansActive}
					subtitle="Patients with current diet orders"
					icon={<TrendingUp className="size-4" />}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between gap-3">
						<CardTitle className="text-base">Priority Caseload</CardTitle>
						<Button asChild size="sm" variant="outline">
							<Link href="/nutrition">Open Full Nutrition Workspace</Link>
						</Button>
					</CardHeader>
					<CardContent>
						{worklist.isLoading ? (
							<p className="py-8 text-center text-sm text-muted-foreground">Loading cases...</p>
						) : priorityItems.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No nutrition assessments available for this facility.
							</p>
						) : (
							<div className="space-y-2">
								{priorityItems.map(item => {
									const targetPath =
										item.patientId && item.encounterId
											? `/patients/${item.patientId}/encounters/${item.encounterId}/nutrition`
											: "/patients/search"

									return (
										<div
											key={item.id}
											className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
										>
											<div className="min-w-0">
												<p className="truncate text-sm font-medium">
													{item.patientName ?? "Unknown patient"}
												</p>
												<p className="truncate text-xs text-muted-foreground">
													MRN {item.patientMrn ?? "-"}
													{item.ward ? ` · ${item.ward}` : ""}
													{` · ${formatTime(assessmentTime(item))}`}
												</p>
											</div>

											<div className="flex items-center gap-2">
												{riskBadge(item.malnutritionRisk)}
												{mealPlanBadge(item.mealPlanStatus)}
												<Button asChild size="sm" variant="ghost">
													<Link href={targetPath}>
														Open
														<ArrowUpRight className="ml-1 size-3.5" />
													</Link>
												</Button>
											</div>
										</div>
									)
								})}
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Recent Nutrition Activity</CardTitle>
					</CardHeader>
					<CardContent>
						{recentItems.length === 0 ? (
							<p className="text-sm text-muted-foreground">No recent activity yet.</p>
						) : (
							<div className="space-y-3">
								{recentItems.map(item => (
									<div key={item.id} className="rounded-md border px-3 py-2">
										<p className="text-sm font-medium">{item.patientName ?? "Unknown patient"}</p>
										<p className="mt-0.5 text-xs text-muted-foreground">
											{item.screeningTool.toUpperCase()} · Score {item.screeningScore}
										</p>
										<div className="mt-1 flex items-center justify-between">
											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<Clock3 className="size-3" />
												{formatTime(assessmentTime(item))}
											</div>
											{riskBadge(item.malnutritionRisk)}
										</div>
									</div>
								))}
							</div>
						)}

						<div className="mt-4 grid gap-2">
							<Button asChild variant="outline" className="justify-start">
								<Link href="/nutrition">Open Nutrition Module</Link>
							</Button>
							<Button asChild variant="outline" className="justify-start">
								<Link href="/patients/search">Find Patient</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
