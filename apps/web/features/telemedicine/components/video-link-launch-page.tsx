"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Copy, ExternalLink, KeyRound, Loader2, Video } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	formatAppointmentStatusLabel,
	getPlatformLabel,
	useAppointmentQuery,
} from "@/features/telemedicine/api/telemedicine.hooks"

interface VideoLinkLaunchPageProps {
	appointmentId: string
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

function formatDate(val: string): string {
	if (!val) return "-"
	return new Date(val).toLocaleDateString("en-PH", {
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

function Field({ label, value }: { label: string; value?: string | null }) {
	return (
		<div>
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="text-sm font-medium">{value || "-"}</p>
		</div>
	)
}

export function VideoLinkLaunchPage({ appointmentId }: VideoLinkLaunchPageProps) {
	const { data: profile, isLoading: profileLoading } = useMyProfile()
	const permSet = useMemo(() => {
		const permissions = profile?.activeRole?.permissions ?? []
		return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
	}, [profile?.activeRole?.permissions])
	const { data: appointment, isLoading } = useAppointmentQuery(appointmentId)
	const [copied, setCopied] = useState(false)

	function copyMeetingLink() {
		if (!appointment?.videoLink) return
		void navigator.clipboard.writeText(appointment.videoLink).then(() => {
			setCopied(true)
			window.setTimeout(() => setCopied(false), 2000)
		})
	}

	if (profileLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center gap-2 p-8 text-muted-foreground">
				<Loader2 className="size-4 animate-spin" />
				Loading access...
			</div>
		)
	}

	if (!can(permSet, "telemedicine", "view")) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access telemedicine.
			</div>
		)
	}

	return (
		<div className="mx-auto max-w-3xl space-y-4">
			<Link
				href="/telemedicine"
				className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
			>
				<ArrowLeft className="size-4" />
				Back to Telemedicine
			</Link>

			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
								<Video className="text-primary size-5" />
							</div>
							<div>
								<CardTitle className="text-base">Video Link Launch</CardTitle>
								<p className="text-muted-foreground text-xs">
									{appointment?.patientName ?? "Telemedicine appointment"}
								</p>
							</div>
						</div>
						{appointment && (
							<Badge variant="outline">{formatAppointmentStatusLabel(appointment.status)}</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex items-center gap-2 py-6 text-sm text-gray-500">
							<Loader2 className="size-4 animate-spin" />
							Loading appointment...
						</div>
					) : !appointment ? (
						<p className="text-muted-foreground py-6 text-center text-sm">
							Appointment details are unavailable.
						</p>
					) : (
						<div className="space-y-5">
							<div className="grid gap-3 md:grid-cols-4">
								<Field label="Patient" value={appointment.patientName} />
								<Field label="MRN" value={appointment.patientMrn} />
								<Field label="Clinician" value={appointment.clinicianName} />
								<Field label="Platform" value={getPlatformLabel(appointment.platform)} />
								<Field label="Date" value={formatDate(appointment.scheduledDate)} />
								<Field label="Time" value={appointment.scheduledTime} />
								<Field label="Duration" value={`${appointment.durationMinutes} min`} />
							</div>

							<Separator />

							{appointment.videoLink ? (
								<div className="space-y-4">
									<div className="rounded-lg border p-3">
										<div className="mb-2 flex items-center justify-between gap-3">
											<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
												Meeting Link
											</p>
											<button
												type="button"
												onClick={copyMeetingLink}
												className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
											>
												{copied ? (
													<>
														<Check className="size-3 text-green-500" />
														Copied
													</>
												) : (
													<>
														<Copy className="size-3" />
														Copy
													</>
												)}
											</button>
										</div>
										<p className="text-primary break-all text-sm underline underline-offset-2">
											{appointment.videoLink}
										</p>
									</div>

									{(appointment.meetingId || appointment.meetingPassword) && (
										<div className="grid gap-3 md:grid-cols-2">
											{appointment.meetingId && (
												<div className="rounded-lg border p-3">
													<p className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
														<Video className="size-3" />
														Meeting ID
													</p>
													<p className="font-mono text-sm font-medium">
														{appointment.meetingId}
													</p>
												</div>
											)}
											{appointment.meetingPassword && (
												<div className="rounded-lg border p-3">
													<p className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
														<KeyRound className="size-3" />
														Passcode
													</p>
													<p className="font-mono text-sm font-medium">
														{appointment.meetingPassword}
													</p>
												</div>
											)}
										</div>
									)}

									<a
										href={appointment.videoLink}
										target="_blank"
										rel="noopener noreferrer"
										className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
									>
										<Video className="size-4" />
										Open {getPlatformLabel(appointment.platform)}
										<ExternalLink className="size-3" />
									</a>
								</div>
							) : (
								<p className="text-muted-foreground rounded-lg border p-4 text-sm">
									No meeting link has been saved for this appointment.
								</p>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
