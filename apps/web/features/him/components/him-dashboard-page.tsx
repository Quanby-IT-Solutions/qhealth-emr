"use client"

import Link from "next/link"
import { ArrowRight01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useHimQueueCounts } from "@/features/him/lib/him-queue-badges"

export function HimDashboardPage() {
	const counts = useHimQueueCounts()

	const DASHBOARD_CARDS = [
		{
			title: "Open Deficiencies",
			description: "Chart completion issues awaiting physician or coder follow-up.",
			href: "/him/deficiencies",
			count: counts.openDeficiencies,
		},
		{
			title: "Pending Coding",
			description: "Discharged encounters queued for ICD-10 coding review.",
			href: "/him/coding/lookup",
			count: counts.pendingCoding,
		},
		{
			title: "Pending Records Requests",
			description: "Requests waiting for document packaging and release.",
			href: "/him/records-requests",
			count: counts.pendingRecordsRequests,
		},
		{
			title: "HAI Pending Review",
			description: "Surveillance tags requiring coder reconciliation.",
			href: "/him/hai",
			count: counts.pendingHaiReview,
		},
	]
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">HIM Coder Console</h1>
				<p className="text-sm text-muted-foreground">
					Architecture landing page for deficiency tracking, coding, records issuance, and HAI reconciliation.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{DASHBOARD_CARDS.map(card => (
					<Card key={card.title}>
						<CardHeader className="space-y-3">
							<div className="flex items-start justify-between gap-3">
								<div className="space-y-1">
									<CardTitle className="text-base">{card.title}</CardTitle>
									<CardDescription>{card.description}</CardDescription>
								</div>
								<Badge variant="secondary">{card.count}</Badge>
							</div>
						</CardHeader>
						<CardContent>
							<Link href={card.href} className="inline-flex items-center gap-2 text-sm font-medium text-primary">
								Open queue
								<HugeiconsIcon icon={ArrowRight01FreeIcons} className="size-4" />
							</Link>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}