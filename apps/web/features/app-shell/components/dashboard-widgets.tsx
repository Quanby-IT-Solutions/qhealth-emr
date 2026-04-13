"use client"

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
	{ title: string; icon: typeof Alert02FreeIcons; description: string }
> = {
	"quick-stats": {
		title: "Quick Stats",
		icon: Analytics01FreeIcons,
		description: "Key metrics at a glance",
	},
	alerts: {
		title: "Alerts",
		icon: Alert02FreeIcons,
		description: "Active alerts and notifications",
	},
	"my-patient-list": {
		title: "My Patient List",
		icon: PatientFreeIcons,
		description: "Patients assigned to you",
	},
	"pending-orders": {
		title: "Pending Orders",
		icon: CheckListFreeIcons,
		description: "Orders awaiting action",
	},
	"unsigned-notes": {
		title: "Unsigned Notes",
		icon: CheckListFreeIcons,
		description: "Clinical notes requiring signature",
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
				<p className="text-muted-foreground text-sm">{meta.description}</p>
				<div className="bg-muted/50 mt-3 flex h-24 items-center justify-center rounded-md">
					<span className="text-muted-foreground text-xs">Coming soon</span>
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
