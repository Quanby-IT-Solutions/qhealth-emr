"use client"

import { useState } from "react"

import { AlertCircle, CheckCircle, Plus } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"

import type { CoeProgram, CoeStatus } from "@/features/msw/api/msw.hooks"
import {
	useCoeListQuery,
	useCreateCoeMutation,
	useUpdateCoeMutation,
} from "@/features/msw/api/msw.hooks"

// ============================================================================
// Constants
// ============================================================================

const PROGRAM_LABELS: Record<CoeProgram, string> = {
	malasakit: "Malasakit Center",
	pcso: "PCSO Medical Assistance",
	dswd: "DSWD Medical Assistance",
	owwa: "OWWA Medical Assistance",
	pagibig: "Pag-IBIG Medical Assistance",
}

const STATUS_CONFIG: Record<CoeStatus, { label: string; classes: string }> = {
	pending: {
		label: "Pending",
		classes: "bg-yellow-100 text-yellow-800 border-yellow-300",
	},
	approved: {
		label: "Approved",
		classes: "bg-blue-100 text-blue-800 border-blue-300",
	},
	released: {
		label: "Released",
		classes: "bg-green-100 text-green-800 border-green-300",
	},
	denied: {
		label: "Denied",
		classes: "bg-red-100 text-red-800 border-red-300",
	},
}

// ============================================================================
// New CoE Form
// ============================================================================

interface NewCoeFormProps {
	encounterId: string
	patientId: string
	onCancel: () => void
}

function NewCoeForm({ encounterId, patientId, onCancel }: NewCoeFormProps) {
	const [program, setProgram] = useState<CoeProgram>("malasakit")
	const [requestedAmount, setRequestedAmount] = useState("")
	const [notes, setNotes] = useState("")
	const createMutation = useCreateCoeMutation()

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		createMutation.mutate(
			{
				encounterId,
				patientId,
				program,
				requestedAmount: requestedAmount ? Number(requestedAmount) : undefined,
				notes: notes.trim() || undefined,
			},
			{
				onSuccess: onCancel,
			}
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-1.5">
				<Label htmlFor="coeProgram">Program</Label>
				<Select value={program} onValueChange={(v) => setProgram(v as CoeProgram)}>
					<SelectTrigger id="coeProgram">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{(Object.entries(PROGRAM_LABELS) as [CoeProgram, string][]).map(([v, l]) => (
							<SelectItem key={v} value={v}>
								{l}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="requestedAmount">Requested Amount (₱) — optional</Label>
				<Input
					id="requestedAmount"
					type="number"
					min={0}
					placeholder="e.g. 5000"
					value={requestedAmount}
					onChange={(e) => setRequestedAmount(e.target.value)}
				/>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="coeNotes">Notes (optional)</Label>
				<Textarea
					id="coeNotes"
					rows={2}
					placeholder="Remarks or justification…"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
				/>
			</div>

			{createMutation.isError && (
				<div className="flex items-center gap-2 text-sm text-destructive">
					<AlertCircle className="size-4 shrink-0" />
					<span>Failed to issue CoE. Please try again.</span>
				</div>
			)}

			<div className="flex gap-2">
				<Button type="submit" disabled={createMutation.isPending}>
					{createMutation.isPending ? "Issuing…" : "Issue CoE"}
				</Button>
				<Button type="button" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</form>
	)
}

// ============================================================================
// CoE Row with Status Update
// ============================================================================

function CoeRow({ coe }: { coe: import("@/features/msw/api/msw.hooks").CoE }) {
	const updateMutation = useUpdateCoeMutation()
	const [controlNumber, setControlNumber] = useState(coe.controlNumber ?? "")
	const [approvedAmount, setApprovedAmount] = useState(
		coe.approvedAmount ? String(coe.approvedAmount) : ""
	)
	const [showUpdate, setShowUpdate] = useState(false)

	const { label, classes } = STATUS_CONFIG[coe.status]

	const advanceStatus = () => {
		const next: Partial<Record<CoeStatus, CoeStatus>> = {
			pending: "approved",
			approved: "released",
		}
		if (next[coe.status]) {
			updateMutation.mutate({
				id: coe.id,
				status: next[coe.status],
				controlNumber: controlNumber.trim() || undefined,
				approvedAmount: approvedAmount ? Number(approvedAmount) : undefined,
			})
		}
	}

	return (
		<div className="rounded-lg border p-4 space-y-3">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-sm font-medium">{PROGRAM_LABELS[coe.program]}</p>
					{coe.controlNumber && (
						<p className="text-xs text-muted-foreground">
							Control No.: {coe.controlNumber}
						</p>
					)}
					<p className="text-xs text-muted-foreground mt-0.5">
						Issued by {coe.issuedByName} ·{" "}
						{new Date(coe.issuedAt).toLocaleDateString(undefined, {
							day: "numeric",
							month: "short",
							year: "numeric",
						})}
					</p>
				</div>
				<Badge
					variant="outline"
					className={`shrink-0 text-xs ${classes}`}
				>
					{label}
				</Badge>
			</div>

			{(coe.requestedAmount || coe.approvedAmount) && (
				<div className="flex gap-6 text-sm">
					{coe.requestedAmount && (
						<div>
							<span className="text-xs text-muted-foreground">Requested</span>
							<p className="font-medium">
								₱{coe.requestedAmount.toLocaleString()}
							</p>
						</div>
					)}
					{coe.approvedAmount && (
						<div>
							<span className="text-xs text-muted-foreground">Approved</span>
							<p className="font-medium text-green-600">
								₱{coe.approvedAmount.toLocaleString()}
							</p>
						</div>
					)}
				</div>
			)}

			{coe.notes && (
				<p className="text-xs text-muted-foreground italic">{coe.notes}</p>
			)}

			{/* Actions */}
			{(coe.status === "pending" || coe.status === "approved") && (
				<div className="space-y-2">
					{showUpdate && (
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor={`ctrl-${coe.id}`} className="text-xs">
									Control Number
								</Label>
								<Input
									id={`ctrl-${coe.id}`}
									value={controlNumber}
									onChange={(e) => setControlNumber(e.target.value)}
									placeholder="e.g. MAL-2026-00123"
									className="h-8 text-sm"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor={`amt-${coe.id}`} className="text-xs">
									Approved Amount (₱)
								</Label>
								<Input
									id={`amt-${coe.id}`}
									type="number"
									min={0}
									value={approvedAmount}
									onChange={(e) => setApprovedAmount(e.target.value)}
									placeholder="e.g. 5000"
									className="h-8 text-sm"
								/>
							</div>
						</div>
					)}
					<div className="flex gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={advanceStatus}
							disabled={updateMutation.isPending}
						>
							{coe.status === "pending" ? "Mark Approved" : "Mark Released"}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => setShowUpdate((p) => !p)}
						>
							{showUpdate ? "Hide" : "Edit Control No./Amount"}
						</Button>
						{coe.status === "pending" && (
							<Button
								type="button"
								size="sm"
								variant="ghost"
								className="text-destructive hover:text-destructive"
								onClick={() =>
									updateMutation.mutate({ id: coe.id, status: "denied" })
								}
								disabled={updateMutation.isPending}
							>
								Deny
							</Button>
						)}
					</div>
					{updateMutation.isSuccess && (
						<div className="flex items-center gap-1.5 text-xs text-green-600">
							<CheckCircle className="size-3.5" />
							Updated
						</div>
					)}
				</div>
			)}
		</div>
	)
}

// ============================================================================
// Main Component
// ============================================================================

interface CoeIssuanceProps {
	encounterId: string
	patientId: string
}

export function CoeIssuance({ encounterId, patientId }: CoeIssuanceProps) {
	const [showForm, setShowForm] = useState(false)
	const { data, isLoading } = useCoeListQuery(encounterId)

	const coes = data?.certificates ?? []

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between">
				<div>
					<CardTitle className="text-base">Certificate of Eligibility (CoE)</CardTitle>
					<p className="mt-0.5 text-sm text-muted-foreground">
						Issue CoEs for Malasakit, PCSO, DSWD, and other assistance programs.
					</p>
				</div>
				{!showForm && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="gap-1.5 shrink-0"
						onClick={() => setShowForm(true)}
					>
						<Plus className="size-3.5" />
						Issue CoE
					</Button>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{showForm && (
					<div className="rounded-lg border bg-muted/30 p-4">
						<h3 className="mb-4 text-sm font-medium">New Certificate of Eligibility</h3>
						<NewCoeForm
							encounterId={encounterId}
							patientId={patientId}
							onCancel={() => setShowForm(false)}
						/>
					</div>
				)}

				{isLoading ? (
					<p className="text-center text-sm text-muted-foreground py-4">
						Loading certificates…
					</p>
				) : coes.length === 0 ? (
					<p className="text-center text-sm text-muted-foreground py-4">
						No CoEs issued for this encounter.
					</p>
				) : (
					<div className="space-y-3">
						{coes.map((coe) => (
							<CoeRow key={coe.id} coe={coe} />
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
