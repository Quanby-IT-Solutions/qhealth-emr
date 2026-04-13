"use client"

import { useState } from "react"

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
import { Textarea } from "@/core/components/ui/textarea"
import { useCreateProblemMutation } from "@/features/problems-allergies/api/problems-allergies.hooks"

interface Icd10Result {
	id: string
	code: string
	description: string
	category: string | null
}

interface AddProblemDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	patientId: string
	facilityId: string
}

export function AddProblemDialog({
	open,
	onOpenChange,
	patientId,
	facilityId,
}: AddProblemDialogProps) {
	const [description, setDescription] = useState("")
	const [icd10Code, setIcd10Code] = useState("")
	const [icd10Display, setIcd10Display] = useState("")
	const [onsetDate, setOnsetDate] = useState("")
	const [icd10Search, setIcd10Search] = useState("")
	const [icd10Results, setIcd10Results] = useState<Icd10Result[]>([])
	const [searching, setSearching] = useState(false)

	const createProblem = useCreateProblemMutation()

	async function searchIcd10(query: string) {
		if (query.length < 2) {
			setIcd10Results([])
			return
		}
		setSearching(true)
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/formulary/code-sets/icd10?search=${encodeURIComponent(query)}&limit=10`,
				{ credentials: "include" },
			)
			if (res.ok) {
				const data = (await res.json()) as { data: Icd10Result[] }
				setIcd10Results(data.data)
			}
		} finally {
			setSearching(false)
		}
	}

	function selectIcd10(result: Icd10Result) {
		setIcd10Code(result.code)
		setIcd10Display(result.description)
		if (!description) setDescription(result.description)
		setIcd10Search("")
		setIcd10Results([])
	}

	function handleSubmit() {
		if (!description.trim()) return

		createProblem.mutate(
			{
				facilityId,
				patientId,
				description: description.trim(),
				icd10Code: icd10Code || undefined,
				icd10Display: icd10Display || undefined,
				onsetDate: onsetDate || undefined,
			},
			{
				onSuccess: () => {
					resetForm()
					onOpenChange(false)
				},
			},
		)
	}

	function resetForm() {
		setDescription("")
		setIcd10Code("")
		setIcd10Display("")
		setOnsetDate("")
		setIcd10Search("")
		setIcd10Results([])
	}

	return (
		<Dialog
			open={open}
			onOpenChange={val => {
				if (!val) resetForm()
				onOpenChange(val)
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Add Problem</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4">
					{/* ICD-10 Search */}
					<div className="space-y-2">
						<Label>ICD-10 Code (optional)</Label>
						<Input
							placeholder="Search ICD-10 codes…"
							value={icd10Search}
							onChange={e => {
								setIcd10Search(e.target.value)
								searchIcd10(e.target.value)
							}}
						/>
						{icd10Code && (
							<p className="text-muted-foreground text-xs">
								Selected: <span className="font-medium">{icd10Code}</span> —{" "}
								{icd10Display}
							</p>
						)}
						{searching && (
							<p className="text-muted-foreground text-xs">Searching…</p>
						)}
						{icd10Results.length > 0 && (
							<div className="bg-background max-h-40 overflow-y-auto rounded border">
								{icd10Results.map(r => (
									<button
										key={r.id}
										type="button"
										className="hover:bg-muted w-full px-3 py-2 text-left text-sm"
										onClick={() => selectIcd10(r)}
									>
										<span className="font-mono text-xs">{r.code}</span>{" "}
										<span className="text-muted-foreground">{r.description}</span>
									</button>
								))}
							</div>
						)}
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label>Description *</Label>
						<Textarea
							rows={2}
							placeholder="Problem description"
							value={description}
							onChange={e => setDescription(e.target.value)}
						/>
					</div>

					{/* Onset Date */}
					<div className="space-y-2">
						<Label>Onset Date</Label>
						<Input
							type="date"
							value={onsetDate}
							onChange={e => setOnsetDate(e.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						onClick={handleSubmit}
						disabled={!description.trim() || createProblem.isPending}
					>
						{createProblem.isPending ? "Adding…" : "Add Problem"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
