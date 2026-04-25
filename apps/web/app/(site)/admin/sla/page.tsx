"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { SlaComplianceReport } from "@/features/sla/components/sla-compliance-report"
import { SlaConfig } from "@/features/sla/components/sla-config"
import { SlaDashboard } from "@/features/sla/components/sla-dashboard"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function AdminSlaPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "admin", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access SLA configuration.
			</div>
		)
	}

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-bold">SLA Management</h1>
				<p className="text-sm text-muted-foreground">
					Configure service-level targets, monitor active work items, and review compliance reports.
				</p>
			</div>
			<Tabs defaultValue="configuration">
				<TabsList>
					<TabsTrigger value="configuration">Configuration</TabsTrigger>
					<TabsTrigger value="monitoring">Active Monitoring</TabsTrigger>
					<TabsTrigger value="compliance">Compliance Report</TabsTrigger>
				</TabsList>
				<TabsContent value="configuration" className="mt-4">
					<SlaConfig />
				</TabsContent>
				<TabsContent value="monitoring" className="mt-4">
					<SlaDashboard />
				</TabsContent>
				<TabsContent value="compliance" className="mt-4">
					<SlaComplianceReport />
				</TabsContent>
			</Tabs>
		</div>
	)
}
