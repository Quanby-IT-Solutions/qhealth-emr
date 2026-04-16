"use client"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Separator } from "@/core/components/ui/separator"
import {
	usePidsrCaseDetailQuery,
	useSubmitPidsrCaseMutation,
} from "@/features/reporting/api/reporting.hooks"

function formatDate(d: string | null | undefined) {
	if (!d) return "—"
	return new Date(d).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

interface PidsrCaseDetailProps {
	caseId: string
	onClose: () => void
}

export function PidsrCaseDetail({ caseId, onClose }: PidsrCaseDetailProps) {
	const { data: detail, isLoading } = usePidsrCaseDetailQuery(caseId)
	const submitMut = useSubmitPidsrCaseMutation()

	function handleSubmit() {
		submitMut.mutate({ id: caseId }, { onSuccess: onClose })
	}

	return (
		<Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>PIDSR Case Detail</DialogTitle>
				</DialogHeader>

				{isLoading ? (
					<p className="text-muted-foreground py-8 text-center">Loading…</p>
				) : !detail ? (
					<p className="text-muted-foreground py-4 text-center">Case not found.</p>
				) : (
					<div className="space-y-4 text-sm">
						{/* Patient */}
						<div>
							<p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
								Patient
							</p>
							<div className="grid grid-cols-2 gap-x-4 gap-y-1">
								<div>
									<span className="text-muted-foreground">Name:</span>{" "}
									{detail.patientName ?? "—"}
								</div>
								<div>
									<span className="text-muted-foreground">MRN:</span>{" "}
									{detail.patientMrn ?? "—"}
								</div>
							</div>
						</div>

						<Separator />

						{/* Disease */}
						<div>
							<p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
								Disease Information
							</p>
							<div className="grid grid-cols-2 gap-x-4 gap-y-1">
								<div>
									<span className="text-muted-foreground">Disease:</span>{" "}
									{detail.diseaseName}
								</div>
								<div>
									<span className="text-muted-foreground">ICD-10:</span>{" "}
									{detail.diseaseCode}
								</div>
								<div>
									<span className="text-muted-foreground">Classification:</span>{" "}
									<Badge variant="secondary">{detail.caseClassification}</Badge>
								</div>
								<div>
									<span className="text-muted-foreground">Status:</span>{" "}
									{detail.reportStatus === "submitted" ? (
										<Badge variant="default">Submitted</Badge>
									) : (
										<Badge variant="outline">Draft</Badge>
									)}
								</div>
								<div>
									<span className="text-muted-foreground">Onset Date:</span>{" "}
									{formatDate(detail.onsetDate)}
								</div>
								<div>
									<span className="text-muted-foreground">Diagnosis Date:</span>{" "}
									{formatDate(detail.diagnosisDate)}
								</div>
								{detail.submittedAt && (
									<div className="col-span-2">
										<span className="text-muted-foreground">Submitted At:</span>{" "}
										{formatDate(detail.submittedAt)}
									</div>
								)}
							</div>
						</div>

						<Separator />

						{/* Encounter */}
						<div>
							<p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
								Encounter
							</p>
							<div className="grid grid-cols-2 gap-x-4 gap-y-1">
								<div>
									<span className="text-muted-foreground">Type:</span>{" "}
									{detail.encounterType ?? "—"}
								</div>
								<div>
									<span className="text-muted-foreground">Physician:</span>{" "}
									{detail.attendingPhysician ?? "—"}
								</div>
							</div>
							{detail.chiefComplaint && (
								<div className="mt-1">
									<span className="text-muted-foreground">Chief Complaint:</span>{" "}
									{detail.chiefComplaint}
								</div>
							)}
						</div>

						{/* Submission Data Preview */}
						{detail.submissionData && Object.keys(detail.submissionData).length > 0 && (
							<>
								<Separator />
								<div>
									<p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
										Submission Data
									</p>
									<div className="bg-muted rounded-md p-3 font-mono text-xs">
										{JSON.stringify(detail.submissionData, null, 2)}
									</div>
								</div>
							</>
						)}
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>
					{detail?.reportStatus === "draft" && (
						<Button onClick={handleSubmit} disabled={submitMut.isPending}>
							{submitMut.isPending ? "Submitting…" : "Submit to DOH PIDSR"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
