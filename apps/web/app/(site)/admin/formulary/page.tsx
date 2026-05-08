"use client"

import Link from "next/link"

import { Button } from "@/core/components/ui/button"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { FormularyManager } from "@/features/formulary/components/formulary-manager"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function FormularyPage() {
	const facilityId = useActiveFacilityId()
	const permSet = usePermissionSet()

	if (!can(permSet, "admin", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access this page.
			</div>
		)
	}

	if (!can(permSet, "formulary", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access the formulary.
			</div>
		)
	}

	return (
		<div className="w-full max-w-7xl space-y-6 p-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Facility Formulary</h1>
					<p className="text-muted-foreground">
						Manage approved drugs for this facility. Add, remove, and update master-data records.
					</p>
				</div>
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link href="/admin/formulary/code-sets" />}
				>
					Code Sets
				</Button>
			</div>

			{facilityId ? (
				<FormularyManager
					facilityId={facilityId}
					canEdit={can(permSet, "formulary", "edit")}
					canDelete={can(permSet, "formulary", "edit")}
					canEditFlags={can(permSet, "formulary", "clinical_policy")}
				/>
			) : (
				<p className="text-muted-foreground">Loading facility context...</p>
			)}
		</div>
	)
}
