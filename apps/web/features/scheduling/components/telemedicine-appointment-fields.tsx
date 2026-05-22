"use client"

import { Clock, UserRound, Video } from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { useStaffClinicianListQuery } from "@/features/scheduling/api/scheduling.hooks"

export type TelemedicinePlatformChoice = "livekit" | "zoom" | "teams"

interface TelemedicineAppointmentFieldsProps {
	facilityId: string
	clinicianId: string
	onClinicianChange: (clinicianId: string) => void
	platform: TelemedicinePlatformChoice
	onPlatformChange: (platform: TelemedicinePlatformChoice) => void
	durationMinutes: number
	onDurationChange: (durationMinutes: number) => void
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const

export function TelemedicineAppointmentFields({
	facilityId,
	clinicianId,
	onClinicianChange,
	platform,
	onPlatformChange,
	durationMinutes,
	onDurationChange,
}: TelemedicineAppointmentFieldsProps) {
	const cliniciansQuery = useStaffClinicianListQuery({ facilityId })
	const clinicians = cliniciansQuery.data ?? []
	const selectedClinician = clinicians.find(clinician => clinician.id === clinicianId)

	return (
		<div className="space-y-4 rounded-md border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/30">
			<div className="flex items-center gap-2">
				<Video className="size-5 text-sky-700 dark:text-sky-300" />
				<h3 className="text-sm font-semibold text-sky-950 dark:text-sky-100">
					Telemedicine details
				</h3>
			</div>

			<Alert>
				<UserRound className="size-4" />
				<AlertDescription>
					Assign the physician who will conduct the virtual consultation.
				</AlertDescription>
			</Alert>

			<div className="space-y-1.5">
				<Label>Physician</Label>
				<Select
					value={clinicianId}
					onValueChange={value => {
						if (value) onClinicianChange(value)
					}}
					disabled={cliniciansQuery.isLoading}
				>
					<SelectTrigger className="w-full min-w-0">
						<SelectValue className="min-w-0 truncate">
							{selectedClinician
								? `${selectedClinician.name}${selectedClinician.department ? ` — ${selectedClinician.department}` : ""}`
								: cliniciansQuery.isLoading
									? "Loading physicians"
									: "Select physician"}
						</SelectValue>
					</SelectTrigger>
					<SelectContent className="max-w-[calc(100vw-2rem)] min-w-72 sm:min-w-96">
						{clinicians.map(clinician => (
							<SelectItem key={clinician.id} value={clinician.id}>
								<div className="flex flex-col">
									<span className="font-medium">{clinician.name}</span>
									{clinician.department && (
										<span className="text-muted-foreground text-xs">{clinician.department}</span>
									)}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className="text-muted-foreground text-xs">
					Required for scheduler-created telemedicine appointments.
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label>Video Platform</Label>
					<Select
						value={platform}
						onValueChange={value => {
							if (value) onPlatformChange(value as TelemedicinePlatformChoice)
						}}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="livekit">
								<span className="inline-flex items-center gap-2">
									<Video className="size-4" />
									LiveKit
								</span>
							</SelectItem>
							<SelectItem value="zoom" disabled>
								<span className="inline-flex items-center gap-2">
									<Video className="size-4" />
									Zoom
								</span>
							</SelectItem>
							<SelectItem value="teams" disabled>
								<span className="inline-flex items-center gap-2">
									<Video className="size-4" />
									Microsoft Teams
								</span>
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label>Duration</Label>
					<Select
						value={String(durationMinutes)}
						onValueChange={value => {
							if (value) onDurationChange(Number(value))
						}}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{DURATION_OPTIONS.map(minutes => (
								<SelectItem key={minutes} value={String(minutes)}>
									<span className="inline-flex items-center gap-2">
										<Clock className="size-4" />
										{minutes < 60
											? `${minutes} minutes`
											: `${minutes / 60} hour${minutes === 60 ? "" : "s"}`}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	)
}
