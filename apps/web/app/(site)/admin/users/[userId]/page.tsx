"use client"

import { UserDetail } from "@/features/admin/components/user-detail"

interface AdminUserDetailPageProps {
	params: Promise<{ userId: string }>
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
	const { userId } = await params
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">User Detail</h1>
				<p className="text-muted-foreground text-sm">
					View and manage this user's profile, licenses, and access
				</p>
			</div>
			<UserDetail userId={userId} />
		</div>
	)
}
