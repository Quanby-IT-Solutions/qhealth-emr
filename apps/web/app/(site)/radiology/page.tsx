"use client"

import { ScanSearch } from "lucide-react"

import { Card, CardContent } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function RadiologyPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "radiology", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access radiology services.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Radiology</h1>
				<p className="text-muted-foreground text-sm">
					Imaging order queue, RIS/PACS integration, and radiology report management
				</p>
			</div>
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-20 text-center">
					<ScanSearch className="text-muted-foreground mb-4 size-12" />
					<p className="font-medium">Radiology Information System</p>
					<p className="text-muted-foreground mt-1 max-w-sm text-sm">
						Imaging order worklist, PACS viewer integration, and structured radiology reporting will be available here.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
