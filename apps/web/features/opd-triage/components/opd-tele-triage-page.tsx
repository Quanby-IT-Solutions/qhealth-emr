"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
	Activity,
	CalendarClock,
	ClipboardList,
	PhoneCall,
	RefreshCw,
	UserCheck,
	Video,
	XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { FaceScanVitalsButton } from "@/features/face-scan/components/face-scan-vitals-button"
import { toOpdTriageFields } from "@/features/face-scan/lib/face-scan-vitals"
import {
	useCancelOpdRemoteTriageMutation,
	useCreateOpdRemoteTriageMutation,
	useEndOpdRemoteLiveKitSessionMutation,
	useJoinOpdRemoteLiveKitRoomMutation,
	useMarkOpdRemoteArrivedMutation,
	useOpdRemoteTriageListQuery,
} from "@/features/opd-triage/api/opd-triage.hooks"
import { LiveKitTokenRoom } from "@/features/telemedicine/components/livekit-room"

type ChannelType = "phone" | "video"
type CallerRelationship = "self" | "family" | "caregiver" | "other"
type ProvisionalAcuity = "urgent" | "routine" | "scheduled"
type RemoteStatus = "pending_arrival" | "arrived" | "cancelled" | "no_show"
type QueueFilter = RemoteStatus | "all"

const INITIAL_FORM = {
	callerName: "",
	callerRelationship: "self" as CallerRelationship,
	patientLocation: "",
	channelType: "phone" as ChannelType,
	videoLink: "",
	etaMinutes: "30",
	scheduledArrivalTime: "",
	chiefComplaint: "",
	assessmentNotes: "",
	provisionalAcuity: "routine" as ProvisionalAcuity,
	systolicBp: "",
	diastolicBp: "",
	temperatureCelsius: "",
	heartRateBpm: "",
	respiratoryRate: "",
	oxygenSatPct: "",
}

type FormErrors = Partial<Record<keyof typeof INITIAL_FORM | "arrival", string>>

const RED_FLAG_OPTIONS = [
	"Chest pain",
	"Breathing difficulty",
	"Severe bleeding",
	"Altered sensorium",
	"Stroke symptoms",
	"High fever",
]

const PREPARATION_OPTIONS = [
	"Wheelchair",
	"Isolation mask",
	"Fast-track registration",
	"Interpreter",
]

const QUEUE_FILTERS: { value: QueueFilter; label: string }[] = [
	{ value: "pending_arrival", label: "Pending" },
	{ value: "arrived", label: "Arrived" },
	{ value: "cancelled", label: "Cancelled" },
	{ value: "no_show", label: "No-show" },
	{ value: "all", label: "All" },
]

function parseOptionalInt(value: string) {
	return value.trim() ? Number.parseInt(value, 10) : undefined
}

function parseOptionalFloat(value: string) {
	return value.trim() ? Number.parseFloat(value) : undefined
}

function toggleValue(values: string[], value: string) {
	return values.includes(value) ? values.filter(v => v !== value) : [...values, value]
}

function buildAssessmentNotes(notes: string, redFlags: string[], preparations: string[]) {
	const sections = [notes.trim()]
	if (redFlags.length) sections.push(`Red flags: ${redFlags.join(", ")}`)
	if (preparations.length) sections.push(`Preparation needs: ${preparations.join(", ")}`)
	return sections.filter(Boolean).join("\n\n")
}

function isPositiveIntegerInRange(value: string, min: number, max: number) {
	if (!value.trim()) return true
	const parsed = Number.parseInt(value, 10)
	return Number.isInteger(parsed) && parsed >= min && parsed <= max
}

function isNumberInRange(value: string, min: number, max: number) {
	if (!value.trim()) return true
	const parsed = Number.parseFloat(value)
	return Number.isFinite(parsed) && parsed >= min && parsed <= max
}

function isFutureLocalDateTime(value: string) {
	if (!value.trim()) return true
	const parsed = new Date(value)
	return Number.isFinite(parsed.getTime()) && parsed.getTime() > Date.now()
}

function isValidUrl(value: string) {
	if (!value.trim()) return true
	try {
		const url = new URL(value)
		return url.protocol === "https:" || url.protocol === "http:"
	} catch {
		return false
	}
}

function getLocalDateTimeInputMinimum(): string {
	const now = new Date()
	now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
	return now.toISOString().slice(0, 16)
}

function acuityBadgeClass(acuity: ProvisionalAcuity) {
	switch (acuity) {
		case "urgent":
			return "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300"
		case "routine":
			return "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300"
		case "scheduled":
			return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
	}
}

function statusLabel(status: RemoteStatus) {
	switch (status) {
		case "pending_arrival":
			return "Pending"
		case "arrived":
			return "Arrived"
		case "cancelled":
			return "Cancelled"
		case "no_show":
			return "No-show"
	}
}

function statusBadgeClass(status: RemoteStatus) {
	switch (status) {
		case "pending_arrival":
			return "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"
		case "arrived":
			return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
		case "cancelled":
			return "border-muted-foreground/30 bg-muted text-muted-foreground"
		case "no_show":
			return "border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300"
	}
}

function formatDateTime(value: Date | string | null) {
	if (!value) return null
	return new Date(value).toLocaleString()
}

function EtaCountdown({ etaAt }: { etaAt: Date | string | null }) {
	const [remaining, setRemaining] = useState(() =>
		etaAt ? Math.max(0, Math.floor((new Date(etaAt).getTime() - Date.now()) / 60_000)) : null
	)

	useEffect(() => {
		if (!etaAt) return
		const id = setInterval(() => {
			setRemaining(Math.max(0, Math.floor((new Date(etaAt).getTime() - Date.now()) / 60_000)))
		}, 30_000)
		return () => clearInterval(id)
	}, [etaAt])

	if (remaining === null) return null
	return <span className="font-medium">{remaining === 0 ? "Arriving now" : `${remaining}m`}</span>
}

function FieldError({ message }: { message?: string }) {
	if (!message) return null
	return <p className="text-destructive text-xs">{message}</p>
}

export function OpdTeleTriagePage() {
	const router = useRouter()
	const activeFacilityId = useActiveFacilityId()
	const facilityId = activeFacilityId ?? ""
	const { data: profile } = useMyProfile()
	const staffProfileId = profile?.staffProfiles?.[0]?.id ?? ""
	const permissions: { module: string; action: string }[] = profile?.activeRole?.permissions ?? []
	const canEdit = permissions.some(p => p.module === "nursing" && p.action === "create")

	const createRemote = useCreateOpdRemoteTriageMutation()
	const markArrived = useMarkOpdRemoteArrivedMutation()
	const cancelRemote = useCancelOpdRemoteTriageMutation()
	const joinLiveKit = useJoinOpdRemoteLiveKitRoomMutation()
	const endLiveKit = useEndOpdRemoteLiveKitSessionMutation()
	const [queueFilter, setQueueFilter] = useState<QueueFilter>("pending_arrival")
	const queryStatus = queueFilter === "all" ? undefined : queueFilter
	const {
		data: queue = [],
		isLoading,
		isFetching,
		refetch,
	} = useOpdRemoteTriageListQuery({ facilityId, status: queryStatus }, { enabled: !!facilityId })
	const [now, setNow] = useState(Date.now)
	const urgentCount = queue.filter(patient => patient.provisionalAcuity === "urgent").length
	const videoCount = queue.filter(patient => patient.channelType === "video").length
	const pendingCount = queue.filter(patient => patient.status === "pending_arrival").length
	const arrivedCount = queue.filter(patient => patient.status === "arrived").length
	const arrivingSoonCount = queue.filter(patient => {
		if (!patient.etaAt) return false
		const minutes = Math.floor((new Date(patient.etaAt).getTime() - now) / 60_000)
		return minutes >= 0 && minutes <= 15
	}).length
	const minScheduledArrivalTime = getLocalDateTimeInputMinimum()

	const [form, setForm] = useState(INITIAL_FORM)
	const [redFlags, setRedFlags] = useState<string[]>([])
	const [preparationNeeds, setPreparationNeeds] = useState<string[]>([])
	const [errors, setErrors] = useState<FormErrors>({})
	const [activeVideo, setActiveVideo] = useState<{
		id: string
		callerName: string
		sessionCount: number
	} | null>(null)

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 30_000)
		return () => clearInterval(id)
	}, [])

	const update = (field: keyof typeof form, value: string) => {
		setForm(prev => ({ ...prev, [field]: value }))
		setErrors(prev => {
			if (!prev[field]) return prev
			const next = { ...prev }
			delete next[field]
			if (field === "etaMinutes" || field === "scheduledArrivalTime") delete next.arrival
			return next
		})
	}

	function applyFaceScanVitals(vitals: Parameters<typeof toOpdTriageFields>[0]) {
		const mapped = toOpdTriageFields(vitals)
		if (mapped.systolicBp) update("systolicBp", mapped.systolicBp)
		if (mapped.diastolicBp) update("diastolicBp", mapped.diastolicBp)
		if (mapped.heartRateBpm) update("heartRateBpm", mapped.heartRateBpm)
		if (mapped.respiratoryRate) update("respiratoryRate", mapped.respiratoryRate)
		if (mapped.oxygenSatPct) update("oxygenSatPct", mapped.oxygenSatPct)
	}

	function validateForm() {
		const nextErrors: FormErrors = {}
		if (!form.callerName.trim()) nextErrors.callerName = "Caller name is required."
		if (!form.patientLocation.trim()) nextErrors.patientLocation = "Patient location is required."
		if (!form.chiefComplaint.trim()) nextErrors.chiefComplaint = "Chief complaint is required."
		if (!form.etaMinutes.trim() && !form.scheduledArrivalTime) {
			nextErrors.arrival = "ETA or scheduled arrival is required."
		}
		if (!isPositiveIntegerInRange(form.etaMinutes, 0, 480)) {
			nextErrors.etaMinutes = "ETA must be 0 to 480 minutes."
		}
		if (form.scheduledArrivalTime && !isFutureLocalDateTime(form.scheduledArrivalTime)) {
			nextErrors.scheduledArrivalTime = "Scheduled arrival must be in the future."
		}
		if (form.channelType === "video" && !isValidUrl(form.videoLink)) {
			nextErrors.videoLink = "Enter a valid http or https video link."
		}
		if (!isPositiveIntegerInRange(form.systolicBp, 40, 300)) {
			nextErrors.systolicBp = "Systolic BP must be 40 to 300."
		}
		if (!isPositiveIntegerInRange(form.diastolicBp, 20, 200)) {
			nextErrors.diastolicBp = "Diastolic BP must be 20 to 200."
		}
		if (!isNumberInRange(form.temperatureCelsius, 30, 45)) {
			nextErrors.temperatureCelsius = "Temperature must be 30 to 45."
		}
		if (!isPositiveIntegerInRange(form.heartRateBpm, 20, 250)) {
			nextErrors.heartRateBpm = "Heart rate must be 20 to 250."
		}
		if (!isPositiveIntegerInRange(form.respiratoryRate, 5, 80)) {
			nextErrors.respiratoryRate = "Respiratory rate must be 5 to 80."
		}
		if (!isNumberInRange(form.oxygenSatPct, 0, 100)) {
			nextErrors.oxygenSatPct = "O2 saturation must be 0 to 100."
		}

		setErrors(nextErrors)
		if (Object.keys(nextErrors).length > 0) {
			toast.error("Remote intake cannot be queued yet", {
				description: Object.values(nextErrors)[0],
			})
		}
		return Object.keys(nextErrors).length === 0
	}

	function resetForm() {
		setForm(INITIAL_FORM)
		setRedFlags([])
		setPreparationNeeds([])
		setErrors({})
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!facilityId || !staffProfileId) return
		if (!validateForm()) return
		if (!window.confirm("Queue this OPD remote intake for triage follow-up?")) return

		const assessmentNotes = buildAssessmentNotes(form.assessmentNotes, redFlags, preparationNeeds)

		createRemote.mutate(
			{
				facilityId,
				callerName: form.callerName.trim(),
				callerRelationship: form.callerRelationship,
				patientLocation: form.patientLocation.trim(),
				channelType: form.channelType,
				...(form.videoLink.trim() ? { videoLink: form.videoLink.trim() } : {}),
				...(form.etaMinutes.trim() ? { etaMinutes: Number.parseInt(form.etaMinutes, 10) } : {}),
				...(form.scheduledArrivalTime
					? { scheduledArrivalTime: new Date(form.scheduledArrivalTime) }
					: {}),
				chiefComplaint: form.chiefComplaint.trim(),
				assessmentNotes: assessmentNotes || undefined,
				provisionalAcuity: form.provisionalAcuity,
				systolicBp: parseOptionalInt(form.systolicBp),
				diastolicBp: parseOptionalInt(form.diastolicBp),
				temperatureCelsius: parseOptionalFloat(form.temperatureCelsius),
				heartRateBpm: parseOptionalInt(form.heartRateBpm),
				respiratoryRate: parseOptionalInt(form.respiratoryRate),
				oxygenSatPct: parseOptionalFloat(form.oxygenSatPct),
				triageStaffId: staffProfileId,
			},
			{
				onSuccess: () => {
					toast.success("OPD remote intake queued")
					resetForm()
				},
				onError: () => toast.error("Failed to queue OPD remote intake"),
			}
		)
	}

	function handleArrived(id: string) {
		if (!window.confirm("Mark this remote intake as arrived and create the OPD triage intake?"))
			return
		markArrived.mutate(
			{ id },
			{
				onSuccess: result => {
					toast.success("OPD triage intake created")
					router.push(`/patients/register?pendingTriageId=${result.triageIntakeId}`)
				},
				onError: () => toast.error("Failed to mark OPD remote intake arrived"),
			}
		)
	}

	function handleCancel(id: string, status: "cancelled" | "no_show") {
		const confirmed = window.confirm(
			status === "no_show" ? "Mark this remote intake as no-show?" : "Cancel this remote intake?"
		)
		if (!confirmed) return
		cancelRemote.mutate(
			{ id, status },
			{
				onSuccess: () =>
					toast.success(status === "no_show" ? "Marked no-show" : "Remote intake cancelled"),
				onError: () => toast.error("Failed to update OPD remote intake"),
			}
		)
	}

	function handleRefresh() {
		setNow(Date.now())
		void refetch()
	}

	function handleJoinVideo(id: string, callerName: string) {
		joinLiveKit.mutate(
			{ id },
			{
				onSuccess: () => {
					setActiveVideo(prev => ({
						id,
						callerName,
						sessionCount: prev?.id === id ? prev.sessionCount + 1 : 1,
					}))
				},
				onError: () => toast.error("Failed to start OPD video session"),
			}
		)
	}

	function handleEndVideo() {
		const current = activeVideo
		if (!current) return
		endLiveKit.mutate(
			{ id: current.id },
			{
				onSettled: () => {
					joinLiveKit.reset()
					setActiveVideo(null)
				},
			}
		)
	}

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
			<div className="space-y-4">
				<div>
					<h1 className="text-2xl font-semibold">OPD Tele-Triage</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Assess outpatient callers before arrival and hand them off to OPD triage.
					</p>
				</div>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between gap-3">
						<CardTitle className="flex items-center gap-2">
							<Video className="size-5" />
							{activeVideo ? activeVideo.callerName : "Video Session"}
						</CardTitle>
						{activeVideo ? (
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={endLiveKit.isPending}
								onClick={handleEndVideo}
							>
								End Session
							</Button>
						) : null}
					</CardHeader>
					<CardContent>
						{activeVideo ? (
							<LiveKitTokenRoom
								key={`opd-tele-triage:${activeVideo.id}:${activeVideo.sessionCount}`}
								response={joinLiveKit.data}
								choices={{ audioEnabled: false, videoEnabled: false }}
								className="juanmeds-livekit-room min-h-[520px]"
								onDisconnected={handleEndVideo}
							/>
						) : (
							<div className="bg-muted/30 flex min-h-64 items-center justify-center rounded-md border border-dashed">
								<div className="text-center">
									<Video className="text-muted-foreground mx-auto mb-2 size-8" />
									<p className="text-muted-foreground text-sm">No active video session</p>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<PhoneCall className="size-5" />
							Remote Intake
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="callerName">Caller Name</Label>
								<Input
									id="callerName"
									required
									value={form.callerName}
									onChange={e => update("callerName", e.target.value)}
									placeholder="Caller or patient name"
								/>
								<FieldError message={errors.callerName} />
							</div>
							<div className="space-y-2">
								<Label>Relationship</Label>
								<Select
									value={form.callerRelationship}
									onValueChange={v => {
										if (v) update("callerRelationship", v)
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="self">Self</SelectItem>
										<SelectItem value="family">Family</SelectItem>
										<SelectItem value="caregiver">Caregiver</SelectItem>
										<SelectItem value="other">Other</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="patientLocation">Patient Location</Label>
								<Input
									id="patientLocation"
									required
									value={form.patientLocation}
									onChange={e => update("patientLocation", e.target.value)}
									placeholder="Home address, barangay, landmark, or clinic"
								/>
								<FieldError message={errors.patientLocation} />
							</div>
							<div className="space-y-2">
								<Label>Channel</Label>
								<div className="flex gap-2">
									<Button
										type="button"
										size="sm"
										variant={form.channelType === "phone" ? "default" : "outline"}
										onClick={() => update("channelType", "phone")}
										className="flex-1"
									>
										<PhoneCall className="size-4" />
										Phone
									</Button>
									<Button
										type="button"
										size="sm"
										variant={form.channelType === "video" ? "default" : "outline"}
										onClick={() => update("channelType", "video")}
										className="flex-1"
									>
										<Video className="size-4" />
										Video
									</Button>
								</div>
							</div>
							<div className="space-y-2">
								<Label>Acuity</Label>
								<Select
									value={form.provisionalAcuity}
									onValueChange={v => {
										if (v) update("provisionalAcuity", v)
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="urgent">Urgent</SelectItem>
										<SelectItem value="routine">Routine</SelectItem>
										<SelectItem value="scheduled">Scheduled</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="etaMinutes">ETA Minutes</Label>
								<Input
									id="etaMinutes"
									inputMode="numeric"
									value={form.etaMinutes}
									onChange={e => update("etaMinutes", e.target.value)}
									placeholder="30"
								/>
								<FieldError message={errors.etaMinutes ?? errors.arrival} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="scheduledArrivalTime">Scheduled Arrival</Label>
								<Input
									id="scheduledArrivalTime"
									type="datetime-local"
									min={minScheduledArrivalTime}
									value={form.scheduledArrivalTime}
									onChange={e => update("scheduledArrivalTime", e.target.value)}
								/>
								<FieldError
									message={
										errors.scheduledArrivalTime ?? (!errors.etaMinutes ? errors.arrival : undefined)
									}
								/>
							</div>
							{form.channelType === "video" && (
								<div className="space-y-2 md:col-span-2">
									<Label htmlFor="videoLink">Video Link</Label>
									<Input
										id="videoLink"
										type="url"
										value={form.videoLink}
										onChange={e => update("videoLink", e.target.value)}
										placeholder="https://..."
									/>
									<FieldError message={errors.videoLink} />
								</div>
							)}
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="chiefComplaint">Chief Complaint</Label>
								<Textarea
									id="chiefComplaint"
									required
									value={form.chiefComplaint}
									onChange={e => update("chiefComplaint", e.target.value)}
									placeholder="Primary symptom or reason for OPD visit"
									rows={3}
								/>
								<FieldError message={errors.chiefComplaint} />
							</div>
							<div className="md:col-span-2">
								<div className="mb-3 flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<Activity className="text-muted-foreground size-4" />
										<h2 className="text-sm font-medium">Vitals</h2>
									</div>
									<FaceScanVitalsButton
										facilityId={facilityId || undefined}
										onComplete={applyFaceScanVitals}
									/>
								</div>
								<div className="grid gap-4 md:grid-cols-3">
									<div className="space-y-2">
										<Label htmlFor="systolicBp">Systolic BP</Label>
										<Input
											id="systolicBp"
											inputMode="numeric"
											value={form.systolicBp}
											onChange={e => update("systolicBp", e.target.value)}
										/>
										<FieldError message={errors.systolicBp} />
									</div>
									<div className="space-y-2">
										<Label htmlFor="diastolicBp">Diastolic BP</Label>
										<Input
											id="diastolicBp"
											inputMode="numeric"
											value={form.diastolicBp}
											onChange={e => update("diastolicBp", e.target.value)}
										/>
										<FieldError message={errors.diastolicBp} />
									</div>
									<div className="space-y-2">
										<Label htmlFor="temperatureCelsius">Temperature C</Label>
										<Input
											id="temperatureCelsius"
											inputMode="decimal"
											value={form.temperatureCelsius}
											onChange={e => update("temperatureCelsius", e.target.value)}
										/>
										<FieldError message={errors.temperatureCelsius} />
									</div>
									<div className="space-y-2">
										<Label htmlFor="heartRateBpm">Heart Rate</Label>
										<Input
											id="heartRateBpm"
											inputMode="numeric"
											value={form.heartRateBpm}
											onChange={e => update("heartRateBpm", e.target.value)}
										/>
										<FieldError message={errors.heartRateBpm} />
									</div>
									<div className="space-y-2">
										<Label htmlFor="respiratoryRate">Respiratory Rate</Label>
										<Input
											id="respiratoryRate"
											inputMode="numeric"
											value={form.respiratoryRate}
											onChange={e => update("respiratoryRate", e.target.value)}
										/>
										<FieldError message={errors.respiratoryRate} />
									</div>
									<div className="space-y-2">
										<Label htmlFor="oxygenSatPct">O2 Sat %</Label>
										<Input
											id="oxygenSatPct"
											inputMode="decimal"
											value={form.oxygenSatPct}
											onChange={e => update("oxygenSatPct", e.target.value)}
										/>
										<FieldError message={errors.oxygenSatPct} />
									</div>
								</div>
							</div>
							<div className="space-y-3 md:col-span-2">
								<div className="flex items-center gap-2">
									<ClipboardList className="text-muted-foreground size-4" />
									<h2 className="text-sm font-medium">Red Flags</h2>
								</div>
								<div className="flex flex-wrap gap-2">
									{RED_FLAG_OPTIONS.map(flag => (
										<Button
											key={flag}
											type="button"
											size="sm"
											variant={redFlags.includes(flag) ? "default" : "outline"}
											onClick={() => setRedFlags(prev => toggleValue(prev, flag))}
										>
											{flag}
										</Button>
									))}
								</div>
							</div>
							<div className="space-y-3 md:col-span-2">
								<div className="flex items-center gap-2">
									<CalendarClock className="text-muted-foreground size-4" />
									<h2 className="text-sm font-medium">Preparation</h2>
								</div>
								<div className="flex flex-wrap gap-2">
									{PREPARATION_OPTIONS.map(need => (
										<Button
											key={need}
											type="button"
											size="sm"
											variant={preparationNeeds.includes(need) ? "default" : "outline"}
											onClick={() => setPreparationNeeds(prev => toggleValue(prev, need))}
										>
											{need}
										</Button>
									))}
								</div>
							</div>
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="assessmentNotes">Assessment Notes</Label>
								<Textarea
									id="assessmentNotes"
									value={form.assessmentNotes}
									onChange={e => update("assessmentNotes", e.target.value)}
									placeholder="Red flags, advice given, preparation notes"
									rows={3}
								/>
							</div>
							<div className="md:col-span-2">
								<Button
									type="submit"
									disabled={
										!canEdit ||
										!facilityId ||
										!staffProfileId ||
										createRemote.isPending ||
										!form.callerName.trim() ||
										!form.patientLocation.trim() ||
										!form.chiefComplaint.trim()
									}
								>
									<CalendarClock className="size-4" />
									{createRemote.isPending ? "Queuing..." : "Queue OPD Patient"}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>

			<Card className="h-fit">
				<CardHeader className="space-y-3">
					<div className="flex items-center justify-between gap-3">
						<CardTitle>Inbound OPD Queue</CardTitle>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={isFetching}
							onClick={handleRefresh}
						>
							<RefreshCw className="size-4" />
							Refresh
						</Button>
					</div>
					<div className="flex flex-wrap gap-2">
						{QUEUE_FILTERS.map(filter => (
							<Button
								key={filter.value}
								type="button"
								size="sm"
								variant={queueFilter === filter.value ? "default" : "outline"}
								onClick={() => setQueueFilter(filter.value)}
							>
								{filter.label}
							</Button>
						))}
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid grid-cols-3 gap-2">
						<div className="rounded-md border p-2">
							<p className="text-muted-foreground text-xs">Pending</p>
							<p className="text-lg font-semibold">{pendingCount}</p>
						</div>
						<div className="rounded-md border p-2">
							<p className="text-muted-foreground text-xs">Arrived</p>
							<p className="text-lg font-semibold">{arrivedCount}</p>
						</div>
						<div className="rounded-md border p-2">
							<p className="text-muted-foreground text-xs">ETA &lt;15</p>
							<p className="text-lg font-semibold">{arrivingSoonCount}</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline" className="w-fit">
							{queue.length} shown
						</Badge>
						{urgentCount > 0 ? (
							<Badge variant="outline" className="w-fit">
								{urgentCount} urgent
							</Badge>
						) : null}
						{videoCount > 0 ? (
							<Badge variant="outline" className="w-fit">
								{videoCount} video
							</Badge>
						) : null}
						<span className="text-muted-foreground text-xs">
							Updated {new Date(now).toLocaleTimeString()}
						</span>
					</div>
					{isLoading ? (
						<p className="text-muted-foreground text-sm">Loading...</p>
					) : queue.length === 0 ? (
						<p className="text-muted-foreground text-sm">No inbound OPD patients queued.</p>
					) : (
						queue.map(patient => (
							<div key={patient.id} className="space-y-2 rounded-md border p-3">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											{patient.channelType === "video" ? (
												<Video className="size-3.5 shrink-0 text-blue-500" />
											) : (
												<PhoneCall className="size-3.5 shrink-0 text-green-500" />
											)}
											<p className="truncate text-sm font-semibold">{patient.callerName}</p>
										</div>
										<p className="text-muted-foreground text-xs">{patient.patientLocation}</p>
									</div>
									<Badge variant="outline" className={acuityBadgeClass(patient.provisionalAcuity)}>
										{patient.provisionalAcuity}
									</Badge>
									<Badge variant="outline" className={statusBadgeClass(patient.status)}>
										{statusLabel(patient.status)}
									</Badge>
								</div>
								<div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
									<span>{patient.callerRelationship ?? "caller"}</span>
									{patient.etaAt ? (
										<>
											<span>ETA</span>
											<EtaCountdown etaAt={patient.etaAt} />
										</>
									) : null}
									{patient.scheduledArrivalTime ? (
										<span>Scheduled {new Date(patient.scheduledArrivalTime).toLocaleString()}</span>
									) : null}
									{patient.arrivedAt ? (
										<span>Arrived {formatDateTime(patient.arrivedAt)}</span>
									) : null}
									{patient.livekitSessionStartedAt ? (
										<span>Video started {formatDateTime(patient.livekitSessionStartedAt)}</span>
									) : null}
								</div>
								<p className="text-sm">{patient.chiefComplaint}</p>
								{patient.assessmentNotes ? (
									<p className="text-muted-foreground line-clamp-2 text-xs">
										{patient.assessmentNotes}
									</p>
								) : null}
								{patient.linkedTriageIntakeId ? (
									<p className="text-muted-foreground text-xs">
										Linked OPD triage intake: {patient.linkedTriageIntakeId}
									</p>
								) : null}
								{canEdit && patient.status === "pending_arrival" && (
									<div className="flex flex-wrap gap-2">
										<Button
											size="sm"
											disabled={markArrived.isPending}
											onClick={() => handleArrived(patient.id)}
										>
											<UserCheck className="size-4" />
											Arrived
										</Button>
										{patient.channelType === "video" && (
											<Button
												size="sm"
												variant="outline"
												disabled={joinLiveKit.isPending}
												onClick={() => handleJoinVideo(patient.id, patient.callerName)}
											>
												<Video className="size-4" />
												Join Video
											</Button>
										)}
										<Button
											size="sm"
											variant="outline"
											disabled={cancelRemote.isPending}
											onClick={() => handleCancel(patient.id, "no_show")}
										>
											<XCircle className="size-4" />
											No-show
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={cancelRemote.isPending}
											onClick={() => handleCancel(patient.id, "cancelled")}
										>
											Cancel
										</Button>
									</div>
								)}
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	)
}
