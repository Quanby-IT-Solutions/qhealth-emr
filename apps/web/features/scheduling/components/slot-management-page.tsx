"use client"

import { CalendarRange, Lock } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

export function SlotManagementPage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	if (!facilityId) {
		return (
			<div className="flex h-48 items-center justify-center text-muted-foreground">
				No facility context available.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Slot Management</h1>
				<p className="text-muted-foreground">
					Review generated clinic slots and apply temporary overrides for leave, holidays, and closures.
				</p>
			</div>

			<Card className="border-dashed">
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="rounded-lg bg-sky-100 p-2 text-sky-700">
							<CalendarRange className="size-5" aria-hidden />
						</div>
						<div>
							<CardTitle>Slot Management UI coming next</CardTitle>
							<CardDescription>
								This route is now wired and ready for SCH-FE-03.
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex items-start gap-3 text-sm text-muted-foreground">
					<Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
					<p>
						The next ticket will load template slots, filter by status/date range, and support block/unblock
						actions from this page.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
