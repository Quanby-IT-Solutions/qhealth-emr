"use client"

import { Activity, AlertTriangle, ClipboardList, Heart, RefreshCw, Stethoscope } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { EdDashboard } from "@/features/ed/components/ed-dashboard"
import { HaiTagForm } from "@/features/nursing/components/hai-tag-form"
import { NbsLogbook } from "@/features/nbs/components/nbs-logbook"

import { useHaiTagsQuery, useVitalsQuery } from "../api/nursing.hooks"

// ============================================================================
// Stats Card
// ============================================================================

interface StatCardProps {
	title: string
	value: string | number
	subtitle?: string
	icon: React.ReactNode
	accent?: "default" | "warning" | "danger"
}

function StatCard({ title, value, subtitle, icon, accent = "default" }: StatCardProps) {
	const accentClass =
		accent === "danger"
			? "border-l-4 border-l-red-500"
			: accent === "warning"
				? "border-l-4 border-l-amber-500"
				: ""

	return (
		<Card className={accentClass}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<span className="text-muted-foreground">{icon}</span>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				{subtitle && <p className="text-muted-foreground text-xs mt-0.5">{subtitle}</p>}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// NEWS Alert Table
// ============================================================================

interface NewsAlertTableProps {
	facilityId: string
}

function NewsAlertTable({ facilityId }: NewsAlertTableProps) {
	const { data, isLoading } = useVitalsQuery({ facilityId, limit: 50 })

	const highAlerts =
		data?.data.filter(
			(v) => v.newsRiskLevel === "high" || (v.newsScore !== null && v.newsScore >= 5)
		) ?? []

	if (isLoading) {
		return <p className="text-muted-foreground text-sm py-4">Loading vitals…</p>
	}

	if (highAlerts.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-center">
				<Heart className="size-10 text-green-500 mb-2" />
				<p className="font-medium text-sm">No high NEWS alerts</p>
				<p className="text-muted-foreground text-xs mt-1">All monitored patients are stable.</p>
			</div>
		)
	}

	return (
		<div className="space-y-2">
			{highAlerts.map((vital) => (
				<div
					key={vital.id}
					className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20"
				>
					<div>
						<p className="text-sm font-medium">Encounter: {vital.encounterId ?? "—"}</p>
						<p className="text-xs text-muted-foreground">
							BP {vital.bpSystolic ?? "—"}/{vital.bpDiastolic ?? "—"} · HR{" "}
							{vital.heartRate ?? "—"} · SpO₂ {vital.spo2 ?? "—"}%
						</p>
						<p className="text-xs text-muted-foreground">
							{new Date(vital.recordedAt).toLocaleString("en-PH")}
						</p>
					</div>
					<div className="flex flex-col items-end gap-1">
						<Badge variant="destructive">NEWS {vital.newsScore ?? "—"}</Badge>
						<span className="text-xs text-red-600 font-medium">Escalate to Physician</span>
					</div>
				</div>
			))}
		</div>
	)
}

// ============================================================================
// HAI Summary Tab
// ============================================================================

interface HaiSummaryTabProps {
	facilityId: string
}

function HaiSummaryTab({ facilityId }: HaiSummaryTabProps) {
	const { data } = useHaiTagsQuery({ facilityId, limit: 100 })

	const byType = (data?.data ?? []).reduce<Record<string, number>>((acc, tag) => {
		acc[tag.haiType] = (acc[tag.haiType] ?? 0) + 1
		return acc
	}, {})

	const HAI_LABELS: Record<string, string> = {
		clabsi: "CLABSI",
		cauti: "CAUTI",
		vap: "VAP",
		ssi: "SSI",
		cdiff: "C. diff",
	}

	return (
		<div className="space-y-6">
			<div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
				{Object.entries(HAI_LABELS).map(([key, label]) => (
					<Card key={key}>
						<CardContent className="pt-4">
							<div className="text-2xl font-bold">{byType[key] ?? 0}</div>
							<p className="text-xs text-muted-foreground">{label}</p>
						</CardContent>
					</Card>
				))}
			</div>
			<div className="rounded-md border p-4">
				<p className="text-sm font-medium mb-3">Tag a New HAI</p>
				<p className="text-xs text-muted-foreground">
					Open a patient encounter to log a new Healthcare-Associated Infection tag.
					Navigate to <strong>Patients → Encounter → Nursing tab → HAI Tags</strong>.
				</p>
			</div>
		</div>
	)
}

// ============================================================================
// Main Dashboard
// ============================================================================

export function NursingDashboard() {
	const { data: profile, isLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const { data: vitalsData, refetch: refetchVitals } = useVitalsQuery({
		facilityId,
		limit: 100,
	})
	const { data: haiData } = useHaiTagsQuery({ facilityId, limit: 100 })

	const totalVitalsToday = vitalsData?.data.filter((v) => {
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		return new Date(v.recordedAt) >= today
	}).length ?? 0

	const highNewsCount =
		vitalsData?.data.filter(
			(v) => v.newsRiskLevel === "high" || (v.newsScore !== null && v.newsScore >= 5)
		).length ?? 0

	const activeHaiCount = haiData?.data.filter((h) => h.status !== "resolved").length ?? 0

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Nursing</h1>
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
					<h1 className="text-2xl font-semibold">Nursing Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						Vitals monitoring, care records, and patient safety
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={() => void refetchVitals()}>
					<RefreshCw className="mr-1.5 size-4" />
					Refresh
				</Button>
			</div>

			{/* Stats */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<StatCard
					title="Vitals Recorded Today"
					value={totalVitalsToday}
					subtitle="Across all encounters"
					icon={<Activity className="size-4" />}
				/>
				<StatCard
					title="High NEWS Alerts"
					value={highNewsCount}
					subtitle="Score ≥ 5 — escalation needed"
					icon={<AlertTriangle className="size-4" />}
					accent={highNewsCount > 0 ? "danger" : "default"}
				/>
				<StatCard
					title="Active HAI Tags"
					value={activeHaiCount}
					subtitle="Suspected or confirmed infections"
					icon={<ClipboardList className="size-4" />}
					accent={activeHaiCount > 0 ? "warning" : "default"}
				/>
			</div>

			{/* Tabs */}
			<Tabs defaultValue="alerts">
				<TabsList variant="line">
					<TabsTrigger value="alerts">
						NEWS Alerts
						{highNewsCount > 0 && (
							<Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs">
								{highNewsCount}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger value="er">ER Board</TabsTrigger>
					<TabsTrigger value="hai">HAI Surveillance</TabsTrigger>
					<TabsTrigger value="nbs">NBS Worklist</TabsTrigger>
				</TabsList>

				<TabsContent value="alerts" className="mt-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<Stethoscope className="size-4" />
								Patients Requiring Escalation
							</CardTitle>
						</CardHeader>
						<CardContent>
							<NewsAlertTable facilityId={facilityId} />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="er" className="mt-4">
					<EdDashboard facilityId={facilityId} />
				</TabsContent>

				<TabsContent value="hai" className="mt-4">
					<HaiSummaryTab facilityId={facilityId} />
				</TabsContent>

				<TabsContent value="nbs" className="mt-4">
					{facilityId ? (
						<NbsLogbook facilityId={facilityId} />
					) : (
						<p className="text-muted-foreground text-sm py-4">No facility assigned.</p>
					)}
				</TabsContent>
			</Tabs>
		</div>
	)
}
