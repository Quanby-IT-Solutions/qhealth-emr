"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
	AlertTriangle,
	Ban,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	ExternalLink,
	Loader2,
	Mail,
	RefreshCw,
	ShieldCheck,
	User,
	Video,
} from "lucide-react"
import { toast } from "sonner"

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
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import {
	formatAppointmentStatusLabel,
	getPatientInviteUrl,
	getPlatformLabel,
	type TelemedicineAppointment,
	useAppointmentQuery,
	useRegeneratePatientInviteMutation,
	useRevokePatientInviteMutation,
} from "@/features/telemedicine/api/telemedicine.hooks"
import { getVideoLaunchPath } from "@/features/telemedicine/lib/video-links"

// ============================================================================
// Types
// ============================================================================

interface VideoCallPanelProps {
	appointment?: TelemedicineAppointment
	appointmentId?: string
	initialPatientInviteToken?: string | null
	onPatientInviteTokenChange?: (appointmentId: string, token: string | null) => void
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(val: string): string {
	if (!val) return "-"
	const date = new Date(val)
	if (Number.isNaN(date.getTime())) return val
	return date.toLocaleDateString("en-PH", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

function formatTime(val: string): string {
	if (!val) return "-"
	const [h, m] = val.split(":")
	const hour = Number(h)
	const minute = Number(m)
	if (!Number.isFinite(hour) || !Number.isFinite(minute)) return val
	const period = hour >= 12 ? "PM" : "AM"
	const display = hour % 12 === 0 ? 12 : hour % 12
	return `${display}:${String(minute).padStart(2, "0")} ${period}`
}

function formatDateTime(val: string | null | undefined): string {
	if (!val) return "Never"
	const date = new Date(val)
	if (Number.isNaN(date.getTime())) return "-"
	return date.toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function getExpiryState(expiresAt: string | null | undefined): {
	label: string
	tone: "neutral" | "warning" | "danger"
} {
	if (!expiresAt) return { label: "No expiry set", tone: "neutral" }
	const expires = new Date(expiresAt)
	if (Number.isNaN(expires.getTime())) return { label: "-", tone: "neutral" }
	const diffMs = expires.getTime() - Date.now()
	const diffMin = Math.round(diffMs / 60000)
	if (diffMin <= 0) return { label: "Expired", tone: "danger" }
	if (diffMin < 60) return { label: `Expires in ${diffMin}m`, tone: "warning" }
	const diffHours = Math.round(diffMin / 60)
	if (diffHours < 24) return { label: `Expires in ${diffHours}h`, tone: "warning" }
	const diffDays = Math.round(diffHours / 24)
	return { label: `Expires in ${diffDays}d`, tone: "neutral" }
}

function useCopyToClipboard() {
	const [copied, setCopied] = useState<string | null>(null)

	function copyText(text: string, key: string, successMessage?: string) {
		void navigator.clipboard
			.writeText(text)
			.then(() => {
				setCopied(key)
				if (successMessage) toast.success(successMessage)
				setTimeout(() => setCopied(null), 2000)
			})
			.catch(() => {
				toast.error("Could not copy. Select the link manually and copy.")
			})
	}

	return { copied, copyText }
}

function CopyButton({
	text,
	copyKey,
	copied,
	onCopy,
	label = "Copy",
	successMessage = "Copied to clipboard",
	size = "sm",
	variant = "outline",
}: {
	text: string
	copyKey: string
	copied: string | null
	onCopy: (text: string, key: string, successMessage?: string) => void
	label?: string
	successMessage?: string
	size?: "sm" | "default" | "lg"
	variant?: "outline" | "default" | "ghost"
}) {
	const isCopied = copied === copyKey
	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			onClick={() => onCopy(text, copyKey, successMessage)}
		>
			{isCopied ? (
				<>
					<Check className="size-3.5 text-green-600" />
					Copied
				</>
			) : (
				<>
					<Copy className="size-3.5" />
					{label}
				</>
			)}
		</Button>
	)
}

// ============================================================================
// Inner panel
// ============================================================================

function VideoCallContent({
	appt,
	initialPatientInviteToken,
	onPatientInviteTokenChange,
}: {
	appt: TelemedicineAppointment
	initialPatientInviteToken?: string | null
	onPatientInviteTokenChange?: (appointmentId: string, token: string | null) => void
}) {
	const { copied, copyText } = useCopyToClipboard()
	const [currentAppt, setCurrentAppt] = useState(appt)
	const [patientInviteToken, setPatientInviteToken] = useState<string | null>(
		initialPatientInviteToken ?? appt.patientInviteToken ?? null
	)
	const [error, setError] = useState<string | null>(null)
	const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
	const regenerateInvite = useRegeneratePatientInviteMutation()
	const revokeInvite = useRevokePatientInviteMutation()

	useEffect(() => {
		setCurrentAppt(appt)
	}, [appt])

	useEffect(() => {
		setPatientInviteToken(initialPatientInviteToken ?? appt.patientInviteToken ?? null)
	}, [appt.id, appt.patientInviteToken, initialPatientInviteToken])

	const patientInviteUrl = useMemo(
		() => (patientInviteToken ? getPatientInviteUrl(patientInviteToken) : null),
		[patientInviteToken]
	)
	const platformLabel = getPlatformLabel(currentAppt.platform)
	const inviteRevoked = Boolean(currentAppt.patientInviteRevokedAt)
	const hasStoredInvite = Boolean(currentAppt.patientInviteExpiresAt) && !inviteRevoked
	const inviteHidden = hasStoredInvite && !patientInviteUrl
	const isInviteActionPending = regenerateInvite.isPending || revokeInvite.isPending
	const expiryState = getExpiryState(currentAppt.patientInviteExpiresAt)
	const patientJoined = Boolean(currentAppt.patientJoinedAt)
	const patientEmail = currentAppt.patientEmail

	async function handleRegenerateInvite() {
		setError(null)
		try {
			const invite = await regenerateInvite.mutateAsync(currentAppt.id)
			setPatientInviteToken(invite.patientInviteToken)
			onPatientInviteTokenChange?.(currentAppt.id, invite.patientInviteToken)
			setCurrentAppt(prev => ({
				...prev,
				patientInviteToken: invite.patientInviteToken,
				patientInviteExpiresAt: invite.patientInviteExpiresAt,
				patientInviteRevokedAt: invite.patientInviteRevokedAt,
				patientInviteLastUsedAt: null,
			}))
			toast.success(hasStoredInvite ? "Patient invite regenerated" : "Patient invite generated", {
				description: "A fresh secure link is ready to share with the patient.",
			})
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to regenerate patient invite."
			setError(message)
			toast.error("Could not generate invite", { description: message })
		}
	}

	async function handleConfirmRevoke() {
		setRevokeDialogOpen(false)
		setError(null)
		try {
			const invite = await revokeInvite.mutateAsync(currentAppt.id)
			setPatientInviteToken(null)
			onPatientInviteTokenChange?.(currentAppt.id, null)
			setCurrentAppt(prev => ({
				...prev,
				patientInviteToken: undefined,
				patientInviteExpiresAt: invite.patientInviteExpiresAt,
				patientInviteRevokedAt: invite.patientInviteRevokedAt,
			}))
			toast.success("Patient invite revoked", {
				description: "The patient can no longer join with the old link.",
			})
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to revoke patient invite."
			setError(message)
			toast.error("Could not revoke invite", { description: message })
		}
	}

	const mailtoHref = patientEmail && patientInviteUrl
		? `mailto:${encodeURIComponent(patientEmail)}?subject=${encodeURIComponent(
				"Your telemedicine consultation link"
			)}&body=${encodeURIComponent(
				`Hello ${currentAppt.patientName},\n\nPlease use this secure link to join your scheduled video consultation:\n\n${patientInviteUrl}\n\nYou will need your date of birth or MRN to verify your identity.\n\nThank you.`
			)}`
		: null

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
				<p className="flex items-center gap-2 text-sm font-medium text-green-800">
					<Video className="size-4" />
					{platformLabel} room is ready for this appointment
				</p>
				<p className="mt-1 text-xs text-green-700">
					Clinician access is authenticated. Patient access uses the invite link plus DOB or MRN
					verification.
				</p>
			</div>

			<div className="flex flex-wrap gap-2">
				<Button asChild>
					<Link href={getVideoLaunchPath(currentAppt.id)} target="_blank" rel="noopener noreferrer">
						<Video className="size-4" />
						Open Clinician Room
						<ExternalLink className="size-3.5" />
					</Link>
				</Button>
				{patientInviteUrl && (
					<>
						<CopyButton
							text={patientInviteUrl}
							copyKey="patientInviteTop"
							copied={copied}
							onCopy={copyText}
							label="Copy Patient Link"
							successMessage="Patient link copied"
						/>
						{mailtoHref && (
							<Button asChild variant="outline">
								<a href={mailtoHref}>
									<Mail className="size-3.5" />
									Email to Patient
								</a>
							</Button>
						)}
					</>
				)}
			</div>

			<Separator />

			<div className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h4 className="flex items-center gap-2 text-sm font-medium">
							<ShieldCheck className="text-primary size-4" />
							Secure Patient Invite
						</h4>
						<p className="text-muted-foreground mt-1 text-xs">
							The raw token is only shown when an invite is created or regenerated. Regenerating
							replaces any existing link.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={handleRegenerateInvite}
							disabled={isInviteActionPending}
						>
							{regenerateInvite.isPending ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								<RefreshCw className="size-3.5" />
							)}
							{hasStoredInvite ? "Regenerate" : "Generate"}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							onClick={() => setRevokeDialogOpen(true)}
							disabled={!hasStoredInvite || isInviteActionPending}
						>
							{revokeInvite.isPending ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								<Ban className="size-3.5" />
							)}
							Revoke
						</Button>
					</div>
				</div>

				{error && (
					<div className="border-destructive/30 text-destructive flex items-start gap-2 rounded-md border bg-red-50 px-3 py-2 text-sm">
						<AlertTriangle className="mt-0.5 size-4 shrink-0" />
						<p>{error}</p>
					</div>
				)}

				{patientInviteUrl ? (
					<div className="rounded-lg border bg-white p-3">
						<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
							<span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
								Patient Join Link
							</span>
							<CopyButton
								text={patientInviteUrl}
								copyKey="patientInvite"
								copied={copied}
								onCopy={copyText}
								successMessage="Patient link copied"
							/>
						</div>
						<p className="text-primary break-all text-sm underline underline-offset-2">
							{patientInviteUrl}
						</p>
						{expiryState.tone === "danger" && (
							<p className="mt-2 flex items-center gap-1 text-xs text-red-700">
								<AlertTriangle className="size-3" />
								This link has expired. Regenerate before sharing.
							</p>
						)}
						{expiryState.tone === "warning" && (
							<p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
								<Clock className="size-3" />
								{expiryState.label}. Regenerate if the patient hasn't joined yet.
							</p>
						)}
					</div>
				) : inviteHidden ? (
					<div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
						<ShieldCheck className="mt-0.5 size-4 shrink-0" />
						<div>
							<p className="font-medium">An active invite exists, but the link is hidden</p>
							<p className="text-xs text-blue-800">
								Tokens are only shown once at creation. Regenerate to copy a fresh secure link.
							</p>
						</div>
					</div>
				) : inviteRevoked ? (
					<div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
						<Ban className="mt-0.5 size-4 shrink-0" />
						<div>
							<p className="font-medium">Invite revoked</p>
							<p className="text-xs">Generate a new invite if the patient still needs access.</p>
						</div>
					</div>
				) : (
					<div className="text-muted-foreground rounded-lg border p-3 text-sm">
						<p>No invite has been generated yet.</p>
						<p className="text-xs">Click <strong>Generate</strong> when you are ready to share access with the patient.</p>
					</div>
				)}

				<div className="grid gap-3 text-sm md:grid-cols-3">
					<div className="rounded-lg border p-3">
						<p className="text-muted-foreground mb-1 text-xs">Expires</p>
						<p className="font-medium">{formatDateTime(currentAppt.patientInviteExpiresAt)}</p>
						{expiryState.tone !== "neutral" && (
							<Badge
								variant="outline"
								className={`mt-1 text-xs ${
									expiryState.tone === "danger"
										? "border-red-300 text-red-700"
										: "border-amber-300 text-amber-700"
								}`}
							>
								{expiryState.label}
							</Badge>
						)}
					</div>
					<div className="rounded-lg border p-3">
						<p className="text-muted-foreground mb-1 text-xs">Last Used</p>
						<p className="font-medium">{formatDateTime(currentAppt.patientInviteLastUsedAt)}</p>
					</div>
					<div className="rounded-lg border p-3">
						<p className="text-muted-foreground mb-1 text-xs">Patient Joined</p>
						<p className="font-medium">{formatDateTime(currentAppt.patientJoinedAt)}</p>
						{patientJoined && (
							<Badge className="mt-1 bg-emerald-100 text-emerald-800 text-xs">
								<CheckCircle2 className="mr-1 size-3" />
								Verified
							</Badge>
						)}
					</div>
				</div>
			</div>

			<Separator />

			<div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
				<div>
					<span className="text-muted-foreground inline-flex items-center gap-1">
						<User className="size-3" />
						Patient:
					</span>{" "}
					<span className="font-medium">{currentAppt.patientName}</span>
				</div>
				<div>
					<span className="text-muted-foreground inline-flex items-center gap-1">
						<User className="size-3" />
						Clinician:
					</span>{" "}
					<span className="font-medium">{currentAppt.clinicianName}</span>
				</div>
				<div>
					<span className="text-muted-foreground inline-flex items-center gap-1">
						<Calendar className="size-3" />
						Date:
					</span>{" "}
					<span className="font-medium">{formatDate(currentAppt.scheduledDate)}</span>
				</div>
				<div>
					<span className="text-muted-foreground inline-flex items-center gap-1">
						<Clock className="size-3" />
						Time:
					</span>{" "}
					<span className="font-medium">
						{formatTime(currentAppt.scheduledTime)} ({currentAppt.durationMinutes} min)
					</span>
				</div>
				<div>
					<span className="text-muted-foreground">Platform:</span>{" "}
					<Badge variant="outline" className="text-xs">
						{platformLabel}
					</Badge>
				</div>
				<div>
					<span className="text-muted-foreground">Status:</span>{" "}
					<span className="font-medium">{formatAppointmentStatusLabel(currentAppt.status)}</span>
				</div>
			</div>

			<AlertDialog
				open={revokeDialogOpen}
				onOpenChange={open => !isInviteActionPending && setRevokeDialogOpen(open)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Revoke patient invite?</AlertDialogTitle>
						<AlertDialogDescription>
							The patient will no longer be able to join with the current secure link. If they
							still need access, you'll need to generate a fresh invite and share it again.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isInviteActionPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmRevoke}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Revoke invite
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function VideoCallPanel({
	appointment,
	appointmentId,
	initialPatientInviteToken,
	onPatientInviteTokenChange,
}: VideoCallPanelProps) {
	const shouldFetch = !appointment && Boolean(appointmentId)
	const { data: fetched, isLoading, error, refetch } = useAppointmentQuery(
		shouldFetch ? (appointmentId ?? "") : ""
	)
	const appt = appointment ?? fetched

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Video className="text-primary size-5" />
					Video Call
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
						<Loader2 className="size-4 animate-spin" />
						Loading appointment details...
					</div>
				) : error ? (
					<div className="flex flex-col items-center gap-3 py-8 text-center">
						<AlertTriangle className="text-destructive size-8" />
						<p className="text-destructive text-sm">
							{error.message || "Unable to load appointment details."}
						</p>
						<Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
							Try again
						</Button>
					</div>
				) : !appt ? (
					<div className="flex flex-col items-center gap-2 py-8 text-center">
						<Video className="text-muted-foreground size-8" />
						<p className="text-sm font-medium">No appointment selected</p>
						<p className="text-muted-foreground text-xs">
							Pick an appointment to view video call details and manage patient invites.
						</p>
					</div>
				) : (
					<VideoCallContent
						appt={appt}
						initialPatientInviteToken={initialPatientInviteToken}
						onPatientInviteTokenChange={onPatientInviteTokenChange}
					/>
				)}
			</CardContent>
		</Card>
	)
}
