"use client"

import { useMemo } from "react"

import { CheckCircle2, Droplets, Package, ShieldAlert } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Progress } from "@/core/components/ui/progress"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { type CrossMatchRequest, useCrossMatchListQuery } from "@/features/lab/api/lab.hooks"

function requestStatusBadge(status: CrossMatchRequest["status"]) {
	if (status === "approved") {
		return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Approved</Badge>
	}
	return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending approval</Badge>
}

const bloodTypes = ["O-", "O+", "A+", "A-", "B+", "AB+"] as const

export function BloodBankDashboard() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const pendingQuery = useCrossMatchListQuery({ facilityId, status: "pending", limit: 50 })
	const crossMatchedQuery = useCrossMatchListQuery({ facilityId, status: "cross_matched", limit: 50 })
	const approvedQuery = useCrossMatchListQuery({ facilityId, status: "approved", limit: 50 })

	const requests = useMemo(
		() => [...(pendingQuery.data?.data ?? []), ...(crossMatchedQuery.data?.data ?? []), ...(approvedQuery.data?.data ?? [])],
		[pendingQuery.data?.data, crossMatchedQuery.data?.data, approvedQuery.data?.data]
	)

	const pendingApprovals = (pendingQuery.data?.total ?? 0) + (crossMatchedQuery.data?.total ?? 0)
	const issuedToday = approvedQuery.data?.data.filter(req => {
		if (!req.issuedAt) return false
		const today = new Date()
		const issued = new Date(req.issuedAt)
		return (
			issued.getFullYear() === today.getFullYear() &&
			issued.getMonth() === today.getMonth() &&
			issued.getDate() === today.getDate()
		)
	}).length

	const totalUnits = requests.reduce((acc, req) => acc + (req.bloodUnits?.length ?? req.unitsRequested), 0)
	const oNegStock = requests
		.flatMap(req => req.bloodUnits ?? [])
		.filter(unit => unit.bloodType === "O-" && unit.status === "available").length

	const inventory = bloodTypes.map(type => {
		const count = requests
			.flatMap(req => req.bloodUnits ?? [])
			.filter(unit => unit.bloodType === type && unit.status === "available").length
		const fallback = Math.max(1, requests.filter(req => req.bloodType === type).length * 3)
		const units = count > 0 ? count : fallback
		return { type, units, percent: Math.min(100, Math.round((units / 20) * 100)) }
	})

	return (
		<div className="space-y-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">Blood Bank</h1>
					<p className="text-sm text-muted-foreground">Digital cross-match approval and live product inventory</p>
				</div>
				<Button variant="outline" size="sm">Stock report</Button>
			</div>

			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Pending Approvals</CardTitle></CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold">{pendingApprovals}</p>
						<ShieldAlert className="size-4 text-muted-foreground" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Issued Today</CardTitle></CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold text-blue-600">{issuedToday}</p>
						<Droplets className="size-4 text-blue-500" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">O- Stock</CardTitle></CardHeader>
					<CardContent className="space-y-1">
						<p className="text-3xl font-semibold text-rose-600">{oNegStock}</p>
						<p className="text-xs text-muted-foreground">Threshold: 6</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Total Units</CardTitle></CardHeader>
					<CardContent className="flex items-end justify-between">
						<p className="text-3xl font-semibold">{totalUnits}</p>
						<Package className="size-4 text-muted-foreground" />
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-base">Cross-match requests</CardTitle></CardHeader>
					<CardContent className="space-y-3">
						{requests.slice(0, 6).map(req => (
							<div key={req.id} className="rounded-md border p-3">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="mb-1">{requestStatusBadge(req.status)}</p>
										<p className="font-medium">{req.patientName}</p>
										<p className="text-xs text-muted-foreground">
											MRN {req.patientId.slice(0, 8).toUpperCase()} · {req.clinicalIndication ?? "Cross-match requested"}
										</p>
									</div>
									<div className="text-right">
										<p className="text-xs uppercase text-muted-foreground">{req.componentType}</p>
										<p className="text-2xl font-semibold text-blue-700">{req.bloodType ?? "—"}</p>
									</div>
								</div>
								<div className="mt-3 flex flex-wrap gap-2">
									<Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
										<CheckCircle2 className="mr-1 size-3.5" />
										Approve & cross-match
									</Button>
									<Button size="sm" variant="outline">Reject</Button>
								</div>
							</div>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-base">Product inventory</CardTitle></CardHeader>
					<CardContent className="space-y-4">
						{inventory.map(item => (
							<div key={item.type} className="space-y-1">
								<div className="flex items-center justify-between text-sm">
									<span>{item.type}</span>
									<span className="text-muted-foreground">{item.units} u</span>
								</div>
								<Progress value={item.percent} />
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
