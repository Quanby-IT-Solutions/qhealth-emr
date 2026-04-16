"use client"

import { useState } from "react"

import { AlertTriangle, Minus, Plus } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { Textarea } from "@/core/components/ui/textarea"
import { useCreateAddendumMutation } from "@/features/clinical-docs/api/clinical-docs.hooks"

interface DiffLine {
	type: "unchanged" | "removed" | "added"
	text: string
	lineNumber: number
}

/**
 * Produces a simple line-by-line diff between original and amended content.
 * Uses a basic longest-common-subsequence approach.
 */
function computeDiff(original: string, amended: string): DiffLine[] {
	const origLines = original.split("\n")
	const amendLines = amended.split("\n")

	// Build LCS table
	const m = origLines.length
	const n = amendLines.length
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (origLines[i - 1] === amendLines[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1] + 1
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
			}
		}
	}

	// Back-track to build diff
	const result: DiffLine[] = []
	let i = m
	let j = n
	let lineNum = 1

	const ops: { type: DiffLine["type"]; text: string }[] = []

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && origLines[i - 1] === amendLines[j - 1]) {
			ops.unshift({ type: "unchanged", text: origLines[i - 1] })
			i--
			j--
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			ops.unshift({ type: "added", text: amendLines[j - 1] })
			j--
		} else {
			ops.unshift({ type: "removed", text: origLines[i - 1] })
			i--
		}
	}

	ops.forEach(op => {
		result.push({ ...op, lineNumber: lineNum++ })
	})

	return result
}

interface AmendmentFormProps {
	noteId: string
	originalContent: string
	onSuccess: () => void
	onCancel: () => void
}

/**
 * Amendment (addendum) form that shows:
 *  - A reason field
 *  - A proposed-amendment text area
 *  - A side-by-side or unified diff view comparing original vs proposed
 *
 * Submits as a signed addendum via `useCreateAddendumMutation`.
 */
export function AmendmentForm({
	noteId,
	originalContent,
	onSuccess,
	onCancel,
}: AmendmentFormProps) {
	const [reason, setReason] = useState("")
	const [amendedContent, setAmendedContent] = useState(originalContent)

	const createAddendum = useCreateAddendumMutation()

	const diff = computeDiff(originalContent, amendedContent)
	const hasChanges = diff.some(l => l.type !== "unchanged")
	const removedCount = diff.filter(l => l.type === "removed").length
	const addedCount = diff.filter(l => l.type === "added").length

	function handleSubmit() {
		if (!reason.trim() || !amendedContent.trim() || !hasChanges) return

		// Store both old and new content in the addendum so reviewers can compare
		const addendumContent = [
			"**AMENDMENT**",
			"",
			"**Reason:**",
			reason,
			"",
			"**Amended Content:**",
			amendedContent,
		].join("\n")

		createAddendum.mutate(
			{ noteId, content: addendumContent, reason },
			{ onSuccess }
		)
	}

	return (
		<div className="space-y-4">
			{/* Amendment reason */}
			<div className="space-y-2">
				<Label>
					Reason for Amendment <span className="text-destructive">*</span>
				</Label>
				<Textarea
					rows={2}
					placeholder="e.g. Medication dosage correction, additional findings documented…"
					value={reason}
					onChange={e => setReason(e.target.value)}
				/>
			</div>

			{/* Amendment editor + diff view */}
			<Tabs defaultValue="edit">
				<TabsList>
					<TabsTrigger value="edit">Edit Amendment</TabsTrigger>
					<TabsTrigger value="diff">
						Review Changes
						{hasChanges && (
							<span className="ml-1.5 flex gap-1 text-xs">
								<Badge variant="destructive" className="px-1 py-0 text-xs">
									<Minus className="size-2.5" />
									{removedCount}
								</Badge>
								<Badge className="bg-green-600 px-1 py-0 text-xs hover:bg-green-700">
									<Plus className="size-2.5" />
									{addedCount}
								</Badge>
							</span>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="edit" className="mt-3">
					<div className="space-y-2">
						<p className="text-muted-foreground text-xs">
							Modify the content below. Changes will be recorded as an addendum.
						</p>
						<Textarea
							rows={14}
							value={amendedContent}
							onChange={e => setAmendedContent(e.target.value)}
							className="font-mono text-sm"
						/>
					</div>
				</TabsContent>

				<TabsContent value="diff" className="mt-3">
					{!hasChanges ? (
						<div className="rounded-md border p-4 text-center">
							<p className="text-muted-foreground text-sm">
								No changes detected yet.
							</p>
						</div>
					) : (
						<div className="overflow-auto rounded-md border text-sm">
							<div className="bg-muted/50 flex items-center justify-between border-b px-3 py-2 text-xs font-medium">
								<span>Diff — Original vs Proposed Amendment</span>
								<div className="flex gap-2">
									<span className="flex items-center gap-1 text-red-600">
										<Minus className="size-3" />
										{removedCount} removed
									</span>
									<span className="flex items-center gap-1 text-green-600">
										<Plus className="size-3" />
										{addedCount} added
									</span>
								</div>
							</div>
							<div className="divide-y font-mono">
								{diff.map((line, idx) => (
									<div
										key={idx}
										className={
											line.type === "removed"
												? "bg-red-50 dark:bg-red-950/20"
												: line.type === "added"
													? "bg-green-50 dark:bg-green-950/20"
													: ""
										}
									>
										<div className="flex">
											{/* Gutter */}
											<span
												className={`select-none px-3 py-1 text-xs ${
													line.type === "removed"
														? "text-red-500"
														: line.type === "added"
															? "text-green-600"
															: "text-muted-foreground"
												}`}
											>
												{line.type === "removed" ? "−" : line.type === "added" ? "+" : " "}
											</span>
											{/* Content */}
											<span
												className={`flex-1 px-2 py-1 ${
													line.type === "removed"
														? "text-red-700 line-through dark:text-red-400"
														: line.type === "added"
															? "text-green-700 dark:text-green-400"
															: ""
												}`}
											>
												{line.text || <span className="opacity-25">empty line</span>}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</TabsContent>
			</Tabs>

			{/* Warning */}
			<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
				<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
				<p className="text-amber-800 dark:text-amber-300 text-sm">
					This amendment will be appended as a signed addendum to the original note.
					The original note remains unchanged in the permanent record.
				</p>
			</div>

			<Separator />

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button
					type="button"
					onClick={handleSubmit}
					disabled={
						!reason.trim() ||
						!hasChanges ||
						createAddendum.isPending
					}
				>
					{createAddendum.isPending ? "Submitting…" : "Submit Amendment"}
				</Button>
			</div>

			{createAddendum.isError && (
				<p className="text-destructive text-sm">{createAddendum.error.message}</p>
			)}
		</div>
	)
}
