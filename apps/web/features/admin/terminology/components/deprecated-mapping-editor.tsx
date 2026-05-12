"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

import { useDeprecateCodeMutation } from "../api/terminology.hooks"

interface DeprecatedMappingEditorProps {
	codeId: string
	codeDisplay: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function DeprecatedMappingEditor({
	codeId,
	codeDisplay,
	open,
	onOpenChange,
}: DeprecatedMappingEditorProps) {
	const [replacedByCodeId, setReplacedByCodeId] = useState("")
	const deprecateMutation = useDeprecateCodeMutation()

	async function handleSave() {
		if (!replacedByCodeId.trim()) return
		try {
			await deprecateMutation.mutateAsync({
				id: codeId,
				replacedByCodeId: replacedByCodeId.trim(),
			})
			toast.success("Code deprecated.")
			onOpenChange(false)
		} catch {
			toast.error("Failed to deprecate code.")
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Deprecate Code</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<p className="text-sm">
						Deprecating: <span className="font-medium">{codeDisplay}</span>
					</p>
					<div className="space-y-1.5">
						<Label htmlFor="replacement-code-id">Replacement code ID *</Label>
						<Input
							id="replacement-code-id"
							placeholder="Enter replacement code UUID"
							value={replacedByCodeId}
							onChange={e => setReplacedByCodeId(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={!replacedByCodeId.trim() || deprecateMutation.isPending}
					>
						{deprecateMutation.isPending ? "Saving..." : "Deprecate"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
