"use client"

import { useMemo, useState, type ComponentType } from "react"
import Link from "next/link"
import {
	AlertTriangle,
	ArrowLeft,
	Calendar,
	ChevronDown,
	ChevronUp,
	Clock,
	Info,
	Loader2,
	ShieldOff,
	User,
	Video,
	X,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	formatAppointmentStatusLabel,
	getAppointmentStatusColor,
	getPatientInviteUrl,
	getPlatformLabel,
	useAppointmentQuery,
} from "@/features/telemedicine/api/telemedicine.hooks"
import { LiveKitVideoRoom } from "@/features/telemedicine/components/livekit-room"

interface VideoLinkLaunchPageProps {
	appointmentId: string
}

type BannerKind = "cancelled" | "completed" | "revoked"

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
			<p className="text-foreground text-sm font-medium">{value || "-"}</p>
		</div>
	)
}

function BackLink() {
	return (
		<Link
			href="/telemedicine"
			className="text-muted-foreground hover:text-foreground focus-visible:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors outline-none"
		>
			<ArrowLeft className="size-4" />
			Back
		</Link>
	)
}

interface BannerProps {
	tone: "warning" | "info" | "danger"
	message: string
	onDismiss: () => void
}

function TopBanner({ tone, message, onDismiss }: BannerProps) {
	const toneClass =
		tone === "danger"
			? "bg-rose-500/10 border-b border-rose-500/20 text-rose-200"
			: tone === "info"
				? "bg-sky-500/10 border-b border-sky-500/20 text-sky-200"
				: "bg-amber-500/10 border-b border-amber-500/20 text-amber-200"

	return (
		<div className={cn("flex items-center gap-2 px-4 py-2 text-xs", toneClass)}>
			<AlertTriangle className="size-3.5 shrink-0" />
			<p className="flex-1">{message}</p>
			<button
				type="button"
				aria-label="Dismiss notice"
				onClick={onDismiss}
				className="inline-flex size-5 items-center justify-center rounded-full text-current opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current"
			>
				<X className="size-3.5" />
			</button>
		</div>
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

	const [detailsOpen, setDetailsOpen] = useState(false)
	const [dismissedBanners, setDismissedBanners] = useState<Set<BannerKind>>(new Set())

	const patientInviteUrl = useMemo(() => {
		const token = appointment?.patientInviteToken
		if (!token) return null
		try {
			return getPatientInviteUrl(token)
		} catch {
			return null
		}
	}, [appointment?.patientInviteToken])

	function dismissBanner(kind: BannerKind) {
		setDismissedBanners(prev => {
			const next = new Set(prev)
			next.add(kind)
			return next
		})
	}

	if (profileLoading) {
		return (
			<div className="bg-background text-muted-foreground flex min-h-[60vh] items-center justify-center gap-2 p-8">
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
								Your role doesn&apos;t include permission to view telemedicine. Contact your
								facility administrator if you believe this is a mistake.
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

	const showCancelledBanner =
		appointment?.status === "cancelled" && !dismissedBanners.has("cancelled")
	const showCompletedBanner =
		appointment?.status === "completed" && !dismissedBanners.has("completed")
	const showRevokedBanner =
		!!appointment?.patientInviteRevokedAt && !dismissedBanners.has("revoked")

	const statusLabel = appointment ? formatAppointmentStatusLabel(appointment.status) : null
	const statusColor = appointment ? getAppointmentStatusColor(appointment.status) : ""

	const headerSummary = appointment
		? `${appointment.patientName ?? "Patient"} · ${formatDate(appointment.scheduledDate)} · ${formatTime(appointment.scheduledTime)}`
		: "Telemedicine appointment"

	return (
		<div className="bg-background text-foreground flex h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] flex-col overflow-hidden">
			<header className="bg-card/80 border-border flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-xl">
				<BackLink />
				<div className="bg-border hidden h-5 w-px sm:block" />
				<div className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center">
					<Video className="text-primary hidden size-4 shrink-0 sm:inline" />
					<p className="text-muted-foreground truncate text-sm">
						<span className="hidden sm:inline">{headerSummary}</span>
						<span className="sm:hidden">{appointment?.patientName ?? "Appointment"}</span>
					</p>
					{statusLabel && (
						<span
							className={cn(
								"hidden shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase sm:inline-flex",
								statusColor
							)}
						>
							{statusLabel}
						</span>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{appointment && (
						<span className="border-border bg-muted text-muted-foreground hidden items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase md:inline-flex">
							{getPlatformLabel(appointment.platform)}
						</span>
					)}
					<button
						type="button"
						onClick={() => setDetailsOpen(open => !open)}
						aria-expanded={detailsOpen}
						aria-controls="appointment-details-panel"
						className="border-border bg-muted text-foreground hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors outline-none focus-visible:ring-2"
					>
						<Info className="size-3.5" />
						<span className="hidden sm:inline">Details</span>
						{detailsOpen ? (
							<ChevronUp className="size-3.5" />
						) : (
							<ChevronDown className="size-3.5" />
						)}
					</button>
				</div>
			</header>

			{showCancelledBanner && (
				<TopBanner
					tone="danger"
					message="This appointment was cancelled. The video link should not be shared with the patient."
					onDismiss={() => dismissBanner("cancelled")}
				/>
			)}
			{showCompletedBanner && (
				<TopBanner
					tone="info"
					message="This appointment is marked complete. Re-joining is allowed for review only."
					onDismiss={() => dismissBanner("completed")}
				/>
			)}
			{showRevokedBanner && (
				<TopBanner
					tone="warning"
					message="Patient invite revoked. The patient cannot join unless a new invite is generated."
					onDismiss={() => dismissBanner("revoked")}
				/>
			)}

			{detailsOpen && (
				<section
					id="appointment-details-panel"
					className="border-border bg-card/60 shrink-0 border-b px-4 py-3"
				>
					{isLoading ? (
						<div className="grid gap-3 md:grid-cols-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={i} className="bg-muted h-10" />
							))}
						</div>
					) : appointment ? (
						<div className="grid gap-3 md:grid-cols-4">
							<Field icon={User} label="Patient" value={appointment.patientName} />
							<Field label="MRN" value={appointment.patientMrn} />
							<Field icon={User} label="Clinician" value={appointment.clinicianName} />
							<Field icon={Video} label="Platform" value={getPlatformLabel(appointment.platform)} />
							<Field icon={Calendar} label="Date" value={formatDate(appointment.scheduledDate)} />
							<Field icon={Clock} label="Time" value={formatTime(appointment.scheduledTime)} />
							<Field label="Duration" value={`${appointment.durationMinutes} min`} />
							<Field
								label="Patient Joined"
								value={appointment.patientJoinedAt ? "Yes" : "Not yet"}
							/>
						</div>
					) : (
						<p className="text-muted-foreground text-xs">No appointment details available.</p>
					)}
				</section>
			)}

			<main className="relative flex min-h-[360px] flex-1 flex-col overflow-hidden">
				{isLoading ? (
					<div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
						<Loader2 className="size-4 animate-spin" />
						Loading appointment...
					</div>
				) : error ? (
					<div className="flex flex-1 items-center justify-center p-6">
						<div className="border-border bg-card flex max-w-md flex-col items-center gap-3 rounded-2xl border p-6 text-center">
							<AlertTriangle className="text-destructive size-8" />
							<p className="text-foreground text-sm">
								{error.message || "Unable to load appointment details."}
							</p>
							<Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
								Try again
							</Button>
						</div>
					</div>
				) : !appointment ? (
					<div className="flex flex-1 items-center justify-center p-6">
						<div className="border-border bg-card flex max-w-md flex-col items-center gap-2 rounded-2xl border p-6 text-center">
							<Video className="text-muted-foreground size-8" />
							<p className="text-foreground text-sm font-medium">Appointment not found</p>
							<p className="text-muted-foreground text-xs">
								This appointment may have been cancelled or you no longer have access to it.
							</p>
							<Button asChild variant="outline" size="sm">
								<Link href="/telemedicine">Return to Telemedicine</Link>
							</Button>
						</div>
					</div>
				) : (
					<>
						{statusLabel && (
							<div className="pointer-events-none absolute top-3 left-3 z-10 sm:hidden">
								<Badge
									variant="outline"
									className={cn(
										"pointer-events-auto border-border bg-card/80 text-[10px] font-medium tracking-wide uppercase backdrop-blur",
										statusColor
									)}
								>
									{statusLabel}
								</Badge>
							</div>
						)}
						<LiveKitVideoRoom
							appointmentId={appointmentId}
							patientName={appointment.patientName}
							clinicianName={appointment.clinicianName}
							fullViewport
							waitingRoomPatientName={appointment.patientName}
							patientInviteUrl={patientInviteUrl}
						/>
					</>
				)}
			</main>
		</div>
	)
}
