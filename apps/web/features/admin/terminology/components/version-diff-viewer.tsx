"use client"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

interface DiffEntry {
	code: string
	display: string
	type: "added" | "removed" | "deprecated"
}

interface VersionDiffViewerProps {
	fromVersion: string
	toVersion: string
	entries: DiffEntry[]
}

export function VersionDiffViewer({ fromVersion, toVersion, entries }: VersionDiffViewerProps) {
	const added = entries.filter(e => e.type === "added")
	const removed = entries.filter(e => e.type === "removed")
	const deprecated = entries.filter(e => e.type === "deprecated")

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<span>{fromVersion}</span>
				<span>-&gt;</span>
				<span>{toVersion}</span>
			</div>
			{added.length > 0 && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-emerald-600">Added ({added.length})</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1">
						{added.map(e => (
							<div key={e.code} className="font-mono text-xs">
								{e.code} - {e.display}
							</div>
						))}
					</CardContent>
				</Card>
			)}
			{removed.length > 0 && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-destructive">Removed ({removed.length})</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1">
						{removed.map(e => (
							<div key={e.code} className="font-mono text-xs">
								{e.code} - {e.display}
							</div>
						))}
					</CardContent>
				</Card>
			)}
			{deprecated.length > 0 && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-amber-600">
							Deprecated ({deprecated.length})
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1">
						{deprecated.map(e => (
							<div key={e.code} className="font-mono text-xs">
								<Badge variant="outline" className="text-[10px]">
									deprecated
								</Badge>{" "}
								{e.code} - {e.display}
							</div>
						))}
					</CardContent>
				</Card>
			)}
			{entries.length === 0 && (
				<p className="py-4 text-center text-sm text-muted-foreground">No differences found.</p>
			)}
		</div>
	)
}
