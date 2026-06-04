"use client"

import { CheckCircle2, FileText, History, Lock, PenSquare, ShieldCheck } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Separator } from "@/core/components/ui/separator"
import type { ClinicalNote } from "@/features/clinical-docs/api/clinical-docs.hooks"

interface NoteHistoryProps {
	note: ClinicalNote
}

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

/**
 * Versioned history view for a clinical note.
 *
 * Renders the original signed note as v1 and each addendum as v2…vN with
 * author, timestamps, signed status, and reason for amendment. Used to
 * satisfy the legal-defensibility requirement that the chart maintains a
 * complete version trail.
 */
export function NoteHistory({ note }: NoteHistoryProps) {
	const addenda = (note.addenda ?? []).slice().sort((a, b) => {
		return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
	})

	const totalVersions = 1 + addenda.length

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<History className="text-muted-foreground size-4" />
				<h4 className="text-sm font-semibold">Version Trail</h4>
				<Badge variant="outline" className="text-xs">
					{totalVersions} {totalVersions === 1 ? "version" : "versions"}
				</Badge>
			</div>

			<ol className="relative space-y-4 border-l pl-6">
				{/* v1 — original note */}
				<li className="relative">
					<span className="bg-primary text-primary-foreground ring-background absolute -left-[31px] flex size-6 items-center justify-center rounded-full text-xs font-medium ring-4">
						1
					</span>
					<div className="space-y-2 rounded-md border p-3">
						<div className="flex flex-wrap items-center gap-2">
							<FileText className="text-muted-foreground size-4" />
							<span className="text-sm font-medium">Original Note</span>
							<Badge variant={note.status === "signed" ? "default" : "secondary"}>
								{note.status === "signed" ? (
									<>
										<Lock className="mr-1 size-3" />
										Signed
									</>
								) : (
									"Draft"
								)}
							</Badge>
						</div>
						<div className="text-muted-foreground space-y-0.5 text-xs">
							<div>
								<span className="font-medium">Author:</span> {note.authorStaffName ?? "Unknown"}
							</div>
							<div>
								<span className="font-medium">Created:</span> {formatDateTime(note.createdAt)}
							</div>
							{note.signedAt && (
								<div className="flex items-center gap-1">
									<ShieldCheck className="size-3 text-green-600" />
									<span className="font-medium">Signed:</span> {formatDateTime(note.signedAt)}
									{note.signedIp && <span className="ml-1 font-mono">(IP {note.signedIp})</span>}
								</div>
							)}
						</div>
					</div>
				</li>

				{/* Addenda */}
				{addenda.map((addendum, idx) => (
					<li key={addendum.id} className="relative">
						<span
							className={`ring-background absolute -left-[31px] flex size-6 items-center justify-center rounded-full text-xs font-medium ring-4 ${
								addendum.status === "signed"
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground"
							}`}
						>
							{idx + 2}
						</span>
						<div className="space-y-2 rounded-md border p-3">
							<div className="flex flex-wrap items-center gap-2">
								<PenSquare className="text-muted-foreground size-4" />
								<span className="text-sm font-medium">Addendum</span>
								<Badge variant={addendum.status === "signed" ? "default" : "secondary"}>
									{addendum.status === "signed" ? (
										<>
											<CheckCircle2 className="mr-1 size-3" />
											Signed
										</>
									) : (
										"Draft"
									)}
								</Badge>
							</div>

							<div className="text-muted-foreground space-y-0.5 text-xs">
								<div>
									<span className="font-medium">Author:</span>{" "}
									{addendum.authorStaffName ?? "Unknown"}
								</div>
								<div>
									<span className="font-medium">Created:</span> {formatDateTime(addendum.createdAt)}
								</div>
								{addendum.signedAt && (
									<div className="flex items-center gap-1">
										<ShieldCheck className="size-3 text-green-600" />
										<span className="font-medium">Signed:</span> {formatDateTime(addendum.signedAt)}
										{addendum.signedIp && (
											<span className="ml-1 font-mono">(IP {addendum.signedIp})</span>
										)}
									</div>
								)}
							</div>

							{addendum.reason && (
								<>
									<Separator />
									<div className="text-xs">
										<span className="text-muted-foreground font-medium">Reason for amendment:</span>{" "}
										{addendum.reason}
									</div>
								</>
							)}

							<Separator />
							<div className="bg-muted/40 rounded p-2 font-mono text-xs whitespace-pre-wrap">
								{addendum.content}
							</div>
						</div>
					</li>
				))}
			</ol>

			{addenda.length === 0 && (
				<p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs">
					No amendments. The note has only its original signed version.
				</p>
			)}
		</div>
	)
}
