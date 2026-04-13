"use client"

import { PermissionMatrix } from "@/features/admin/components/permission-matrix"

export default function AdminRolesPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Role & Permission Configuration</h1>
				<p className="text-muted-foreground text-sm">
					Configure permission matrices for each role in your facility
				</p>
			</div>
			<PermissionMatrix />
		</div>
	)
}
