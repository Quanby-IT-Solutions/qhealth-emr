"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle } from "lucide-react"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
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

import { useCoeListQuery, useIssueCoeV2Mutation, useRevokeCoeMutation } from "../api/coe.hooks"

type CoeType = "malasakit" | "z_benefits" | "indigent"

const TYPE_LABELS: Record<CoeType, string> = {
	malasakit: "Malasakit Center",
	z_benefits: "PhilHealth Z-Benefits",
	indigent: "Indigent",
}

interface CoeIssuanceProps {
	evaluationId: string
	encounterId: string
}

export function CoeIssuance({ evaluationId, encounterId }: CoeIssuanceProps) {
	const [showForm, setShowForm] = useState(false)
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [coeType, setCoeType] = useState<CoeType>("malasakit")
	const [amount, setAmount] = useState("")
	const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
	const [revokeReason, setRevokeReason] = useState("")

	const { data: certs, isLoading } = useCoeListQuery({ evaluationId, encounterId })
	const issueMutation = useIssueCoeV2Mutation()
	const revokeMutation = useRevokeCoeMutation()

	const active = (certs ?? []).filter(c => !c.voidedAt)

	const doIssue = () => {
		issueMutation.mutate(
			{
				evaluationId,
				type: coeType,
				amountApproved: amount ? Number(amount) : undefined,
			},
			{
				onSuccess: () => {
					setShowForm(false)
					setConfirmOpen(false)
					setAmount("")
					setCoeType("malasakit")
				},
			}
		)
	}

	const handleIssue = (e: React.FormEvent) => {
		e.preventDefault()
		setConfirmOpen(true)
	}

	const handleRevoke = (certId: string) => {
		if (!revokeReason.trim()) return
		revokeMutation.mutate(
			{ certificateId: certId, reason: revokeReason },
			{
				onSuccess: () => {
					setRevokeTarget(null)
					setRevokeReason("")
				},
			}
		)
	}

	return (
		<>
		<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirm CoE Issuance</AlertDialogTitle>
					<AlertDialogDescription>
						Issue a <strong>{TYPE_LABELS[coeType]}</strong> Certificate of Eligibility
						{amount ? ` for ₱${Number(amount).toLocaleString()}` : ""}? This will be attached to
						the encounter and applied to the billing record.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={issueMutation.isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={doIssue} disabled={issueMutation.isPending}>
						{issueMutation.isPending ? "Issuing…" : "Sign and Issue"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
		<Card>
			<CardHeader className="flex flex-row items-start justify-between">
				<div>
					<CardTitle className="text-base">Certificate of Eligibility (CoE)</CardTitle>
					<p className="mt-0.5 text-sm text-muted-foreground">
						Issue CoEs for Malasakit, Z-Benefits, or Indigent assistance.
					</p>
				</div>
				{!showForm && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="shrink-0"
						onClick={() => setShowForm(true)}
					>
						Issue CoE
					</Button>
				)}
			</CardHeader>

			<CardContent className="space-y-4">
				{showForm && (
					<form onSubmit={handleIssue} className="space-y-4 rounded-lg border bg-muted/30 p-4">
						<p className="text-sm font-medium">New Certificate of Eligibility</p>

						<div className="space-y-1.5">
							<Label>Type</Label>
							<Select value={coeType} onValueChange={v => setCoeType(v as CoeType)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(Object.entries(TYPE_LABELS) as [CoeType, string][]).map(([v, l]) => (
										<SelectItem key={v} value={v}>{l}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="coeAmount">Approved Amount (&#8369;) — optional</Label>
							<Input
								id="coeAmount"
								type="number"
								min={0}
								placeholder="e.g. 5000"
								value={amount}
								onChange={e => setAmount(e.target.value)}
							/>
						</div>

						{issueMutation.isError && (
							<div className="flex items-center gap-2 text-sm text-destructive">
								<AlertCircle className="size-4 shrink-0" />
								<span>{(issueMutation.error as Error).message}</span>
							</div>
						)}

						<div className="flex gap-2">
							<Button type="submit" disabled={issueMutation.isPending}>
								{issueMutation.isPending ? "Issuing…" : "Sign and Issue"}
							</Button>
							<Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
								Cancel
							</Button>
						</div>
					</form>
				)}

				{isLoading ? (
					<p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
				) : active.length === 0 ? (
					<p className="py-4 text-center text-sm text-muted-foreground">
						No CoEs issued for this evaluation.
					</p>
				) : (
					<div className="space-y-3">
						{active.map(cert => (
							<div key={cert.id} className="rounded-lg border p-4 space-y-2">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm font-medium">{TYPE_LABELS[cert.type]}</p>
										{cert.amountApproved != null && (
											<p className="text-xs text-muted-foreground">
												Amount: &#8369;{cert.amountApproved.toLocaleString()}
											</p>
										)}
										<p className="text-xs text-muted-foreground">
											{cert.signedAt
												? new Date(cert.signedAt).toLocaleDateString(undefined, {
														day: "numeric",
														month: "short",
														year: "numeric",
													})
												: ""}
										</p>
									</div>
									{cert.pdfUri && (
										<a
											href={cert.pdfUri}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs text-primary underline"
										>
											View PDF
										</a>
									)}
								</div>

								{revokeTarget === cert.id ? (
									<div className="space-y-2">
										<Textarea
											rows={2}
											placeholder="Reason for revocation (required)"
											value={revokeReason}
											onChange={e => setRevokeReason(e.target.value)}
										/>
										{revokeMutation.isError && (
											<p className="text-xs text-destructive">
												{(revokeMutation.error as Error).message}
											</p>
										)}
										<div className="flex gap-2">
											<Button
												type="button"
												size="sm"
												variant="destructive"
												disabled={!revokeReason.trim() || revokeMutation.isPending}
												onClick={() => handleRevoke(cert.id)}
											>
												{revokeMutation.isPending ? "Revoking…" : "Confirm Revoke"}
											</Button>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() => setRevokeTarget(null)}
											>
												Cancel
											</Button>
										</div>
									</div>
								) : (
									<Button
										type="button"
										size="sm"
										variant="ghost"
										className="text-destructive hover:text-destructive"
										onClick={() => setRevokeTarget(cert.id)}
									>
										Revoke
									</Button>
								)}

								{revokeMutation.isSuccess && revokeTarget === null && (
									<div className="flex items-center gap-1.5 text-xs text-green-600">
										<CheckCircle className="size-3.5" />
										Revoked
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
		</>
	)
}
