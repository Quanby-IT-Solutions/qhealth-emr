"use client"

import { CheckCircle2, Lock, ShieldCheck } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Separator } from "@/core/components/ui/separator"
import { useSignNoteMutation } from "@/features/clinical-docs/api/clinical-docs.hooks"

interface StaffCredentials {
	name: string
	prcLicenseNumber: string | null
	prcExpiry: string | null
	ptrNumber: string | null
	ptrExpiry: string | null
}

interface NoteSigningProps {
	noteId: string
	noteType: string
	staffCredentials: StaffCredentials
	onSuccess: () => void
	onCancel: () => void
}

function noteTypeLabel(type: string) {
	const labels: Record<string, string> = {
		admission: "Admission Note (H&P)",
		progress: "Progress Note",
		consultation: "Consultation",
		discharge_summary: "Discharge Summary",
		fpe: "FPE / Konsulta",
	}
	return labels[type] ?? type
}

function formatExpiry(dateStr: string | null) {
	if (!dateStr) return null
	return new Date(dateStr).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "long",
		day: "numeric",
	})
}

function expiryStatus(dateStr: string | null): "valid" | "expiring" | "expired" | null {
	if (!dateStr) return null
	const expiry = new Date(dateStr)
	const now = new Date()
	const thirtyDays = 30 * 24 * 60 * 60 * 1000
	if (expiry < now) return "expired"
	if (expiry.getTime() - now.getTime() < thirtyDays) return "expiring"
	return "valid"
}

/**
 * Digital note-signing component.
 * Displays the signer's PRC License # and PTR before confirming the irreversible action.
 */
export function NoteSigning({
	noteId,
	noteType,
	staffCredentials,
	onSuccess,
	onCancel,
}: NoteSigningProps) {
	const signNote = useSignNoteMutation()

	const prcStatus = expiryStatus(staffCredentials.prcExpiry)
	const ptrStatus = expiryStatus(staffCredentials.ptrExpiry)

	function handleSign() {
		signNote.mutate({ id: noteId }, { onSuccess })
	}

	return (
		<div className="space-y-5">
			{/* Signer identity block */}
			<div className="bg-card space-y-3 rounded-lg border p-4">
				<div className="flex items-center gap-2">
					<ShieldCheck className="text-primary size-5" />
					<h4 className="text-sm font-semibold">Signing as</h4>
				</div>

				<p className="text-base font-medium">{staffCredentials.name}</p>

				<Separator />

				<div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
					{/* PRC License */}
					<div className="space-y-1">
						<p className="text-muted-foreground text-xs tracking-wide uppercase">PRC License No.</p>
						{staffCredentials.prcLicenseNumber ? (
							<div className="flex items-center gap-2">
								<span className="font-mono font-medium">{staffCredentials.prcLicenseNumber}</span>
								{prcStatus === "valid" && (
									<Badge className="bg-green-600 text-xs hover:bg-green-700">Valid</Badge>
								)}
								{prcStatus === "expiring" && (
									<Badge variant="secondary" className="text-xs text-amber-600">
										Expiring soon
									</Badge>
								)}
								{prcStatus === "expired" && (
									<Badge variant="destructive" className="text-xs">
										Expired
									</Badge>
								)}
							</div>
						) : (
							<span className="text-muted-foreground italic">Not on file</span>
						)}
						{staffCredentials.prcExpiry && (
							<p className="text-muted-foreground text-xs">
								Expires: {formatExpiry(staffCredentials.prcExpiry)}
							</p>
						)}
					</div>

					{/* PTR */}
					<div className="space-y-1">
						<p className="text-muted-foreground text-xs tracking-wide uppercase">PTR No.</p>
						{staffCredentials.ptrNumber ? (
							<div className="flex items-center gap-2">
								<span className="font-mono font-medium">{staffCredentials.ptrNumber}</span>
								{ptrStatus === "valid" && (
									<Badge className="bg-green-600 text-xs hover:bg-green-700">Valid</Badge>
								)}
								{ptrStatus === "expiring" && (
									<Badge variant="secondary" className="text-xs text-amber-600">
										Expiring soon
									</Badge>
								)}
								{ptrStatus === "expired" && (
									<Badge variant="destructive" className="text-xs">
										Expired
									</Badge>
								)}
							</div>
						) : (
							<span className="text-muted-foreground italic">Not on file</span>
						)}
						{staffCredentials.ptrExpiry && (
							<p className="text-muted-foreground text-xs">
								Expires: {formatExpiry(staffCredentials.ptrExpiry)}
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Warning about immutability */}
			<div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/50 dark:bg-blue-950/20">
				<div className="flex items-start gap-2">
					<Lock className="mt-0.5 size-4 shrink-0 text-blue-600" />
					<div className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
						<p className="font-medium">You are digitally signing: {noteTypeLabel(noteType)}</p>
						<p>
							Signing makes this note a permanent part of the medical record. It cannot be edited
							after signing. Your identity, PRC License No., PTR No., timestamp, and IP address will
							be recorded alongside this signature.
						</p>
					</div>
				</div>
			</div>

			{/* Missing credentials warning */}
			{(!staffCredentials.prcLicenseNumber || !staffCredentials.ptrNumber) && (
				<p className="text-sm text-amber-600 dark:text-amber-400">
					⚠ Some credentials are missing from your profile. Contact HR to update your PRC and PTR
					details.
				</p>
			)}

			<Separator />

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel} disabled={signNote.isPending}>
					Cancel
				</Button>
				<Button type="button" onClick={handleSign} disabled={signNote.isPending} className="gap-2">
					<CheckCircle2 className="size-4" />
					{signNote.isPending ? "Signing…" : "Sign Note"}
				</Button>
			</div>

			{signNote.isError && <p className="text-destructive text-sm">{signNote.error.message}</p>}
		</div>
	)
}
