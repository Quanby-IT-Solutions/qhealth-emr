"use client"

import { useMemo, type ComponentType } from "react"
import Link from "next/link"
import {
	AlertTriangle,
	ArrowLeft,
	Calendar,
	Clock,
	Loader2,
	ShieldOff,
	User,
	Video,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	formatAppointmentStatusLabel,
	getAppointmentStatusColor,
	getPlatformLabel,
	useAppointmentQuery,
} from "@/features/telemedicine/api/telemedicine.hooks"
import { LiveKitVideoRoom } from "@/features/telemedicine/components/livekit-room"

interface VideoLinkLaunchPageProps {
	appointmentId: string
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

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

function Field({
	icon: Icon,
	label,
	value,
}: {
	icon?: ComponentType<{ className?: string }>
	label: string
	value?: string | null
}) {
	return (
		<div>
			<p className="text-muted-foreground flex items-center gap-1 text-xs">
				{Icon && <Icon className="size-3" />}
				{label}
			</p>
			<p className="text-sm font-medium">{value || "-"}</p>
		</div>
	)
}

function BackLink() {
	return (
		<Link
			href="/telemedicine"
			className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
		>
			<ArrowLeft className="size-4" />
			Back to Telemedicine
		</Link>
	)
}

export function VideoLinkLaunchPage({ appointmentId }: VideoLinkLaunchPageProps) {
	const { data: profile, isLoading: profileLoading } = useMyProfile()
	const permSet = useMemo(() => {
		const permissions = profile?.activeRole?.permissions ?? []
		return new Set(
			permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
		)
	}, [profile?.activeRole?.permissions])
	const { data: appointment, isLoading, error, refetch } = useAppointmentQuery(appointmentId)

	if (profileLoading) {
		return (
			<div className="text-muted-foreground flex min-h-[60vh] items-center justify-center gap-2 p-8">
				<Loader2 className="size-4 animate-spin" />
				Loading access...
			</div>
		)
	}

	if (!can(permSet, "telemedicine", "view")) {
		return (
			<div className="mx-auto max-w-2xl space-y-4 p-8">
				<BackLink />
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
						<div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
							<ShieldOff className="size-6" />
						</div>
						<div className="space-y-1">
							<h2 className="text-base font-semibold">Access denied</h2>
							<p className="text-muted-foreground max-w-md text-sm">
								Your role doesn't include permission to view telemedicine. Contact your facility
								administrator if you believe this is a mistake.
							</p>
						</div>
						<Button asChild variant="outline" size="sm">
							<Link href="/">Return home</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="mx-auto max-w-6xl space-y-4">
			<BackLink />

			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
								<Video className="text-primary size-5" />
							</div>
							<div>
								<CardTitle className="text-base">LiveKit Video Session</CardTitle>
								<p className="text-muted-foreground text-xs">
									{appointment?.patientName ?? "Telemedicine appointment"}
								</p>
							</div>
						</div>
						{appointment && (
							<span
								className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getAppointmentStatusColor(
									appointment.status
								)}`}
							>
								{formatAppointmentStatusLabel(appointment.status)}
							</span>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="grid gap-3 md:grid-cols-4">
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
						</div>
					) : error ? (
						<div className="flex flex-col items-center gap-3 py-6 text-center">
							<AlertTriangle className="text-destructive size-8" />
							<p className="text-destructive text-sm">
								{error.message || "Unable to load appointment details."}
							</p>
							<Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
								Try again
							</Button>
						</div>
					) : !appointment ? (
						<div className="flex flex-col items-center gap-2 py-8 text-center">
							<Video className="text-muted-foreground size-8" />
							<p className="text-sm font-medium">Appointment not found</p>
							<p className="text-muted-foreground text-xs">
								This appointment may have been cancelled or you no longer have access to it.
							</p>
							<Button asChild variant="outline" size="sm">
								<Link href="/telemedicine">Return to Telemedicine</Link>
							</Button>
						</div>
					) : (
						<div className="space-y-4">
							<div className="grid gap-3 md:grid-cols-4">
								<Field icon={User} label="Patient" value={appointment.patientName} />
								<Field label="MRN" value={appointment.patientMrn} />
								<Field icon={User} label="Clinician" value={appointment.clinicianName} />
								<Field
									icon={Video}
									label="Platform"
									value={getPlatformLabel(appointment.platform)}
								/>
								<Field icon={Calendar} label="Date" value={formatDate(appointment.scheduledDate)} />
								<Field icon={Clock} label="Time" value={formatTime(appointment.scheduledTime)} />
								<Field label="Duration" value={`${appointment.durationMinutes} min`} />
								<Field
									label="Patient Joined"
									value={appointment.patientJoinedAt ? "Yes" : "Not yet"}
								/>
							</div>
							{appointment.status === "cancelled" && (
								<div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
									<AlertTriangle className="mt-0.5 size-4 shrink-0" />
									<p>
										This appointment was cancelled. You can still review the session but the
										video link should not be shared with the patient.
									</p>
								</div>
							)}
							{appointment.status === "completed" && (
								<div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
									<AlertTriangle className="mt-0.5 size-4 shrink-0" />
									<p>This appointment is marked complete. Re-joining is allowed for review only.</p>
								</div>
							)}
							{appointment.patientInviteRevokedAt && (
								<div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
									<Badge variant="outline" className="border-amber-300 text-amber-800 text-xs">
										Patient invite revoked
									</Badge>
									<p className="text-xs">
										The patient cannot join unless you generate a new invite from the dashboard.
									</p>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{!isLoading && appointment && (
				<LiveKitVideoRoom
					appointmentId={appointmentId}
					patientName={appointment.patientName}
					clinicianName={appointment.clinicianName}
				/>
			)}
		</div>
	)
}
