"use client"

import { useState } from "react"
import {
	Check,
	Copy,
	ExternalLink,
	KeyRound,
	Loader2,
	Video,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import {
	getPlatformLabel,
	type TelemedicineAppointment,
	useAppointmentQuery,
	useUpdateAppointmentMutation,
} from "@/features/telemedicine/api/telemedicine.hooks"

// ============================================================================
// Types
// ============================================================================

interface VideoCallPanelProps {
	/** Pass either a full appointment object or just the appointmentId */
	appointment?: TelemedicineAppointment
	appointmentId?: string
}

// ============================================================================
// Helpers
// ============================================================================

function useCopyToClipboard() {
	const [copied, setCopied] = useState<string | null>(null)

	function copyText(text: string, key: string) {
		void navigator.clipboard.writeText(text).then(() => {
			setCopied(key)
			setTimeout(() => setCopied(null), 2000)
		})
	}

	return { copied, copyText }
}

function CopyButton({
	text,
	copyKey,
	copied,
	onCopy,
}: {
	text: string
	copyKey: string
	copied: string | null
	onCopy: (text: string, key: string) => void
}) {
	const isCopied = copied === copyKey
	return (
		<button
			type="button"
			onClick={() => onCopy(text, copyKey)}
			className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
			aria-label="Copy to clipboard"
		>
			{isCopied ? (
				<>
					<Check className="size-3 text-green-500" />
					<span className="text-green-500">Copied!</span>
				</>
			) : (
				<>
					<Copy className="size-3" />
					<span>Copy</span>
				</>
			)}
		</button>
	)
}

function isValidMeetingUrl(value: string): boolean {
	try {
		const url = new URL(value)
		return url.protocol === "https:" && Boolean(url.hostname)
	} catch {
		return false
	}
}

// ============================================================================
// Inner panel (renders when data is available)
// ============================================================================

function VideoCallContent({ appt }: { appt: TelemedicineAppointment }) {
	const { copied, copyText } = useCopyToClipboard()
	const [currentAppt, setCurrentAppt] = useState(appt)
	const [videoLink, setVideoLink] = useState(appt.videoLink ?? "")
	const [meetingId, setMeetingId] = useState(appt.meetingId ?? "")
	const [meetingPassword, setMeetingPassword] = useState(appt.meetingPassword ?? "")
	const [error, setError] = useState<string | null>(null)
	const updateMutation = useUpdateAppointmentMutation()

	const platformLabel = getPlatformLabel(currentAppt.platform)
	const hasLink = Boolean(currentAppt.videoLink)

	async function handleSaveLink(e: React.FormEvent) {
		e.preventDefault()
		setError(null)

		const trimmedVideoLink = videoLink.trim()
		if (!isValidMeetingUrl(trimmedVideoLink)) {
			setError("Enter a valid HTTPS Zoom or Teams meeting link.")
			return
		}

		try {
			const updated = await updateMutation.mutateAsync({
				id: currentAppt.id,
				videoLink: trimmedVideoLink,
				meetingId: meetingId.trim() || null,
				meetingPassword: meetingPassword.trim() || null,
			})
			setCurrentAppt(updated)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save video link.")
		}
	}

	return (
		<div className="space-y-4">
			{/* Status banner */}
			{!hasLink ? (
				<div className="space-y-3 rounded-lg bg-yellow-50 px-4 py-3">
					<p className="text-sm text-yellow-800">
						No video link has been set for this appointment. Enter a Zoom or Teams meeting link manually.
					</p>
					<form onSubmit={handleSaveLink} className="space-y-3">
						<input
							type="url"
							className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
							value={videoLink}
							onChange={(e) => setVideoLink(e.target.value)}
							placeholder="https://..."
							required
						/>
						<div className="grid grid-cols-2 gap-3">
							<input
								className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
								value={meetingId}
								onChange={(e) => setMeetingId(e.target.value)}
								placeholder="Meeting ID"
							/>
							<input
								className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
								value={meetingPassword}
								onChange={(e) => setMeetingPassword(e.target.value)}
								placeholder="Passcode"
							/>
						</div>
						{error && <p className="text-destructive text-sm">{error}</p>}
						<Button type="submit" size="sm" disabled={updateMutation.isPending}>
							{updateMutation.isPending ? "Saving..." : "Save Link"}
						</Button>
					</form>
				</div>
			) : (
				<div className="rounded-lg bg-green-50 px-4 py-3">
					<p className="flex items-center gap-2 text-sm text-green-700">
						<Video className="size-4" />
						{platformLabel} meeting is ready to join.
					</p>
				</div>
			)}

			{/* Video link */}
			{hasLink && (
				<div className="space-y-3">
					<div className="rounded-lg border p-3">
						<div className="mb-1.5 flex items-center justify-between">
							<span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
								Meeting Link
							</span>
							<CopyButton
								text={currentAppt.videoLink!}
								copyKey="link"
								copied={copied}
								onCopy={copyText}
							/>
						</div>
						<p className="text-primary break-all text-sm underline underline-offset-2">
							{currentAppt.videoLink}
						</p>
					</div>

					{currentAppt.meetingId && (
						<div className="grid grid-cols-2 gap-3">
							<div className="rounded-lg border p-3">
								<div className="mb-1 flex items-center justify-between">
									<span className="text-muted-foreground flex items-center gap-1 text-xs">
										<Video className="size-3" />
										Meeting ID
									</span>
									<CopyButton
										text={currentAppt.meetingId}
										copyKey="meetingId"
										copied={copied}
										onCopy={copyText}
									/>
								</div>
								<p className="font-mono text-sm font-medium">{currentAppt.meetingId}</p>
							</div>
							{currentAppt.meetingPassword && (
								<div className="rounded-lg border p-3">
									<div className="mb-1 flex items-center justify-between">
										<span className="text-muted-foreground flex items-center gap-1 text-xs">
											<KeyRound className="size-3" />
											Passcode
										</span>
										<CopyButton
											text={currentAppt.meetingPassword}
											copyKey="password"
											copied={copied}
											onCopy={copyText}
										/>
									</div>
									<p className="font-mono text-sm font-medium">{currentAppt.meetingPassword}</p>
								</div>
							)}
						</div>
					)}

					<Separator />

					{/* Action Buttons */}
					<div className="flex flex-wrap gap-3">
						<a
							href={currentAppt.videoLink!}
							target="_blank"
							rel="noopener noreferrer"
							className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
						>
							<Video className="size-4" />
							Join {platformLabel} Call
							<ExternalLink className="size-3" />
						</a>
						<Button
							variant="outline"
							size="sm"
							onClick={() => copyText(currentAppt.videoLink!, "joinBtn")}
						>
							{copied === "joinBtn" ? (
								<>
									<Check className="mr-1.5 size-3 text-green-500" />
									Copied!
								</>
							) : (
								<>
									<Copy className="mr-1.5 size-3" />
									Copy Link
								</>
							)}
						</Button>
					</div>
				</div>
			)}

			{/* Patient sharing section */}
			{hasLink && (
				<div className="rounded-lg bg-blue-50 p-4">
					<h4 className="mb-2 text-sm font-medium text-blue-800">Share with Patient</h4>
					<p className="mb-3 text-xs text-blue-700">
						Copy the link below and share it with the patient directly.
					</p>
				</div>
			)}

			{/* Appointment details */}
			<Separator />
			<div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
				<div>
					<span className="text-muted-foreground">Patient:</span>{" "}
					<span className="font-medium">{currentAppt.patientName}</span>
				</div>
				<div>
					<span className="text-muted-foreground">Clinician:</span>{" "}
					<span className="font-medium">{currentAppt.clinicianName}</span>
				</div>
				<div>
					<span className="text-muted-foreground">Date:</span>{" "}
					<span className="font-medium">{currentAppt.scheduledDate}</span>
				</div>
				<div>
					<span className="text-muted-foreground">Time:</span>{" "}
					<span className="font-medium">{currentAppt.scheduledTime} ({currentAppt.durationMinutes} min)</span>
				</div>
				<div>
					<span className="text-muted-foreground">Platform:</span>{" "}
					<Badge variant="outline" className="text-xs">
						{platformLabel}
					</Badge>
				</div>
				<div>
					<span className="text-muted-foreground">Status:</span>{" "}
					<span className="font-medium capitalize">{currentAppt.status}</span>
				</div>
			</div>
		</div>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function VideoCallPanel({ appointment, appointmentId }: VideoCallPanelProps) {
	// If full appointment is passed, use it directly (no query needed)
	const shouldFetch = !appointment && Boolean(appointmentId)
	const { data: fetched, isLoading } = useAppointmentQuery(shouldFetch ? (appointmentId ?? "") : "")
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
					<div className="flex items-center gap-2 py-6 text-sm text-gray-500">
						<Loader2 className="size-4 animate-spin" />
						Loading appointment details...
					</div>
				) : !appt ? (
					<p className="text-muted-foreground py-6 text-center text-sm">
						Select an appointment to view video call details.
					</p>
				) : (
					<VideoCallContent appt={appt} />
				)}
			</CardContent>
		</Card>
	)
}
