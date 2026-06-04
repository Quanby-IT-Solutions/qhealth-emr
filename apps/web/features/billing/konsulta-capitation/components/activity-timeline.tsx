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
	"FPE": "default",
	"Follow-up": "secondary",
	"Lab": "outline",
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
					<p className="text-muted-foreground py-4 text-center text-sm">
						No activities recorded for this patient.
					</p>
				)}

				{activities.length > 0 && (
					<ol className="border-muted relative ml-2 space-y-4 border-l py-1">
						{activities.map(activity => (
							<li key={activity.id} className="ml-4">
								<div className="border-background bg-muted-foreground/40 absolute -left-1.5 mt-1.5 size-3 rounded-full border" />
								<div className="flex flex-wrap items-start gap-2">
									<Badge
										variant={TYPE_VARIANT[activity.activityType] ?? "outline"}
										className="h-4 px-1.5 text-[10px]"
									>
										{activity.activityType}
									</Badge>
									<span className="text-muted-foreground text-xs tabular-nums">
										{activity.activityDate}
									</span>
									{activity.sourceRef && (
										<span className="text-muted-foreground/70 font-mono text-[10px]">
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
