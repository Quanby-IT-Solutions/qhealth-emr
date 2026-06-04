"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	useAuditEventSessionQuery,
	useAuditLogDetailQuery,
} from "@/features/auditor/audit-log/api/audit-log.hooks"
import {
	ACTION_COLORS,
	formatDateTime,
	OUTCOME_COLORS,
	SEVERITY_COLORS,
} from "@/features/auditor/audit-log/lib/audit-log.utils"

export default function AuditLogDetailPage() {
	const { eventId } = useParams<{ eventId: string }>()
	const { data, isLoading, error } = useAuditLogDetailQuery(eventId)
	const [jsonOpen, setJsonOpen] = useState(false)

	const sessionId = data?.sessionId ?? null
	const facilityId = data?.facilityId ?? ""
	const { data: session } = useAuditEventSessionQuery(sessionId ?? "", facilityId)

	if (isLoading) {
		return <p className="text-muted-foreground p-4">Loading audit event...</p>
	}

	if (error || !data) {
		return (
			<div className="space-y-4">
				<Button
					variant="outline"
					size="sm"
					nativeButton={false}
					render={<Link href="/auditor/audit-log" />}
				>
					← Back to Audit Log
				</Button>
				<p className="text-destructive">Audit event not found or failed to load.</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Button
					variant="outline"
					size="sm"
					nativeButton={false}
					render={<Link href="/auditor/audit-log" />}
				>
					← Back
				</Button>
				<div>
					<h1 className="text-xl font-bold">Audit Event Detail</h1>
					<p className="text-muted-foreground font-mono text-xs">{data.id}</p>
				</div>
			</div>

			{/* Event summary */}
			<Card>
				<CardHeader>
					<CardTitle>Event Summary</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
					<div>
						<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							Timestamp
						</p>
						<p>{formatDateTime(data.createdAt)}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							User ID
						</p>
						<p className="font-mono">{data.userId}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							Action
						</p>
						<Badge variant="secondary" className={ACTION_COLORS[data.action] ?? ""}>
							{data.action}
						</Badge>
					</div>
					<div>
						<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							Resource Type
						</p>
						<p>{data.entityType}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							Resource ID
						</p>
						<p className="font-mono text-xs">{data.entityId}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							Severity
						</p>
						<Badge variant="secondary" className={SEVERITY_COLORS[data.severity ?? "info"] ?? ""}>
							{data.severity ?? "info"}
						</Badge>
					</div>
					<div>
						<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							Outcome
						</p>
						<Badge variant="secondary" className={OUTCOME_COLORS[data.outcome ?? "success"] ?? ""}>
							{data.outcome ?? "success"}
						</Badge>
					</div>
					<div>
						<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							IP Address
						</p>
						<p className="font-mono">{data.ipAddress ?? "—"}</p>
						{data.ipAddress && (
							<p className="text-muted-foreground mt-0.5 text-xs">
								{/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$)/.test(data.ipAddress)
									? "Private / internal network"
									: "Public — geo not stored"}
							</p>
						)}
					</div>
					{data.sessionId && (
						<div>
							<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
								Session ID
							</p>
							<p className="font-mono text-xs">{data.sessionId}</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Session timeline */}
			{session && session.events.length > 1 && (
				<Card>
					<CardHeader>
						<CardTitle>Session Timeline ({session.events.length} events)</CardTitle>
					</CardHeader>
					<CardContent>
						<ol className="space-y-2">
							{session.events.map((ev, idx) => (
								<li key={ev.id} className="flex items-start gap-3 text-xs">
									<span className="bg-muted text-muted-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]">
										{idx + 1}
									</span>
									<div className="flex-1">
										<span className="font-medium">{formatDateTime(ev.createdAt)}</span>
										<span className="text-muted-foreground ml-2">{ev.action}</span>
										<span className="text-muted-foreground ml-2">{ev.entityType}</span>
										{ev.id === data.id && (
											<Badge variant="secondary" className="ml-2 text-[10px]">
												current
											</Badge>
										)}
									</div>
								</li>
							))}
						</ol>
					</CardContent>
				</Card>
			)}

			{/* Before / After diff */}
			{(data.beforeState != null || data.afterState != null) && (
				<Card>
					<CardHeader>
						<CardTitle>State Change</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<h4 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
									Before
								</h4>
								<pre className="max-h-80 overflow-auto rounded border border-red-200 bg-red-50 p-3 text-xs dark:border-red-900 dark:bg-red-950/20">
									{data.beforeState ? JSON.stringify(data.beforeState, null, 2) : "—"}
								</pre>
							</div>
							<div>
								<h4 className="mb-2 text-sm font-semibold text-green-700 dark:text-green-400">
									After
								</h4>
								<pre className="max-h-80 overflow-auto rounded border border-green-200 bg-green-50 p-3 text-xs dark:border-green-900 dark:bg-green-950/20">
									{data.afterState ? JSON.stringify(data.afterState, null, 2) : "—"}
								</pre>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Raw payload — keyboard-accessible toggle */}
			{data.metadata != null && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<button
								type="button"
								className="focus-visible:ring-ring flex items-center gap-2 text-base font-semibold focus-visible:ring-2 focus-visible:outline-none"
								aria-expanded={jsonOpen}
								onClick={() => setJsonOpen(v => !v)}
								onKeyDown={e => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault()
										setJsonOpen(v => !v)
									}
								}}
							>
								Raw Metadata
								<span className="text-muted-foreground text-xs font-normal">
									{jsonOpen ? "(click to hide)" : "(click to show)"}
								</span>
							</button>
							{jsonOpen && (
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										navigator.clipboard.writeText(JSON.stringify(data.metadata, null, 2))
									}
								>
									Copy JSON
								</Button>
							)}
						</div>
					</CardHeader>
					{jsonOpen && (
						<CardContent>
							<pre className="bg-muted max-h-96 overflow-auto rounded border p-3 text-xs">
								{JSON.stringify(data.metadata, null, 2)}
							</pre>
						</CardContent>
					)}
				</Card>
			)}
		</div>
	)
}
