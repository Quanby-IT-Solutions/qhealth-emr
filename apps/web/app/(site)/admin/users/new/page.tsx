"use client"

import { CreateUserForm } from "@/features/admin/components/create-user-form"

export default function NewUserPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Create New User</h1>
				<p className="text-muted-foreground text-sm">
					Add a new staff member with facility memberships and role assignments
				</p>
			</div>
			<CreateUserForm />
		</div>
	)
}
