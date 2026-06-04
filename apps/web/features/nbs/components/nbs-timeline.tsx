"use client"

import { useMemo } from "react"
import { AlertTriangle, CheckCircle, Clock } from "lucide-react"

// ============================================================================
// Types
// ============================================================================

interface NbsTimelineProps {
	birthDatetime: string
	specimenCollectedAt?: string | null
	specimenSentAt?: string | null
	resultReceivedAt?: string | null
}

// NBS window constants (in hours)
const WINDOW_OPEN_H = 24
const WINDOW_CLOSE_H = 48
const OVERDUE_H = 72

// ============================================================================
// Helpers
// ============================================================================

function formatHours(ms: number): string {
	const totalHours = ms / 1_000 / 60 / 60
	if (totalHours < 1) return `${Math.round(totalHours * 60)}m`
	return `${totalHours.toFixed(1)}h`
}

function formatAbsoluteDate(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

// ============================================================================
// Component
// ============================================================================

export function NbsTimeline({
	birthDatetime,
	specimenCollectedAt,
	specimenSentAt,
	resultReceivedAt,
}: NbsTimelineProps) {
	const derived = useMemo(() => {
		const birth = new Date(birthDatetime).getTime()
		const now = Date.now()
		const elapsedMs = now - birth
		const elapsedH = elapsedMs / 1_000 / 60 / 60

		const windowOpenMs = WINDOW_OPEN_H * 60 * 60 * 1000
		const windowCloseMs = WINDOW_CLOSE_H * 60 * 60 * 1000
		const overdueMs = OVERDUE_H * 60 * 60 * 1000

		const inWindow = elapsedMs >= windowOpenMs && elapsedMs <= windowCloseMs
		const beforeWindow = elapsedMs < windowOpenMs
		const overdue = elapsedMs > overdueMs && !specimenCollectedAt

		// Progress bar: 0→72h maps to 0–100%
		const progressPct = Math.min(100, (elapsedMs / overdueMs) * 100)
		const windowStartPct = (WINDOW_OPEN_H / OVERDUE_H) * 100
		const windowEndPct = (WINDOW_CLOSE_H / OVERDUE_H) * 100

		return {
			elapsedH,
			inWindow,
			beforeWindow,
			overdue,
			progressPct,
			windowStartPct,
			windowEndPct,
		}
	}, [birthDatetime, specimenCollectedAt])

	const { elapsedH, inWindow, beforeWindow, overdue, progressPct, windowStartPct, windowEndPct } =
		derived

	return (
		<div className="space-y-3">
			{/* Status banner */}
			{!specimenCollectedAt && (
				<div
					className={[
						"flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
						inWindow
							? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
							: overdue
								? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
								: beforeWindow
									? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
									: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
					].join(" ")}
				>
					{inWindow ? (
						<CheckCircle className="size-4 shrink-0" />
					) : overdue ? (
						<AlertTriangle className="size-4 shrink-0" />
					) : (
						<Clock className="size-4 shrink-0" />
					)}
					<span>
						{inWindow
							? `✓ Within 24–48h window — collect now (${elapsedH.toFixed(1)}h since birth)`
							: overdue
								? `⚠ Overdue — ${elapsedH.toFixed(1)}h since birth, specimen not yet collected`
								: beforeWindow
									? `Awaiting window — ${formatHours(WINDOW_OPEN_H * 60 * 60 * 1000 - (Date.now() - new Date(birthDatetime).getTime()))} until 24h window opens`
									: `Past optimal window — ${elapsedH.toFixed(1)}h since birth`}
					</span>
				</div>
			)}

			{specimenCollectedAt && !resultReceivedAt && (
				<div className="flex items-center gap-2 rounded-md bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
					<CheckCircle className="size-4 shrink-0" />
					Specimen collected at {formatAbsoluteDate(specimenCollectedAt)}
					{specimenSentAt && ` · Sent ${formatAbsoluteDate(specimenSentAt)}`}
				</div>
			)}

			{resultReceivedAt && (
				<div className="flex items-center gap-2 rounded-md bg-purple-100 px-3 py-2 text-sm font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
					<CheckCircle className="size-4 shrink-0" />
					Results received at {formatAbsoluteDate(resultReceivedAt)}
				</div>
			)}

			{/* Timeline bar */}
			<div className="space-y-1">
				<div className="bg-muted relative h-5 overflow-hidden rounded-full">
					{/* 24–48h window highlight */}
					<div
						className="absolute inset-y-0 bg-green-200 dark:bg-green-900/50"
						style={{
							left: `${windowStartPct}%`,
							width: `${windowEndPct - windowStartPct}%`,
						}}
					/>
					{/* Progress fill */}
					<div
						className={[
							"absolute inset-y-0 left-0 rounded-full opacity-70 transition-all",
							overdue ? "bg-red-500" : inWindow ? "bg-green-500" : "bg-amber-400",
						].join(" ")}
						style={{ width: `${progressPct}%` }}
					/>
				</div>

				{/* Labels */}
				<div className="text-muted-foreground relative h-4 text-[10px]">
					<span className="absolute left-0">Birth</span>
					<span className="absolute -translate-x-1/2" style={{ left: `${windowStartPct}%` }}>
						24h
					</span>
					<span className="absolute -translate-x-1/2" style={{ left: `${windowEndPct}%` }}>
						48h
					</span>
					<span className="absolute right-0">72h</span>
				</div>
			</div>

			{/* Milestone dots */}
			<div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
				<div className="flex items-center gap-1.5">
					<div className="bg-foreground size-2 rounded-full" />
					<span>Birth: {formatAbsoluteDate(birthDatetime)}</span>
				</div>
				{specimenCollectedAt && (
					<div className="flex items-center gap-1.5">
						<div className="size-2 rounded-full bg-blue-500" />
						<span>Collected: {formatAbsoluteDate(specimenCollectedAt)}</span>
					</div>
				)}
				{specimenSentAt && (
					<div className="flex items-center gap-1.5">
						<div className="size-2 rounded-full bg-indigo-500" />
						<span>Sent: {formatAbsoluteDate(specimenSentAt)}</span>
					</div>
				)}
				{resultReceivedAt && (
					<div className="flex items-center gap-1.5">
						<div className="size-2 rounded-full bg-purple-500" />
						<span>Resulted: {formatAbsoluteDate(resultReceivedAt)}</span>
					</div>
				)}
			</div>
		</div>
	)
}
