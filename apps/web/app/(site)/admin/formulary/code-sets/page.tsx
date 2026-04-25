"use client"

import { Suspense } from "react"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { CodeSetBrowser } from "@/features/formulary/components/code-set-browser"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function CodeSetsPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "formulary", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access clinical code sets.
			</div>
		)
	}

	return (
		<div className="w-full max-w-7xl space-y-6 p-4">
			<div>
				<h1 className="text-2xl font-bold">Clinical Code Sets</h1>
				<p className="text-muted-foreground">
					Search and browse ICD-10, SNOMED CT, LOINC, RxNorm, and RVS reference codes.
				</p>
			</div>

			<Suspense fallback={<p>Loading code sets...</p>}>
				<CodeSetBrowser />
			</Suspense>
		</div>
	)
}
