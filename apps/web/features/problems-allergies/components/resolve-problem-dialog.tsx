"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { useResolveProblemMutation } from "@/features/problems-allergies/api/problems-allergies.hooks"

interface ResolveProblemDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	problemId: string
}

export function ResolveProblemDialog({
	open,
	onOpenChange,
	problemId,
}: ResolveProblemDialogProps) {
	const [resolutionDate, setResolutionDate] = useState(
		new Date().toISOString().split("T")[0] ?? "",
	)

	const resolveProblem = useResolveProblemMutation()

	function handleResolve() {
		resolveProblem.mutate(
			{
				id: problemId,
				resolutionDate: resolutionDate || undefined,
			},
			{
				onSuccess: () => {
					onOpenChange(false)
				},
			},
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Mark Problem as Resolved</DialogTitle>
					<DialogDescription>
						This will move the problem from the active list to the resolved list.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2">
					<Label>Resolution Date</Label>
					<Input
						type="date"
						value={resolutionDate}
						onChange={e => setResolutionDate(e.target.value)}
					/>
				</div>

				<DialogFooter>
					<Button
						onClick={handleResolve}
						disabled={resolveProblem.isPending}
					>
						{resolveProblem.isPending ? "Resolving…" : "Mark Resolved"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
