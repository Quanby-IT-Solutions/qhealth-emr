"use client"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { useListKonsultaActivitiesQuery } from "../api/konsulta.hooks"

interface ActivityTimelineProps {
	patientId: string
	facilityId: string
}

const TYPE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
	FPE: "default",
	"Follow-up": "secondary",
	Lab: "outline",
}

export function ActivityTimeline({ patientId, facilityId }: ActivityTimelineProps) {
	const { data, isLoading } = useListKonsultaActivitiesQuery({
		patientId,
		facilityId,
		limit: 50,
	})

	const activities = data?.activities ?? []

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">Activity Timeline</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading && (
					<div className="space-y-2 py-2">
						{[...Array(4)].map((_, i) => (
							<Skeleton key={i} className="h-9 w-full" />
						))}
					</div>
				)}

				{!isLoading && activities.length === 0 && (
					<p className="text-sm text-muted-foreground py-4 text-center">
						No activities recorded for this patient.
					</p>
				)}

				{activities.length > 0 && (
					<ol className="relative border-l border-muted ml-2 space-y-4 py-1">
						{activities.map(activity => (
							<li key={activity.id} className="ml-4">
								<div className="absolute -left-1.5 mt-1.5 size-3 rounded-full border border-background bg-muted-foreground/40" />
								<div className="flex items-start gap-2 flex-wrap">
									<Badge
										variant={TYPE_VARIANT[activity.activityType] ?? "outline"}
										className="text-[10px] h-4 px-1.5"
									>
										{activity.activityType}
									</Badge>
									<span className="text-xs tabular-nums text-muted-foreground">
										{activity.activityDate}
									</span>
									{activity.sourceRef && (
										<span className="text-[10px] text-muted-foreground/70 font-mono">
											ref: {activity.sourceRef}
										</span>
									)}
								</div>
							</li>
						))}
					</ol>
				)}
			</CardContent>
		</Card>
	)
}
