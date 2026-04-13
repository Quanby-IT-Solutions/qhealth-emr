"use client"

import { UsersTable } from "@/features/admin/components/users-table"

export default function AdminUsersPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">User Management</h1>
				<p className="text-muted-foreground text-sm">
					Create, search, and manage staff accounts and profiles
				</p>
			</div>
			<UsersTable />
		</div>
	)
}
