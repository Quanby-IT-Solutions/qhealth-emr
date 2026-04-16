"use client"

import Link from "next/link"
import { Calendar, LayoutTemplate, Users } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { CheckInList } from "@/features/scheduling/components/check-in-list"

export default function SchedulingPage() {
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
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Patient Check-In</h1>
					<p className="text-muted-foreground">
						Manage today's appointments and patient check-ins
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" nativeButton={false} render={<Link href="/scheduling/templates" />}>
						<LayoutTemplate className="mr-2 size-4" />
						Clinic Templates
					</Button>
					<Button variant="outline" nativeButton={false} render={<Link href="/scheduling/book" />}>
						<Calendar className="mr-2 size-4" />
						Book Appointment
					</Button>
					<Button variant="outline" nativeButton={false} render={<Link href="/scheduling/queue" />}>
						<Users className="mr-2 size-4" />
						Clinic Queue
					</Button>
				</div>
			</div>
			<CheckInList facilityId={facilityId} />
		</div>
	)
}
