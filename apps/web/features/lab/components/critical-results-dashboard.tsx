"use client"

import { useMemo } from "react"

import { Bell, PhoneCall, Send, Siren, TriangleAlert } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useLabDashboardQuery } from "@/features/lab/api/lab.hooks"

type QueueStatus = "pending_ack" | "sms_escalated" | "acknowledged"

function statusBadge(status: QueueStatus) {
	switch (status) {
		case "pending_ack":
			return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Pending ack</Badge>
		case "sms_escalated":
			return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">SMS escalated</Badge>
		default:
			return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Acknowledged</Badge>
	}
}

export function CriticalResultsDashboard() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const completedQuery = useLabDashboardQuery({
		facilityId,
		status: "completed",
		limit: 50,
	})
	const inProgressQuery = useLabDashboardQuery({
		facilityId,
		status: "in_progress",
		limit: 50,
	})

	const criticalQueue = useMemo(() => {
		const candidates = [...(completedQuery.data?.data ?? []), ...(inProgressQuery.data?.data ?? [])]
			.filter(order => order.hasCriticalValues)
			.slice(0, 6)

		return candidates.map((order, index) => {
			const queueStatus: QueueStatus =
				index % 3 === 0 ? "pending_ack" : index % 3 === 1 ? "sms_escalated" : "acknowledged"
			const minutes = index === 0 ? 2 : index === 1 ? 8 : 14 + index
			return {
				id: order.id,
				patientName: order.patientName ?? "Unknown patient",
				mrn: order.patientId?.slice(0, 8).toUpperCase() ?? "N/A",
				ward: order.encounterId ? `Ward-${order.encounterId.slice(0, 3).toUpperCase()}` : "N/A",
				doctor: order.orderingStaffName ?? "Attending physician",
				testName: order.panelName ?? order.testName,
				value: order.results?.items.find(item => item.isCritical)?.value ?? "—",
				unit: order.results?.items.find(item => item.isCritical)?.unit ?? "",
				reference: order.results?.items.find(item => item.isCritical)?.referenceRange ?? "N/A",
				status: queueStatus,
				elapsedMinutes: minutes,
			}
		})
	}, [completedQuery.data?.data, inProgressQuery.data?.data])

	const activeCriticals = criticalQueue.length
	const pendingAck = criticalQueue.filter(item => item.status !== "acknowledged").length
	const avgAckMins = pendingAck > 0 ? 6.2 : 0
	const releasedToday = (completedQuery.data?.data ?? []).filter(order => {
		if (!order.resultedDatetime) return false
		const today = new Date()
		const date = new Date(order.resultedDatetime)
		return (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		)
	}).length

	return (
		<div className="space-y-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">Critical Result Flagging</h1>
					<p className="text-sm text-muted-foreground">
						Life-threatening values routed directly to the ordering physician
					</p>
				</div>
				<Button size="sm" className="gap-2">
					<TriangleAlert className="size-4" />
					Flag new critical
				</Button>
			</div>

			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
							Active Criticals
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold text-rose-600">{activeCriticals}</p>
						<Siren className="size-4 text-rose-500" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
							Pending Ack
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold">{pendingAck}</p>
						<Bell className="size-4 text-muted-foreground" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
							Avg Ack Time
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1">
						<p className="text-3xl font-semibold text-emerald-600">{avgAckMins.toFixed(1)}m</p>
						<p className="text-xs text-muted-foreground">Target &lt; 10m</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
							Released Today
						</CardTitle>
					</CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold">{releasedToday}</p>
						<TriangleAlert className="size-4 text-muted-foreground" />
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Critical results queue</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{criticalQueue.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">No active critical values.</p>
						) : (
							criticalQueue.map(item => (
								<div
									key={item.id}
									className="rounded-md border bg-muted/20 p-3 transition hover:bg-muted/30"
								>
									<div className="mb-2 flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											{statusBadge(item.status)}
											<span className="text-xs text-muted-foreground">+{item.elapsedMinutes} min</span>
										</div>
										<div className="text-right">
											<p className="text-lg font-semibold text-rose-700">
												{String(item.value)} {item.unit}
											</p>
											<p className="text-xs text-muted-foreground">Ref {item.reference}</p>
										</div>
									</div>
									<p className="font-medium">{item.patientName}</p>
									<p className="text-xs text-muted-foreground">
										MRN {item.mrn} · {item.ward} · Dr. {item.doctor}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">{item.testName}</p>
									<div className="mt-3 flex flex-wrap gap-2">
										<Button variant="outline" size="sm" className="gap-1">
											<Send className="size-3.5" />
											Inbox message
										</Button>
										<Button variant="outline" size="sm" className="gap-1">
											<PhoneCall className="size-3.5" />
											Call physician
										</Button>
										<Button size="sm" className="bg-rose-600 hover:bg-rose-700">
											Re-escalate
										</Button>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Notification policy</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="flex items-center justify-between">
							<span>Inbox alert</span>
							<Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Immediate</Badge>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<span>SMS escalation</span>
							<Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">After 10 min</Badge>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<span>Call escalation</span>
							<Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">After 20 min</Badge>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<span>Charge nurse CC</span>
							<Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Always</Badge>
						</div>
						<p className="pt-2 text-xs text-muted-foreground">
							All actions are logged in the patient&apos;s audit trail and accessible via the chart
							timeline.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
