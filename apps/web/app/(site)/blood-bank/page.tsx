"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { BedsideMatching } from "@/features/lab/components/bedside-matching"
import { CrossMatchForm } from "@/features/lab/components/cross-match-form"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function BloodBankPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "laboratory", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access blood bank records.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Blood Bank</h1>
				<p className="text-muted-foreground text-sm">
					Cross-matching, compatibility testing, and bedside verification
				</p>
			</div>
			<Tabs defaultValue="cross-match">
				<TabsList className="mb-6">
					<TabsTrigger value="cross-match">Cross-Match Requests</TabsTrigger>
					<TabsTrigger value="bedside">Bedside Verification</TabsTrigger>
				</TabsList>
				<TabsContent value="cross-match">
					<CrossMatchForm />
				</TabsContent>
				<TabsContent value="bedside">
					<BedsideMatching />
				</TabsContent>
			</Tabs>
		</div>
	)
}
