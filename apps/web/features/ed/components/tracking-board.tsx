"use client"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { acuityColor } from "@/features/ed/lib/acuity-utils"

interface QueueItem {
	id: string
	type: "pre_encounter" | "encounter"
	patientName: string
	patientMrn: string | null
	traumaAlias: string | null
	acuityLevel: number | null
	acuityScale: "esi" | "ats" | "ctas" | null
	chiefComplaint: string | null
	arrivalTime: string | Date
	waitMinutes: number
	queueStatus: "waiting" | "triage" | "being_seen" | "disposition"
	assignedProvider: string | null
	bedNumber: string | null
	wardName: string | null
}

interface TrackingBoardProps {
	items: QueueItem[]
	facilityId: string
}

const COLUMNS: { key: QueueItem["queueStatus"]; label: string; color: string }[] = [
	{ key: "triage", label: "Triage", color: "border-t-yellow-500" },
	{ key: "waiting", label: "Waiting", color: "border-t-blue-500" },
	{ key: "being_seen", label: "Being Seen", color: "border-t-green-500" },
	{ key: "disposition", label: "Disposition", color: "border-t-red-500" },
]

export function TrackingBoard({ items }: TrackingBoardProps) {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			{COLUMNS.map(col => {
				const columnItems = items.filter(i => i.queueStatus === col.key)

				return (
					<div key={col.key} className="space-y-2">
						<Card className={`border-t-4 ${col.color}`}>
							<CardHeader className="pb-2">
								<CardTitle className="flex items-center justify-between text-sm">
									{col.label}
									<Badge variant="secondary">{columnItems.length}</Badge>
								</CardTitle>
							</CardHeader>
						</Card>

						<div className="space-y-2">
							{columnItems.length === 0 ? (
								<Card>
									<CardContent className="text-muted-foreground py-6 text-center text-sm">
										No patients
									</CardContent>
								</Card>
							) : (
								columnItems.map(item => (
									<Card key={`${item.type}-${item.id}`} className="hover:shadow-md transition-shadow">
										<CardContent className="space-y-1 p-3">
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium">
													{item.type === "pre_encounter"
														? item.traumaAlias ?? "Unknown"
														: item.patientName}
												</span>
												{item.acuityLevel && (
													<Badge className={`${acuityColor(item.acuityLevel)} text-xs`}>
														{item.acuityLevel}
													</Badge>
												)}
											</div>

											{item.patientMrn && (
												<p className="text-muted-foreground text-xs">
													MRN: {item.patientMrn}
												</p>
											)}

											{item.chiefComplaint && (
												<p className="text-muted-foreground max-w-full truncate text-xs">
													{item.chiefComplaint}
												</p>
											)}

											<div className="text-muted-foreground flex items-center justify-between text-xs">
												<span>{item.waitMinutes}m wait</span>
												{item.bedNumber && (
													<span>Bed: {item.bedNumber}</span>
												)}
											</div>

											{item.assignedProvider && (
												<p className="text-xs">
													Provider: {item.assignedProvider}
												</p>
											)}

											{item.type === "pre_encounter" && (
												<Badge variant="outline" className="text-xs">
													Pre-encounter
												</Badge>
											)}
										</CardContent>
									</Card>
								))
							)}
						</div>
					</div>
				)
			})}
		</div>
	)
}
