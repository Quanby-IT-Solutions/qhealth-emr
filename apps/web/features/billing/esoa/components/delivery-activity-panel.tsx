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
				{[...Array(2)].map((_, i) => (
					<Skeleton key={i} className="h-12 w-full" />
				))}
			</div>
		)
	}

	if (records.length === 0) {
		return (
			<p className="text-muted-foreground py-4 text-center text-xs">No deliveries recorded yet.</p>
		)
	}

	return (
		<div className="space-y-2">
			{records.map(r => {
				const sentAt = r.sentAt ? new Date(r.sentAt) : null
				return (
					<div
						key={r.id}
						className="bg-muted/20 flex items-start gap-3 rounded-md border px-3 py-2 text-xs"
					>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-medium">{CHANNEL_LABEL[r.channel] ?? r.channel}</span>
								{r.recipient && (
									<span className="text-muted-foreground truncate">{r.recipient}</span>
								)}
							</div>
							{sentAt && (
								<p className="text-muted-foreground mt-0.5">
									{sentAt.toLocaleDateString("en-PH", {
										year: "numeric",
										month: "short",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</p>
							)}
						</div>
						<Badge
							variant={
								r.status === "sent"
									? "default"
									: r.status === "failed"
										? "destructive"
										: "secondary"
							}
							className="h-4 shrink-0 px-1 text-[10px]"
						>
							{r.status}
						</Badge>
					</div>
				)
			})}
		</div>
	)
}
