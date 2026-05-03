"use client"

import { Badge } from "@/core/components/ui/badge"
import { Skeleton } from "@/core/components/ui/skeleton"

interface DeliveryRecord {
	id: string
	channel: string
	recipient: string | null
	status: string
	sentAt: Date | string | null
}

interface DeliveryActivityPanelProps {
	records: DeliveryRecord[]
	isLoading: boolean
}

const CHANNEL_LABEL: Record<string, string> = {
	philhealth_portal: "PhilHealth Portal",
	email: "Email",
	print: "Print",
	fax: "Fax",
}

export function DeliveryActivityPanel({ records, isLoading }: DeliveryActivityPanelProps) {
	if (isLoading) {
		return (
			<div className="space-y-2">
				{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
			</div>
		)
	}

	if (records.length === 0) {
		return (
			<p className="text-xs text-muted-foreground text-center py-4">
				No deliveries recorded yet.
			</p>
		)
	}

	return (
		<div className="space-y-2">
			{records.map(r => {
				const sentAt = r.sentAt ? new Date(r.sentAt) : null
				return (
					<div key={r.id} className="flex items-start gap-3 rounded-md border bg-muted/20 px-3 py-2 text-xs">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="font-medium">{CHANNEL_LABEL[r.channel] ?? r.channel}</span>
								{r.recipient && (
									<span className="text-muted-foreground truncate">{r.recipient}</span>
								)}
							</div>
							{sentAt && (
								<p className="text-muted-foreground mt-0.5">
									{sentAt.toLocaleDateString("en-PH", {
										year: "numeric", month: "short", day: "numeric",
										hour: "2-digit", minute: "2-digit",
									})}
								</p>
							)}
						</div>
						<Badge
							variant={r.status === "sent" ? "default" : r.status === "failed" ? "destructive" : "secondary"}
							className="text-[10px] h-4 px-1 shrink-0"
						>
							{r.status}
						</Badge>
					</div>
				)
			})}
		</div>
	)
}
