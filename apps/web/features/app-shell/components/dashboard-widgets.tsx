"use client"

import Link from "next/link"

import {
	Alert02FreeIcons,
	Analytics01FreeIcons,
	CheckListFreeIcons,
	HeartCheckFreeIcons,
	PatientFreeIcons,
	Settings02FreeIcons,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

interface DashboardWidgetProps {
	widgetId: string
}

const WIDGET_META: Record<
	string,
	{ title: string; icon: typeof Alert02FreeIcons; description: string; linkHref?: string; linkLabel?: string }
> = {
	"quick-stats": {
		title: "Quick Stats",
		icon: Analytics01FreeIcons,
		description: "Key metrics for your role will appear here.",
	},
	alerts: {
		title: "Alerts",
		icon: Alert02FreeIcons,
		description: "Active clinical alerts and notifications will appear here.",
	},
	"my-patient-list": {
		title: "My Patient List",
		icon: PatientFreeIcons,
		description: "Your assigned patients will appear here.",
		linkHref: "/patients/search",
		linkLabel: "View Patients",
	},
	"pending-orders": {
		title: "Pending Orders",
		icon: CheckListFreeIcons,
		description: "Orders awaiting your action will appear here.",
		linkHref: "/patients/search",
		linkLabel: "View Patients",
	},
	"unsigned-notes": {
		title: "Unsigned Notes",
		icon: CheckListFreeIcons,
		description: "Clinical notes and records requiring your signature will appear here.",
		linkHref: "/patients/search",
		linkLabel: "View Patients",
	},
	"system-health": {
		title: "System Health",
		icon: HeartCheckFreeIcons,
		description: "Service and infrastructure status",
	},
}

function DashboardWidget({ widgetId }: DashboardWidgetProps) {
	const meta = WIDGET_META[widgetId] ?? {
		title: widgetId,
		icon: Settings02FreeIcons,
		description: "Widget placeholder",
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={meta.icon} className="text-muted-foreground size-5" />
				<CardTitle className="text-sm font-medium">{meta.title}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="bg-muted/50 mt-3 rounded-md px-4 py-3">
					<p className="text-muted-foreground text-sm">{meta.description}</p>
					{meta.linkHref && (
						<Link
							href={meta.linkHref}
							className="text-primary mt-2 inline-flex text-xs font-medium hover:underline"
						>
							{meta.linkLabel} →
						</Link>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

export function DashboardWidgets({ widgetIds }: { widgetIds: string[] }) {
	if (widgetIds.length === 0) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				No widgets configured for this role.
			</div>
		)
	}

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{widgetIds.map(id => (
				<DashboardWidget key={id} widgetId={id} />
			))}
		</div>
	)
}
