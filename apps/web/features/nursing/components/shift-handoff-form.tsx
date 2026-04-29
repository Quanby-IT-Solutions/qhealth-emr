"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useCreateHandoffMutation,
	useFinalizeHandoffMutation,
	useGenerateHandoffMutation,
	useHandoffsQuery,
} from "@/features/nursing/api/nursing.hooks"

import { NewsScoreBadge } from "./news-score-badge"

function formatDateTime(dateStr: string | null | undefined) {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

interface ShiftHandoffFormProps {
	encounterId: string
	facilityId: string
	readOnly?: boolean
}

export function ShiftHandoffForm({ encounterId, facilityId, readOnly }: ShiftHandoffFormProps) {
	const [createOpen, setCreateOpen] = useState(false)
	const [notes, setNotes] = useState("")

	const handoffs = useHandoffsQuery({ encounterId, facilityId })
	const generateHandoff = useGenerateHandoffMutation()
	const createHandoff = useCreateHandoffMutation()
	const finalizeHandoff = useFinalizeHandoffMutation()

	function handleGenerate() {
		generateHandoff.mutate({ encounterId, facilityId })
	}

	function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		createHandoff.mutate(
			{
				facilityId,
				encounterId,
				handoffNotes: notes || undefined,
			},
			{
				onSuccess: () => {
					setCreateOpen(false)
					setNotes("")
				},
			}
		)
	}

	const generated = generateHandoff.data

	return (
		<div className="space-y-4">
			{/* Generate summary card — nurses only */}
			{!readOnly && <Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Handoff Summary Generator</CardTitle>
					<Button
						size="sm"
						variant="outline"
						onClick={handleGenerate}
						disabled={generateHandoff.isPending}
					>
						{generateHandoff.isPending ? "Generating…" : "Auto-Generate"}
					</Button>
				</CardHeader>
				{generated && (
					<CardContent className="space-y-3 text-sm">
						<div>
							<span className="font-medium">Active Problems: </span>
							{generated.activeProblems.length > 0
								? generated.activeProblems.map(p => p.description).join(", ")
								: "None"}
						</div>
						<Separator />
						<div>
							<span className="font-medium">Current Medications: </span>
							{generated.currentMedications.length > 0
								? generated.currentMedications
										.map(m => `${m.genericName} ${m.dose} ${m.frequency}`)
										.join("; ")
								: "None"}
						</div>
						<Separator />
						<div className="flex items-center gap-2">
							<span className="font-medium">NEWS Score:</span>
							{generated.newsScore != null ? (
								<NewsScoreBadge
									score={generated.newsScore}
									riskLevel={generated.newsRiskLevel}
								/>
							) : (
								"N/A"
							)}
						</div>
						{generated.ioBalance && (
							<>
								<Separator />
								<div>
									<span className="font-medium">24-hr Fluid Balance: </span>
									Intake {generated.ioBalance.totalIntake} mL &bull; Output{" "}
									{generated.ioBalance.totalOutput} mL &bull; Net{" "}
									<span
										className={
											generated.ioBalance.netBalance >= 0
												? "text-green-600"
												: "text-red-600"
										}
									>
										{generated.ioBalance.netBalance >= 0 ? "+" : ""}
										{generated.ioBalance.netBalance} mL
									</span>
								</div>
							</>
						)}
						<Separator />
						<div>
							<span className="font-medium">Pending Orders: </span>
							{generated.pendingOrders}
						</div>
					</CardContent>
				)}
			</Card>}

			{/* New handoff dialog — nurses only */}
			{!readOnly && <Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Create Shift Handoff</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreate} className="grid gap-3">
						{/* Pre-fill notes if generated */}
						{generated && !notes && (
							<div className="mb-2">
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => {
										const lines: string[] = []
										lines.push(
											`Active Problems: ${generated.activeProblems.map(p => p.description).join(", ") || "None"}`
										)
										lines.push(
											`Medications: ${generated.currentMedications.map(m => `${m.genericName} ${m.dose} ${m.frequency}`).join("; ") || "None"}`
										)
										if (generated.newsScore != null) {
											lines.push(
												`NEWS: ${generated.newsScore} (${generated.newsRiskLevel ?? ""})`
											)
										}
										if (generated.ioBalance) {
											const b = generated.ioBalance
											lines.push(
												`I/O Balance: Intake ${b.totalIntake}mL, Output ${b.totalOutput}mL, Net ${b.netBalance}mL`
											)
										}
										lines.push(`Pending Orders: ${generated.pendingOrders}`)
										setNotes(lines.join("\n"))
									}}
								>
									Copy generated summary
								</Button>
							</div>
						)}
						<div className="space-y-1.5">
							<Label htmlFor="handoffNotes">Handoff Notes</Label>
							<Textarea
								id="handoffNotes"
								rows={6}
								value={notes}
								onChange={e => setNotes(e.target.value)}
								placeholder="Clinical summary for incoming nurse…"
							/>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setCreateOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={createHandoff.isPending}>
								{createHandoff.isPending ? "Saving…" : "Create Handoff"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>}

			{/* Handoff history */}
			<div className="flex items-center justify-between">
				<h3 className="font-semibold">Shift Handoffs</h3>
				{!readOnly && (
					<Button size="sm" onClick={() => setCreateOpen(true)}>
						New Handoff
					</Button>
				)}
			</div>

			{handoffs.isLoading ? (
				<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
			) : !handoffs.data?.data?.length ? (
				<div className="text-muted-foreground py-8 text-center text-sm">
					No handoff reports yet.
				</div>
			) : (
				<div className="overflow-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Created</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead>Signed At</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{handoffs.data.data.map(h => (
								<TableRow key={h.id}>
									<TableCell className="whitespace-nowrap">
										{formatDateTime(h.createdAt)}
									</TableCell>
									<TableCell>
										<Badge variant={h.status === "signed" ? "default" : "secondary"}>
											{h.status}
										</Badge>
									</TableCell>
									<TableCell className="max-w-[300px] truncate">
										{h.handoffNotes || "—"}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										{formatDateTime(h.signedAt)}
									</TableCell>
									<TableCell>
										{!readOnly && h.status === "draft" && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => finalizeHandoff.mutate({ id: h.id })}
												disabled={finalizeHandoff.isPending}
											>
												Sign
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	)
}
