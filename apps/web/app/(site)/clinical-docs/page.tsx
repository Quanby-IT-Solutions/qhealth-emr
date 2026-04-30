"use client"

import { FileText } from "lucide-react"

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

export default function ClinicalDocsPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "clinical_docs", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access clinical documents.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Clinical Documents</h1>
				<p className="text-muted-foreground text-sm">
					Access and review clinical documentation for billing purposes
				</p>
			</div>
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-20 text-center">
					<FileText className="text-muted-foreground mb-4 size-12" />
					<p className="font-medium">Clinical Documentation Access</p>
					<p className="text-muted-foreground mt-1 max-w-sm text-sm">
						Review CF4 data extraction, physician notes, and clinical summaries
						for billing and revenue cycle management purposes.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
