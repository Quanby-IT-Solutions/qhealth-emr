import type { Metadata } from "next"

import { FacilityProfilePanel } from "@/features/facility-profile/components/facility-profile-panel"

export const metadata: Metadata = {
	title: "Facility Profile | Admin",
	description: "Official identity used in reports, exports, and external submissions.",
}

export default function FacilityProfilePage() {
	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold">Facility Profile</h1>
				<p className="text-muted-foreground text-sm">
					Official identity used in reports, exports, and external submissions.
				</p>
			</div>
			<FacilityProfilePanel />
		</div>
	)
}
