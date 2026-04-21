"use client"

import { useEffect, useState } from "react"

import { Save, X } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	useFacilityProfileQuery,
	useUpdateFacilityProfileMutation,
} from "@/features/facility-profile/api/facility-profile.hooks"

interface DraftState {
	facilityCode: string
	governingAuthority: string
	addressLine1: string
	addressLine2: string
	city: string
	province: string
	zipCode: string
	telephone: string
	email: string
	adminContactName: string
	adminContactEmail: string
}

type FacilityProfileData = {
	facilityId: string
	facilityCode: string | null
	governingAuthority: string | null
	addressLine1: string | null
	addressLine2: string | null
	city: string | null
	province: string | null
	zipCode: string | null
	telephone: string | null
	email: string | null
	adminContactName: string | null
	adminContactEmail: string | null
	updatedAt: Date | null
}

function toDraft(p: FacilityProfileData): DraftState {
	return {
		facilityCode: p.facilityCode ?? "",
		governingAuthority: p.governingAuthority ?? "",
		addressLine1: p.addressLine1 ?? "",
		addressLine2: p.addressLine2 ?? "",
		city: p.city ?? "",
		province: p.province ?? "",
		zipCode: p.zipCode ?? "",
		telephone: p.telephone ?? "",
		email: p.email ?? "",
		adminContactName: p.adminContactName ?? "",
		adminContactEmail: p.adminContactEmail ?? "",
	}
}

export function FacilityProfilePanel() {
	const { data: profile, isLoading, error } = useFacilityProfileQuery()
	const updateMutation = useUpdateFacilityProfileMutation()

	const [draft, setDraft] = useState<DraftState | null>(null)
	const [isDirty, setIsDirty] = useState(false)

	// Sync draft from server data on first load
	useEffect(() => {
		if (profile && !isDirty) {
			setDraft(toDraft(profile))
		}
	}, [profile, isDirty])

	if (isLoading || !draft) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-48 w-full" />
				<Skeleton className="h-48 w-full" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="text-destructive text-sm">
				Failed to load facility profile. Please refresh the page.
			</div>
		)
	}

	const changedFields = profile
		? (Object.keys(draft) as Array<keyof DraftState>).filter(
				k => draft[k] !== (toDraft(profile as FacilityProfileData)[k])
			)
		: []
	const hasChanges = changedFields.length > 0

	function patch(field: keyof DraftState, value: string) {
		setDraft(prev => (prev ? { ...prev, [field]: value } : prev))
		setIsDirty(true)
	}

	function handleDiscard() {
		if (profile) {
			setDraft(toDraft(profile as FacilityProfileData))
			setIsDirty(false)
		}
	}

	async function handleSave() {
		if (!draft) return

		const payload: Record<string, string | null> = {}
		for (const field of changedFields) {
			payload[field] = draft[field] || null
		}

		await updateMutation.mutateAsync(payload as Parameters<typeof updateMutation.mutateAsync>[0])
		setIsDirty(false)
	}

	return (
		<div className="space-y-4">
			{/* Unsaved changes banner */}
			{hasChanges && (
				<div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-700 dark:bg-amber-950">
					<span className="text-amber-800 dark:text-amber-200">
						{changedFields.length} unsaved{" "}
						{changedFields.length === 1 ? "change" : "changes"}
					</span>
					<div className="flex gap-2">
						<Button variant="ghost" size="sm" onClick={handleDiscard}>
							<X className="mr-1.5 size-4" />
							Discard
						</Button>
						<Button
							size="sm"
							onClick={handleSave}
							disabled={updateMutation.isPending}
						>
							<Save className="mr-1.5 size-4" />
							{updateMutation.isPending ? "Saving…" : "Save changes"}
						</Button>
					</div>
				</div>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				{/* Left column */}
				<div className="space-y-4">
					{/* Identity */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">Identity</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="facilityCode">Facility code</Label>
								<Input
									id="facilityCode"
									value={draft.facilityCode}
									onChange={e => patch("facilityCode", e.target.value)}
									placeholder="e.g. QH-MAIN"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="governingAuthority">Governing authority</Label>
								<Input
									id="governingAuthority"
									value={draft.governingAuthority}
									onChange={e => patch("governingAuthority", e.target.value)}
									placeholder="e.g. DOH Region IV-A"
								/>
							</div>
						</CardContent>
					</Card>

					{/* Administrative contact */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">Administrative contact</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="adminContactName">Contact name</Label>
								<Input
									id="adminContactName"
									value={draft.adminContactName}
									onChange={e => patch("adminContactName", e.target.value)}
									placeholder="e.g. A. Cruz"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="adminContactEmail">Contact email</Label>
								<Input
									id="adminContactEmail"
									type="email"
									value={draft.adminContactEmail}
									onChange={e => patch("adminContactEmail", e.target.value)}
									placeholder="admin@facility.local"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="email">Facility email</Label>
								<Input
									id="email"
									type="email"
									value={draft.email}
									onChange={e => patch("email", e.target.value)}
									placeholder="info@facility.local"
								/>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right column */}
				<div className="space-y-4">
					{/* Address & contact */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">Address &amp; contact</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="addressLine1">Address line 1</Label>
								<Input
									id="addressLine1"
									value={draft.addressLine1}
									onChange={e => patch("addressLine1", e.target.value)}
									placeholder="Street address"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="addressLine2">Address line 2</Label>
								<Input
									id="addressLine2"
									value={draft.addressLine2}
									onChange={e => patch("addressLine2", e.target.value)}
									placeholder="Barangay, district (optional)"
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<Label htmlFor="city">City / Municipality</Label>
									<Input
										id="city"
										value={draft.city}
										onChange={e => patch("city", e.target.value)}
										placeholder="e.g. Makati"
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="province">Province</Label>
									<Input
										id="province"
										value={draft.province}
										onChange={e => patch("province", e.target.value)}
										placeholder="e.g. Metro Manila"
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="zipCode">ZIP code</Label>
								<Input
									id="zipCode"
									value={draft.zipCode}
									onChange={e => patch("zipCode", e.target.value)}
									placeholder="e.g. 1234"
									className="max-w-32"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="telephone">Telephone</Label>
								<Input
									id="telephone"
									value={draft.telephone}
									onChange={e => patch("telephone", e.target.value)}
									placeholder="+63 2 8123 0000"
								/>
							</div>
						</CardContent>
					</Card>

					{/* Recent changes */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">Recent changes</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{profile?.updatedAt ? (
								<p className="text-muted-foreground text-xs">
									Last updated{" "}
									{new Date(profile.updatedAt).toLocaleDateString("en-PH", {
										year: "numeric",
										month: "short",
										day: "numeric",
									})}
								</p>
							) : (
								<p className="text-muted-foreground text-xs">No changes recorded yet.</p>
							)}
							<a
								href="/admin/audit?entityType=facility_profile"
								className="text-primary text-xs hover:underline"
							>
								View full history →
							</a>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
