"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { BLOOD_BANK_ROLES, canAccessRoleGatedModule } from "@/features/app-shell/lib/navigation"
import { BedsideMatching } from "@/features/lab/components/bedside-matching"
import { CrossMatchForm } from "@/features/lab/components/cross-match-form"

function useAccessContext() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return {
		permSet: new Set(
			permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
		),
		role: profile?.activeRole,
	}
}

export default function BloodBankPage() {
	const { permSet, role } = useAccessContext()

	if (!canAccessRoleGatedModule(role, BLOOD_BANK_ROLES, permSet, "laboratory", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access blood bank records.
			</div>
		)
	}

	return (
		<Tabs defaultValue="cross-match">
			<TabsList className="mb-6 w-full justify-start overflow-x-auto">
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
	)
}
