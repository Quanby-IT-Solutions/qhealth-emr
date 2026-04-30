"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Clock, XCircle } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { WORKFLOW_LABELS, useSlaEventsByEncounterQuery, type SlaEvent } from "@/features/sla/api/sla.hooks"

// ============================================================================
// Helpers
// ============================================================================

function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${Math.round(minutes)}m`
	const h = Math.floor(minutes / 60)
	const m = Math.round(minutes % 60)
	return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getProgressPct(elapsed: number, target: number): number {
	return Math.min(Math.round((elapsed / target) * 100), 100)
}

// ============================================================================
// Single Alert Item
// ============================================================================

function SlaAlertItem({ event, onDismiss }: { event: SlaEvent; onDismiss: (id: string) => void }) {
	const pct = getProgressPct(event.elapsedMinutes, event.targetMinutes)
	const isExceeded = event.status === "exceeded"

	const outerClass = isExceeded
		? "border border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200"
		: "border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"

	const iconClass = isExceeded ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"

	const Icon = isExceeded ? XCircle : AlertTriangle

	return (
		<div className={`flex items-start justify-between gap-3 rounded-md px-4 py-3 ${outerClass}`}>
			<div className="flex items-start gap-2">
				<Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} />
				<div className="space-y-0.5">
					<p className="text-sm font-semibold">
						{isExceeded ? "SLA Exceeded" : "SLA Approaching Limit"} —{" "}
						{WORKFLOW_LABELS[event.workflowType]}
					</p>
					<p className="text-xs">
					<span className="font-medium">{event.patientName ?? "—"}</span> ·{" "}
						{formatMinutes(event.elapsedMinutes)} elapsed of {formatMinutes(event.targetMinutes)} target (
						{pct}%)
					</p>
				</div>
			</div>
			<button
				type="button"
				aria-label="Dismiss alert"
				className="shrink-0 text-current opacity-60 hover:opacity-100"
				onClick={() => onDismiss(event.id)}
			>
				<span className="sr-only">Dismiss</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	)
}

// ============================================================================
// Alert Banner (inline on encounter header)
// ============================================================================

interface SlaAlertBannerProps {
	encounterId: string
}

export function SlaAlertBanner({ encounterId }: SlaAlertBannerProps) {
	const { data: events } = useSlaEventsByEncounterQuery(encounterId)
	const [dismissed, setDismissed] = useState<Set<string>>(new Set())

	function dismiss(id: string) {
		setDismissed(prev => new Set([...prev, id]))
	}

	const visible = (events ?? []).filter(
		e =>
			(e.status === "approaching" || e.status === "exceeded") &&
			!dismissed.has(e.id)
	)

	if (visible.length === 0) return null

	return (
		<div className="space-y-2">
			{visible.map(event => (
				<SlaAlertItem key={event.id} event={event} onDismiss={dismiss} />
			))}
		</div>
	)
}

// ============================================================================
// Global Alert Panel (used on SLA dashboard)
// ============================================================================

interface SlaAlertPanelProps {
	events: SlaEvent[]
}

export function SlaAlertPanel({ events }: SlaAlertPanelProps) {
	const [dismissed, setDismissed] = useState<Set<string>>(new Set())

	function dismiss(id: string) {
		setDismissed(prev => new Set([...prev, id]))
	}

	const exceeded = events.filter(e => e.status === "exceeded" && !dismissed.has(e.id))
	const approaching = events.filter(e => e.status === "approaching" && !dismissed.has(e.id))

	if (exceeded.length === 0 && approaching.length === 0) return null

	return (
		<div className="space-y-2">
			{exceeded.map(event => (
				<SlaAlertItem key={event.id} event={event} onDismiss={dismiss} />
			))}
			{approaching.map(event => (
				<SlaAlertItem key={event.id} event={event} onDismiss={dismiss} />
			))}
		</div>
	)
}
