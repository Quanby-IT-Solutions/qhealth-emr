"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { AppointmentBooking } from "@/features/scheduling/components/appointment-booking"

export default function AppointmentBookingPage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	if (!facilityId) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				No facility context available.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Book Appointment</h1>
				<p className="text-muted-foreground">
					Search availability and book patient appointments
				</p>
			</div>
			<AppointmentBooking facilityId={facilityId} />
		</div>
	)
}
