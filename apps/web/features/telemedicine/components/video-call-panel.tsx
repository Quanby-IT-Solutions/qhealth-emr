"use client"

import { useState } from "react"
import {
	Check,
	Copy,
	ExternalLink,
	KeyRound,
	Loader2,
	MessageSquare,
	PhoneCall,
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

// ============================================================================
// Inner panel (renders when data is available)
// ============================================================================

function VideoCallContent({ appt }: { appt: TelemedicineAppointment }) {
	const { copied, copyText } = useCopyToClipboard()

	const platformLabel = getPlatformLabel(appt.platform)
	const hasLink = Boolean(appt.videoLink)

	return (
		<div className="space-y-4">
			{/* Status banner */}
			{!hasLink ? (
				<div className="rounded-lg bg-yellow-50 px-4 py-3">
					<p className="flex items-center gap-2 text-sm text-yellow-700">
						<Loader2 className="size-4 animate-spin" />
						Generating {platformLabel} link... This may take a moment after booking.
					</p>
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
								text={appt.videoLink!}
								copyKey="link"
								copied={copied}
								onCopy={copyText}
							/>
						</div>
						<p className="text-primary break-all text-sm underline underline-offset-2">
							{appt.videoLink}
						</p>
					</div>

					{appt.meetingId && (
						<div className="grid grid-cols-2 gap-3">
							<div className="rounded-lg border p-3">
								<div className="mb-1 flex items-center justify-between">
									<span className="text-muted-foreground flex items-center gap-1 text-xs">
										<Video className="size-3" />
										Meeting ID
									</span>
									<CopyButton
										text={appt.meetingId}
										copyKey="meetingId"
										copied={copied}
										onCopy={copyText}
									/>
								</div>
								<p className="font-mono text-sm font-medium">{appt.meetingId}</p>
							</div>
							{appt.meetingPassword && (
								<div className="rounded-lg border p-3">
									<div className="mb-1 flex items-center justify-between">
										<span className="text-muted-foreground flex items-center gap-1 text-xs">
											<KeyRound className="size-3" />
											Passcode
										</span>
										<CopyButton
											text={appt.meetingPassword}
											copyKey="password"
											copied={copied}
											onCopy={copyText}
										/>
									</div>
									<p className="font-mono text-sm font-medium">{appt.meetingPassword}</p>
								</div>
							)}
						</div>
					)}

					<Separator />

					{/* Action Buttons */}
					<div className="flex flex-wrap gap-3">
						<a
							href={appt.videoLink!}
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
							onClick={() => copyText(appt.videoLink!, "joinBtn")}
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
						The video link has been automatically sent to the patient via SMS/email. You can also
						manually share it.
					</p>
					<div className="flex flex-wrap gap-2">
						<Button variant="outline" size="sm" className="bg-white text-xs">
							<MessageSquare className="mr-1.5 size-3" />
							Send via SMS
						</Button>
						<Button variant="outline" size="sm" className="bg-white text-xs">
							<PhoneCall className="mr-1.5 size-3" />
							Send via Email
						</Button>
					</div>
				</div>
			)}

			{/* Appointment details */}
			<Separator />
			<div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
				<div>
					<span className="text-muted-foreground">Patient:</span>{" "}
					<span className="font-medium">{appt.patientName}</span>
				</div>
				<div>
					<span className="text-muted-foreground">Clinician:</span>{" "}
					<span className="font-medium">{appt.clinicianName}</span>
				</div>
				<div>
					<span className="text-muted-foreground">Date:</span>{" "}
					<span className="font-medium">{appt.scheduledDate}</span>
				</div>
				<div>
					<span className="text-muted-foreground">Time:</span>{" "}
					<span className="font-medium">{appt.scheduledTime} ({appt.durationMinutes} min)</span>
				</div>
				<div>
					<span className="text-muted-foreground">Platform:</span>{" "}
					<Badge variant="outline" className="text-xs">
						{platformLabel}
					</Badge>
				</div>
				<div>
					<span className="text-muted-foreground">Status:</span>{" "}
					<span className="font-medium capitalize">{appt.status}</span>
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
