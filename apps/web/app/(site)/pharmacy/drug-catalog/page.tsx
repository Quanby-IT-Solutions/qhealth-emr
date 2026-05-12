"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { DrugCatalogManager } from "@/features/formulary/components/drug-catalog-manager"

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

export default function PharmacyDrugCatalogPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "formulary", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access the drug catalog.
			</div>
		)
	}

	return (
		<div className="w-full max-w-7xl space-y-6 p-4">
			<div>
				<h1 className="text-2xl font-bold">Drug Catalog</h1>
				<p className="text-muted-foreground">
					Manage the drug generic and brand master list used by the facility formulary.
				</p>
			</div>

			<DrugCatalogManager canManage={can(permSet, "formulary", "manage_catalog")} />
		</div>
	)
}
