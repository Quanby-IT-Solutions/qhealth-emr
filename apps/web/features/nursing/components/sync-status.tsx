"use client"

import {
	AlertTriangle,
	CheckCircle2,
	CloudOff,
	CloudUpload,
	RefreshCw,
	Wifi,
	WifiOff,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Progress } from "@/core/components/ui/progress"

// ============================================================================
// Types
// ============================================================================

export type SyncState = "online" | "offline" | "syncing" | "conflict"

interface QueuedItem {
	id: string
	type: "vital_sign" | "mar_entry" | "tar_entry" | "io_entry" | "hai_tag" | "handoff"
	description: string
	createdAt: string
}

// ============================================================================
// Label helpers
// ============================================================================

const QUEUE_LABELS: Record<QueuedItem["type"], string> = {
	vital_sign: "Vital Signs",
	mar_entry: "MAR Administration",
	tar_entry: "TAR Treatment",
	io_entry: "I/O Entry",
	hai_tag: "HAI Tag",
	handoff: "Shift Handoff",
}

function formatRelative(dateStr: string) {
	const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
	if (diff < 1) return "Just now"
	if (diff === 1) return "1 min ago"
	if (diff < 60) return `${diff} min ago`
	return `${Math.floor(diff / 60)}h ago`
}

// ============================================================================
// Sync Status Banner (compact — for embedding in headers)
// ============================================================================

interface SyncStatusBannerProps {
	syncState: SyncState
	pendingCount: number
	lastSyncedAt?: string
}

export function SyncStatusBanner({
	syncState,
	pendingCount,
	lastSyncedAt,
}: SyncStatusBannerProps) {
	if (syncState === "online" && pendingCount === 0) return null

	const configs: Record<
		SyncState,
		{ color: string; icon: React.ReactNode; text: string }
	> = {
		online: {
			color: "bg-green-50 border-green-200 text-green-700",
			icon: <Wifi className="size-3.5" />,
			text: "Online",
		},
		offline: {
			color: "bg-amber-50 border-amber-200 text-amber-700",
			icon: <WifiOff className="size-3.5" />,
			text: `Offline — ${pendingCount} record${pendingCount !== 1 ? "s" : ""} queued`,
		},
		syncing: {
			color: "bg-blue-50 border-blue-200 text-blue-700",
			icon: <RefreshCw className="size-3.5 animate-spin" />,
			text: "Syncing…",
		},
		conflict: {
			color: "bg-red-50 border-red-200 text-red-700",
			icon: <AlertTriangle className="size-3.5" />,
			text: "Sync conflict — review required",
		},
	}

	const cfg = configs[syncState]

	return (
		<div className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${cfg.color}`}>
			{cfg.icon}
			<span>{cfg.text}</span>
			{lastSyncedAt && syncState !== "syncing" && (
				<span className="opacity-70">· Last sync {formatRelative(lastSyncedAt)}</span>
			)}
		</div>
	)
}

// ============================================================================
// Full Sync Status Panel
// ============================================================================

interface SyncStatusProps {
	syncState: SyncState
	queue: QueuedItem[]
	progress: number
	lastSyncedAt: string | null
	onSync: () => void
}

export function SyncStatus({
	syncState,
	queue,
	progress,
	lastSyncedAt,
	onSync,
}: SyncStatusProps) {
	return (
		<div className="space-y-4">
			{/* Status card */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center justify-between text-base">
						<span className="flex items-center gap-2">
							{syncState === "offline" ? (
								<CloudOff className="size-4 text-amber-500" />
							) : syncState === "syncing" ? (
								<RefreshCw className="size-4 text-blue-500 animate-spin" />
							) : syncState === "conflict" ? (
								<AlertTriangle className="size-4 text-red-500" />
							) : (
								<CloudUpload className="size-4 text-green-500" />
							)}
							Offline Sync Status
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={onSync}
							disabled={syncState === "offline" || syncState === "syncing"}
						>
							<RefreshCw className="mr-1.5 size-3.5" />
							Sync Now
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* State display */}
					{syncState === "online" && queue.length === 0 && (
						<div className="flex items-center gap-2 text-sm text-green-600">
							<CheckCircle2 className="size-4" />
							All records synchronized.{" "}
							{lastSyncedAt && (
								<>Last sync: {new Date(lastSyncedAt).toLocaleString("en-PH")}</>
							)}
						</div>
					)}

					{syncState === "offline" && (
						<div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
							<p className="font-medium">You are offline.</p>
							<p className="text-xs mt-0.5">
								{queue.length > 0
									? `${queue.length} record${queue.length !== 1 ? "s" : ""} will sync automatically when connection is restored.`
									: "No pending records. Continue charting — records will be saved locally."}
							</p>
						</div>
					)}

					{syncState === "syncing" && (
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span>Uploading {queue.length} records…</span>
								<span>{progress}%</span>
							</div>
							<Progress value={progress} />
						</div>
					)}

					{syncState === "conflict" && (
						<div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
							<p className="font-medium">Sync conflict detected.</p>
							<p className="text-xs mt-0.5">
								Some records were modified both locally and on the server. Review
								and resolve conflicts before continuing.
							</p>
						</div>
					)}

					{/* Queue list */}
					{queue.length > 0 && (
						<div className="space-y-2">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Pending Queue ({queue.length})
							</p>
							{queue.map((item) => (
								<div
									key={item.id}
									className="flex items-center justify-between text-sm rounded-md border px-3 py-2"
								>
									<div>
										<span className="font-medium">{QUEUE_LABELS[item.type]}</span>
										<span className="text-muted-foreground mx-1">·</span>
										<span className="text-muted-foreground text-xs">
											{item.description}
										</span>
									</div>
									<span className="text-xs text-muted-foreground">
										{formatRelative(item.createdAt)}
									</span>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Offline mode explanation */}
			<Card className="bg-muted/30">
				<CardContent className="py-4">
					<p className="text-sm font-medium mb-1">About Offline Mode</p>
					<p className="text-xs text-muted-foreground">
						When offline, vital signs, MAR administrations, I/O entries, and other
						nursing records are saved locally. They will automatically synchronize
						with the server when your connection is restored. During offline mode,
						patient summaries cached within the last 24 hours remain accessible.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
