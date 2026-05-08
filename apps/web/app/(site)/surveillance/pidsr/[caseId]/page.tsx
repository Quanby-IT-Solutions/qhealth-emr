"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import { Label } from "@/core/components/ui/label"

import { useDismissPidsrCaseMutation, usePidsrCaseDetailQuery, useSubmitPidsrCaseMutation } from "@/features/reporting/api/reporting.hooks"

function formatDate(d: string | null | undefined) {
	if (!d) return "—"
	return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
}

function StatusBadge({ status }: { status: string }) {
	if (status === "submitted") return <Badge variant="default">Submitted</Badge>
	if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>
	if (status === "blocked") return <Badge variant="secondary">Blocked</Badge>
	return <Badge variant="outline">Draft</Badge>
}

function CategoryBadge({ cat }: { cat: string | null | undefined }) {
	if (cat === "category_1") return <Badge variant="destructive">Cat 1 — Immediate</Badge>
	if (cat === "category_2") return <Badge variant="outline">Cat 2 — Weekly</Badge>
	return <Badge variant="secondary">Unknown</Badge>
}

export default function PidsrCasePage() {
	const params = useParams<{ caseId: string }>()
	const router = useRouter()
	const [dismissReason, setDismissReason] = useState("")
	const [showDismiss, setShowDismiss] = useState(false)
	const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

	const { data: detail, isLoading, isError } = usePidsrCaseDetailQuery(params.caseId)
	const submitMut = useSubmitPidsrCaseMutation()
	const dismissMut = useDismissPidsrCaseMutation()

	function handleSubmit() {
		setResult(null)
		submitMut.mutate(
			{ id: params.caseId },
			{
				onSuccess: (data) => {
					setResult({ type: data.success ? "success" : "error", message: data.message })
				},
				onError: (err) => {
					setResult({ type: "error", message: err instanceof Error ? err.message : "Submission failed." })
				},
			}
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="sm" onClick={() => router.back()}>
					<ArrowLeft className="size-4" />
					Back
				</Button>
				<div>
					<h1 className="text-xl font-semibold">PIDSR Case Submission</h1>
					<p className="text-xs text-muted-foreground font-mono">{params.caseId}</p>
				</div>
			</div>

			{result && (
				<div className={`flex items-center gap-3 rounded-md border px-4 py-3 ${result.type === "success" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}>
					{result.type === "success" ? <CheckCircle className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
					<span className="text-sm">{result.message}</span>
					{result.type === "error" && (
						<Button variant="outline" size="sm" className="ml-auto" onClick={handleSubmit} disabled={submitMut.isPending}>
							Retry
						</Button>
					)}
				</div>
			)}

			{isLoading ? (
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">Loading case…</CardContent>
				</Card>
			) : isError || !detail ? (
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">Case not found.</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 lg:grid-cols-3">
					<div className="lg:col-span-2 space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Patient Information</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
								<div><span className="text-muted-foreground">Name: </span>{detail.patientName ?? "—"}</div>
								<div><span className="text-muted-foreground">MRN: </span>{detail.patientMrn ?? "—"}</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Disease Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-sm">
								<div className="grid grid-cols-2 gap-x-4 gap-y-2">
									<div><span className="text-muted-foreground">Disease: </span>{detail.diseaseName}</div>
									<div><span className="text-muted-foreground">ICD-10: </span><Badge variant="outline" className="font-mono text-xs">{detail.diseaseCode}</Badge></div>
									<div><span className="text-muted-foreground">Classification: </span><Badge variant="secondary">{detail.caseClassification}</Badge></div>
									<div><span className="text-muted-foreground">Category: </span><CategoryBadge cat={detail.category} /></div>
									<div><span className="text-muted-foreground">Onset: </span>{formatDate(detail.onsetDate)}</div>
									<div><span className="text-muted-foreground">Diagnosis: </span>{formatDate(detail.diagnosisDate)}</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Encounter Details</CardTitle>
							</CardHeader>
							<CardContent className="text-sm space-y-2">
								<div className="grid grid-cols-2 gap-x-4 gap-y-2">
									<div><span className="text-muted-foreground">Type: </span>{detail.encounterType ?? "—"}</div>
									<div><span className="text-muted-foreground">Physician: </span>{detail.attendingPhysician ?? "—"}</div>
								</div>
								{detail.chiefComplaint && (
									<div><span className="text-muted-foreground">Chief Complaint: </span>{detail.chiefComplaint}</div>
								)}
							</CardContent>
						</Card>

						{detail.submissionData && Object.keys(detail.submissionData).length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle className="text-sm">Submission Data Preview</CardTitle>
								</CardHeader>
								<CardContent>
									<pre className="bg-muted rounded-md p-3 font-mono text-xs overflow-auto max-h-40">
										{JSON.stringify(detail.submissionData, null, 2)}
									</pre>
								</CardContent>
							</Card>
						)}
					</div>

					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Status</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Report Status</span>
									<StatusBadge status={detail.reportStatus} />
								</div>
								{detail.submittedAt && (
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Submitted</span>
										<span>{formatDate(detail.submittedAt)}</span>
									</div>
								)}
								<Separator />

								{detail.reportStatus === "draft" && !showDismiss && (
									<div className="flex flex-col gap-2">
										<Button
											className="w-full"
											onClick={handleSubmit}
											disabled={submitMut.isPending}
										>
											{submitMut.isPending ? "Submitting…" : "Confirm & Submit to DOH PIDSR"}
										</Button>
										<Button
											variant="outline"
											className="w-full"
											onClick={() => setShowDismiss(true)}
										>
											<XCircle className="size-4 mr-1" />
											Dismiss Case
										</Button>
									</div>
								)}

								{showDismiss && (
									<div className="space-y-2">
										<Label htmlFor="dismiss-reason">Dismiss Reason (required)</Label>
										<Textarea
											id="dismiss-reason"
											placeholder="Explain why this case is being dismissed…"
											value={dismissReason}
											onChange={(e) => setDismissReason(e.target.value)}
											className="text-sm"
											rows={3}
										/>
										<div className="flex gap-2">
											<Button
												variant="destructive"
												size="sm"
												className="flex-1"
												disabled={!dismissReason.trim() || dismissMut.isPending}
												onClick={() => {
													dismissMut.mutate(
														{ id: params.caseId, reason: dismissReason.trim() },
														{
															onSuccess: (data) => {
																setResult({ type: "success", message: data.message })
																setShowDismiss(false)
																setDismissReason("")
															},
															onError: (err) => {
																setResult({ type: "error", message: err instanceof Error ? err.message : "Dismiss failed." })
															},
														}
													)
												}}
											>
												{dismissMut.isPending ? "Dismissing…" : "Confirm Dismiss"}
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													setShowDismiss(false)
													setDismissReason("")
												}}
											>
												Cancel
											</Button>
										</div>
									</div>
								)}

								{detail.reportStatus === "submitted" && (
									<p className="text-xs text-muted-foreground text-center">This case has been submitted to DOH PIDSR.</p>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			)}
		</div>
	)
}
