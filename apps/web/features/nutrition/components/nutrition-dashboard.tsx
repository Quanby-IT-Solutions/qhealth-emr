"use client"

import { ClipboardList, TrendingUp, Utensils } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

export function NutritionDashboard() {
	const { data: profile, isLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Nutrition</h1>
					<p className="text-sm text-muted-foreground">Loading…</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Nutrition &amp; Dietetics</h1>
				<p className="text-sm text-muted-foreground">
					Malnutrition screening, meal planning, and diet order management
					{facilityId && " · " + facilityId}
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Screening</CardTitle>
						<ClipboardList className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<p className="text-xs text-muted-foreground">
							NRS-2002, MUST, and SGA malnutrition screening available within each
							patient encounter.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Meal Planning</CardTitle>
						<Utensils className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<p className="text-xs text-muted-foreground">
							Set caloric targets, macronutrient goals, and dietary restrictions per
							encounter.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Diet Orders</CardTitle>
						<TrendingUp className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<p className="text-xs text-muted-foreground">
							Active diet orders are accessible from each patient&apos;s encounter chart
							under the Nutrition tab.
						</p>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardContent className="flex flex-col items-center justify-center py-16 text-center">
					<Utensils className="mb-4 size-12 text-muted-foreground" />
					<p className="font-medium">Access Nutrition Features via Patient Encounters</p>
					<p className="mt-1 max-w-sm text-sm text-muted-foreground">
						Nutrition assessments, meal plans, and diet orders are managed within
						individual patient encounters. Open a patient chart and navigate to the{" "}
						<span className="font-medium">Nutrition</span> tab to begin.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
