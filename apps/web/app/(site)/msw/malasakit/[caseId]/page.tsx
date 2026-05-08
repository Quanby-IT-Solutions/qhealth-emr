"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useMalasakitCaseQuery,
	useMalasakitStatusLogQuery,
	useUpdateMalasakitCaseMutation,
} from "@/features/msw/malasakit-tracking/api/malasakit.hooks"

type MalasakitStatus = "pending" | "approved" | "released" | "denied"

const STATUS_TRANSITIONS: Record<MalasakitStatus, MalasakitStatus[]> = {
	pending: ["approved", "denied"],
	approved: ["released", "denied"],
	released: [],
	denied: [],
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	pending: "secondary",
	approved: "default",
	released: "outline",
	denied: "destructive",
}

interface CaseDetailPageProps {
	params: Promise<{ caseId: string }>
}

export default function MalasakitCasePage({ params }: CaseDetailPageProps) {
	const { caseId } = use(params)
	const [newStatus, setNewStatus] = useState<MalasakitStatus | "">("")
	const [deniedReason, setDeniedReason] = useState("")
	const [note, setNote] = useState("")

	const { data: caseData, isLoading: caseLoading } = useMalasakitCaseQuery(caseId)
	const { data: log, isLoading: logLoading } = useMalasakitStatusLogQuery(caseId)
	const updateMutation = useUpdateMalasakitCaseMutation()

	const allowedNext = caseData ? STATUS_TRANSITIONS[caseData.status as MalasakitStatus] ?? [] : []

	const handleUpdate = () => {
		if (!newStatus) return
		updateMutation.mutate(
			{
				id: caseId,
				status: newStatus,
				deniedReason: newStatus === "denied" ? deniedReason : undefined,
				note: note || undefined,
			},
			{
				onSuccess: () => {
					setNewStatus("")
					setDeniedReason("")
					setNote("")
				},
			}
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Link href="/msw/malasakit">
					<Button variant="ghost" size="sm" className="gap-1.5">
						<ArrowLeft className="size-4" />
						Back to Queue
					</Button>
				</Link>
			</div>

			{caseLoading ? (
				<Skeleton className="h-20 w-full rounded-lg" />
			) : caseData ? (
				<div>
					<div className="flex items-center gap-3">
						<h1 className="text-xl font-semibold">
							{caseData.patientName ?? caseData.patientId}
						</h1>
						<Badge variant={STATUS_VARIANT[caseData.status] ?? "secondary"}>
							{caseData.status}
						</Badge>
					</div>
					<p className="mt-1 font-mono text-xs text-muted-foreground">{caseId}</p>
					<div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
						<span>Source: {caseData.source}</span>
						{caseData.amountGranted != null && (
							<span>Amount: ₱{caseData.amountGranted.toLocaleString()}</span>
						)}
						{caseData.referenceNo ? (
							<Badge variant="default" className="text-xs">
								Reconciled · Ref: {caseData.referenceNo}
							</Badge>
						) : caseData.status === "released" ? (
							<Badge variant="outline" className="text-xs text-muted-foreground">
								Pending Reconciliation
							</Badge>
						) : null}
					</div>
				</div>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Status Timeline</CardTitle>
				</CardHeader>
				<CardContent>
					{logLoading ? (
						<div className="space-y-2">
							{[1, 2].map(i => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : log && log.length > 0 ? (
						<div className="space-y-3">
							{log.map((entry, i) => (
								<div key={entry.id} className="flex items-start gap-3">
									<div
										className={`mt-1.5 size-2 shrink-0 rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground"}`}
									/>
									<div>
										<p className="text-sm font-medium">
											{entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : entry.toStatus}
										</p>
										{entry.note && (
											<p className="text-xs text-muted-foreground">{entry.note}</p>
										)}
										<p className="text-xs text-muted-foreground">
											{new Date(entry.changedAt).toLocaleString()}
										</p>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No status history yet.</p>
					)}
				</CardContent>
			</Card>

			{allowedNext.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Update Status</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label>New Status</Label>
							<Select
								value={newStatus}
								onValueChange={v => setNewStatus(v as MalasakitStatus)}
							>
								<SelectTrigger className="w-[200px]">
									<SelectValue>{newStatus || "Select…"}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{allowedNext.map(s => (
										<SelectItem key={s} value={s}>
											{s.charAt(0).toUpperCase() + s.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{newStatus === "denied" && (
							<div className="space-y-1.5">
								<Label htmlFor="deniedReason">Reason for Denial *</Label>
								<Textarea
									id="deniedReason"
									rows={3}
									placeholder="Required when denying…"
									value={deniedReason}
									onChange={e => setDeniedReason(e.target.value)}
								/>
							</div>
						)}

						<div className="space-y-1.5">
							<Label htmlFor="note">Note (optional)</Label>
							<Textarea
								id="note"
								rows={2}
								placeholder="Additional notes…"
								value={note}
								onChange={e => setNote(e.target.value)}
							/>
						</div>

						<Button
							onClick={handleUpdate}
							disabled={
								!newStatus ||
								(newStatus === "denied" && !deniedReason.trim()) ||
								updateMutation.isPending
							}
						>
							{updateMutation.isPending ? "Saving…" : "Update Status"}
						</Button>

						{updateMutation.isError && (
							<p className="text-xs text-destructive">
								{(updateMutation.error as Error).message}
							</p>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	)
}
