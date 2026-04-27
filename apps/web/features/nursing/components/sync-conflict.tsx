"use client"

import { useState } from "react"

import { AlertTriangle, Check, GitMerge, RefreshCw, X } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Separator } from "@/core/components/ui/separator"

// ============================================================================
// Types
// ============================================================================

export type FieldConflict = {
	field: string
	label: string
	localValue: string
	serverValue: string
	resolved?: "local" | "server" | "merged"
	mergedValue?: string
}

export type ConflictRecord = {
	id: string
	recordType: string
	description: string
	localUpdatedAt: string
	serverUpdatedAt: string
	fields: FieldConflict[]
}

type ResolutionMode = "local" | "server" | "merge"

// ============================================================================
// Diff Row
// ============================================================================

interface DiffRowProps {
	conflict: FieldConflict
	resolution: "local" | "server" | "merged" | null
	onChoose: (choice: "local" | "server") => void
}

function DiffRow({ conflict, resolution, onChoose }: DiffRowProps) {
	return (
		<div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start py-2 text-sm">
			{/* Local */}
			<div
				className={`rounded-md border px-3 py-2 cursor-pointer transition-colors ${
					resolution === "local"
						? "border-green-500 bg-green-50 dark:bg-green-900/20"
						: "hover:bg-muted/50"
				}`}
				onClick={() => onChoose("local")}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => e.key === "Enter" && onChoose("local")}
			>
				<p className="text-xs font-medium text-muted-foreground mb-1">Local</p>
				<p className="wrap-break-word">{conflict.localValue || <span className="italic text-muted-foreground">empty</span>}</p>
				{resolution === "local" && (
					<div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
						<Check className="size-3" /> Selected
					</div>
				)}
			</div>

			{/* Field label */}
			<div className="flex flex-col items-center pt-2 gap-1">
				<Badge variant="outline" className="text-xs whitespace-nowrap">
					{conflict.label}
				</Badge>
				<RefreshCw className="size-3 text-muted-foreground" />
			</div>

			{/* Server */}
			<div
				className={`rounded-md border px-3 py-2 cursor-pointer transition-colors ${
					resolution === "server"
						? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
						: "hover:bg-muted/50"
				}`}
				onClick={() => onChoose("server")}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => e.key === "Enter" && onChoose("server")}
			>
				<p className="text-xs font-medium text-muted-foreground mb-1">Server</p>
				<p className="wrap-break-word">{conflict.serverValue || <span className="italic text-muted-foreground">empty</span>}</p>
				{resolution === "server" && (
					<div className="flex items-center gap-1 mt-1 text-blue-600 text-xs">
						<Check className="size-3" /> Selected
					</div>
				)}
			</div>
		</div>
	)
}

// ============================================================================
// Single Conflict Resolver
// ============================================================================

interface ConflictResolverProps {
	record: ConflictRecord
	onResolve: (recordId: string, resolutions: Record<string, "local" | "server">) => void
	onSkip: () => void
}

function ConflictResolver({ record, onResolve, onSkip }: ConflictResolverProps) {
	const [fieldResolutions, setFieldResolutions] = useState<
		Record<string, "local" | "server">
	>({})
	const [mode, setMode] = useState<ResolutionMode>("merge")

	const allResolved =
		mode !== "merge" || record.fields.every((f) => fieldResolutions[f.field] !== undefined)

	function handleChoose(field: string, choice: "local" | "server") {
		setFieldResolutions((prev) => ({ ...prev, [field]: choice }))
	}

	function handleAcceptAll(side: "local" | "server") {
		setMode(side)
		const all: Record<string, "local" | "server"> = {}
		record.fields.forEach((f) => {
			all[f.field] = side
		})
		setFieldResolutions(all)
	}

	function handleSubmit() {
		if (mode === "local") {
			const all: Record<string, "local" | "server"> = {}
			record.fields.forEach((f) => {
				all[f.field] = "local"
			})
			onResolve(record.id, all)
		} else if (mode === "server") {
			const all: Record<string, "local" | "server"> = {}
			record.fields.forEach((f) => {
				all[f.field] = "server"
			})
			onResolve(record.id, all)
		} else {
			onResolve(record.id, fieldResolutions)
		}
	}

	return (
		<div className="space-y-4">
			{/* Context */}
			<div className="rounded-md border bg-amber-50 dark:bg-amber-900/10 px-4 py-3">
				<div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
					<AlertTriangle className="size-4 mt-0.5 shrink-0" />
					<div>
						<p className="text-sm font-medium">Conflict in {record.recordType}</p>
						<p className="text-xs mt-0.5">{record.description}</p>
						<p className="text-xs mt-1 opacity-70">
							Local modified{" "}
							{new Date(record.localUpdatedAt).toLocaleString("en-PH")} · Server
							modified {new Date(record.serverUpdatedAt).toLocaleString("en-PH")}
						</p>
					</div>
				</div>
			</div>

			{/* Bulk actions */}
			<div className="flex items-center gap-2 flex-wrap">
				<span className="text-xs text-muted-foreground">Quick actions:</span>
				<Button
					variant="outline"
					size="sm"
					onClick={() => handleAcceptAll("local")}
					className="text-green-700 border-green-300 hover:bg-green-50"
				>
					<Check className="mr-1.5 size-3.5" />
					Accept All Local
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => handleAcceptAll("server")}
					className="text-blue-700 border-blue-300 hover:bg-blue-50"
				>
					<Check className="mr-1.5 size-3.5" />
					Accept All Server
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						setMode("merge")
						setFieldResolutions({})
					}}
				>
					<GitMerge className="mr-1.5 size-3.5" />
					Manual Merge
				</Button>
			</div>

			<Separator />

			{/* Field-level diff */}
			<ScrollArea className="max-h-96">
				<div className="divide-y">
					{record.fields.map((f) => (
						<DiffRow
							key={f.field}
							conflict={f}
							resolution={
								mode !== "merge"
									? mode
									: (fieldResolutions[f.field] ?? null)
							}
							onChoose={(choice) => {
								setMode("merge")
								handleChoose(f.field, choice)
							}}
						/>
					))}
				</div>
			</ScrollArea>

			{/* Submit */}
			<div className="flex justify-between items-center">
				<Button variant="ghost" onClick={onSkip}>
					<X className="mr-1.5 size-3.5" />
					Skip for Now
				</Button>
				<Button onClick={handleSubmit} disabled={!allResolved}>
					Apply Resolution
				</Button>
			</div>
		</div>
	)
}

// ============================================================================
// Main Conflict Panel (multiple conflicts)
// ============================================================================

interface SyncConflictProps {
	conflicts: ConflictRecord[]
	onAllResolved?: () => void
}

export function SyncConflict({ conflicts, onAllResolved }: SyncConflictProps) {
	const [remaining, setRemaining] = useState<ConflictRecord[]>(conflicts)
	const [resolvedCount, setResolvedCount] = useState(0)

	function handleResolve(
		recordId: string,
		_resolutions: Record<string, "local" | "server">
	) {
		// In a real implementation, apply resolutions to local store and re-sync.
		// Here we just remove the record from the list.
		const next = remaining.filter((r) => r.id !== recordId)
		setRemaining(next)
		setResolvedCount((c) => c + 1)
		if (next.length === 0) onAllResolved?.()
	}

	function handleSkip() {
		if (remaining.length <= 1) return
		// Rotate: move first to end
		setRemaining((prev) => [...prev.slice(1), prev[0]!])
	}

	if (remaining.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center py-10 text-center">
					<Check className="size-12 text-green-500 mb-3" />
					<p className="font-semibold">All conflicts resolved</p>
					<p className="text-sm text-muted-foreground mt-1">
						{resolvedCount} record{resolvedCount !== 1 ? "s" : ""} resolved.
						Sync will proceed automatically.
					</p>
				</CardContent>
			</Card>
		)
	}

	const current = remaining[0]!

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between text-base">
						<span className="flex items-center gap-2">
							<AlertTriangle className="size-4 text-red-500" />
							Sync Conflicts
						</span>
						<Badge variant="destructive">
							{remaining.length} remaining
						</Badge>
					</CardTitle>
					<CardDescription>
						Resolve each conflict before records can be synchronized. Choose which
						version to keep for each conflicting field.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ConflictResolver
						record={current}
						onResolve={handleResolve}
						onSkip={handleSkip}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
