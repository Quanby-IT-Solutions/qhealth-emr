"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useGetStaffUserQuery,
	useGetLicenseStatusQuery,
	useResetPasswordMutation,
	useUpdateStaffMutation,
} from "@/features/admin/api/admin.hooks"

interface UserDetailProps {
	userId: string
}

function licenseStatusBadge(status: string) {
	switch (status) {
		case "valid":
			return <Badge variant="outline" className="border-green-600 text-green-600">Valid</Badge>
		case "expiring_soon":
			return <Badge variant="outline" className="border-yellow-600 text-yellow-600">Expiring Soon</Badge>
		case "expired":
			return <Badge variant="destructive">Expired</Badge>
		default:
			return <Badge variant="secondary">Not Set</Badge>
	}
}

export function UserDetail({ userId }: UserDetailProps) {
	const { data: profile } = useMyProfile()
	const { data: staffUser, isLoading } = useGetStaffUserQuery(userId)
	const resetPasswordMutation = useResetPasswordMutation()
	const updateStaffMutation = useUpdateStaffMutation()

	const activeProfile = staffUser?.staffProfiles[0]
	const { data: licenseStatus } = useGetLicenseStatusQuery(activeProfile?.id ?? "")

	const [editDepartment, setEditDepartment] = useState("")
	const [editEmployeeNumber, setEditEmployeeNumber] = useState("")

	if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>
	if (!staffUser) return <p className="text-muted-foreground text-sm">User not found.</p>

	const handleSaveProfile = () => {
		if (!activeProfile) return
		updateStaffMutation.mutate({
			id: activeProfile.id,
			department: editDepartment || undefined,
			employeeNumber: editEmployeeNumber || undefined,
		})
	}

	return (
		<div className="space-y-6">
			{/* User Info */}
			<Card>
				<CardHeader>
					<CardTitle>User Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<div>
						<p className="text-muted-foreground text-sm">Name</p>
						<p className="font-medium">{staffUser.user.name}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-sm">Email</p>
						<p>{staffUser.user.email}</p>
					</div>
					{activeProfile && (
						<>
							<div>
								<p className="text-muted-foreground text-sm">Department</p>
								<p>{activeProfile.department ?? "—"}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-sm">Employee Number</p>
								<p>{activeProfile.employeeNumber ?? "—"}</p>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Edit Profile */}
			{activeProfile && (
				<Card>
					<CardHeader>
						<CardTitle>Edit Profile</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-1">
							<Label htmlFor="department">Department</Label>
							<Input
								id="department"
								defaultValue={activeProfile.department ?? ""}
								onChange={e => setEditDepartment(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="employeeNumber">Employee Number</Label>
							<Input
								id="employeeNumber"
								defaultValue={activeProfile.employeeNumber ?? ""}
								onChange={e => setEditEmployeeNumber(e.target.value)}
							/>
						</div>
						<Button
							onClick={handleSaveProfile}
							disabled={updateStaffMutation.isPending}
						>
							Save
						</Button>
					</CardContent>
				</Card>
			)}

			{/* License Management */}
			{licenseStatus && (
				<Card>
					<CardHeader>
						<CardTitle>License Status</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm">PRC License</span>
							{licenseStatusBadge(licenseStatus.prc.status)}
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm">PTR</span>
							{licenseStatusBadge(licenseStatus.ptr.status)}
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm">PDEA S2 License</span>
							{licenseStatusBadge(licenseStatus.pdeaS2.status)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Password Reset */}
			<Card>
				<CardHeader>
					<CardTitle>Password Reset</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground mb-3 text-sm">
						Send a password reset email to {staffUser.user.email}.
					</p>
					<Button
						variant="outline"
						onClick={() => resetPasswordMutation.mutate({ userId })}
						disabled={resetPasswordMutation.isPending}
					>
						{resetPasswordMutation.isSuccess ? "Email sent" : "Send reset email"}
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
