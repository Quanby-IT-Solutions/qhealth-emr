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
	useReEnableUserMutation,
	useAddUserRoleMutation,
	useRemoveUserRoleMutation,
	useRemoveStaffFacilityMutation,
	useListRolesQuery,
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
	const activeFacilityId = profile?.staffProfiles[0]?.facilityId ?? ""
	const { data: staffUser, isLoading } = useGetStaffUserQuery(userId)
	const resetPasswordMutation = useResetPasswordMutation()
	const updateStaffMutation = useUpdateStaffMutation()
	const reEnableUserMutation = useReEnableUserMutation()
	const addUserRoleMutation = useAddUserRoleMutation()
	const removeUserRoleMutation = useRemoveUserRoleMutation()
	const removeStaffFacilityMutation = useRemoveStaffFacilityMutation()

	const { data: rolesData } = useListRolesQuery(activeFacilityId)

	const activeProfile = staffUser?.staffProfiles.find(p => p.isActive) ?? staffUser?.staffProfiles[0]
	const { data: licenseStatus } = useGetLicenseStatusQuery(activeProfile?.id ?? "")

	const [editDepartment, setEditDepartment] = useState("")
	const [editEmployeeNumber, setEditEmployeeNumber] = useState("")
	const [resetEmailSent, setResetEmailSent] = useState(false)
	const [resetCooldown, setResetCooldown] = useState(false)

	if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>
	if (!staffUser) return <p className="text-muted-foreground text-sm">User not found.</p>

	const hasInactiveProfiles = staffUser.staffProfiles.some(p => !p.isActive)

	const handleSaveProfile = () => {
		if (!activeProfile) return
		updateStaffMutation.mutate({
			id: activeProfile.id,
			department: editDepartment || undefined,
			employeeNumber: editEmployeeNumber || undefined,
		})
	}

	const handleReEnableProfile = (staffProfileId: string) => {
		reEnableUserMutation.mutate({ staffProfileId })
	}

	const handleResetPassword = async () => {
		await resetPasswordMutation.mutateAsync({ userId })
		setResetEmailSent(true)
		setResetCooldown(true)
		setTimeout(() => setResetCooldown(false), 60000)
	}

	const handleRemoveRole = (staffProfileId: string, roleId: string) => {
		removeUserRoleMutation.mutate({ staffProfileId, roleId })
	}

	const handleAddRole = (staffProfileId: string, roleId: string) => {
		addUserRoleMutation.mutate({ staffProfileId, roleId })
	}

	const handleRemoveFacility = (staffProfileId: string) => {
		if (!confirm("Remove this facility membership? The user must retain at least one active membership.")) return
		removeStaffFacilityMutation.mutate({ staffProfileId })
	}

	return (
		<div className="space-y-6">
			{/* Re-enable banner for deactivated profiles */}
			{hasInactiveProfiles &&
				staffUser.staffProfiles
					.filter(p => !p.isActive)
					.map(p => (
						<div
							key={p.id}
							className="flex items-center justify-between rounded-md border border-yellow-400/40 bg-yellow-50 px-4 py-3 dark:bg-yellow-900/20"
						>
							<p className="text-sm text-yellow-800 dark:text-yellow-200">
								Account deactivated — staff profile for facility{" "}
								<span className="font-medium">{p.facilityId}</span> is inactive.
							</p>
							<Button
								size="sm"
								variant="outline"
								onClick={() => handleReEnableProfile(p.id)}
								disabled={reEnableUserMutation.isPending}
							>
								Re-enable account
							</Button>
						</div>
					))}

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

			{/* Facility Membership */}
			<Card>
				<CardHeader>
					<CardTitle>Facility Memberships</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{staffUser.staffProfiles.map(p => (
						<div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
							<div className="space-y-0.5">
								<p className="text-sm font-medium">
									{p.facilityId}
									{!p.isActive && (
										<Badge variant="secondary" className="ml-2 text-xs">
											Inactive
										</Badge>
									)}
								</p>
								<div className="flex flex-wrap gap-1">
									{p.roles.map(r => (
										<Badge key={r.id} variant="outline" className="text-xs">
											{r.name}
											{r.isPrimary && " (primary)"}
										</Badge>
									))}
								</div>
							</div>
							<Button
								size="sm"
								variant="ghost"
								className="text-destructive hover:text-destructive"
								onClick={() => handleRemoveFacility(p.id)}
								disabled={removeStaffFacilityMutation.isPending}
							>
								Remove
							</Button>
						</div>
					))}
				</CardContent>
			</Card>

			{/* Roles */}
			{activeProfile && (
				<Card>
					<CardHeader>
						<CardTitle>Role Assignments</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex flex-wrap gap-2">
							{activeProfile.roles.map(r => (
								<div key={r.id} className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
									{r.name}
									{r.isPrimary && <span className="text-muted-foreground text-xs">(primary)</span>}
									<button
										type="button"
										className="ml-1 text-muted-foreground hover:text-destructive"
										onClick={() => handleRemoveRole(activeProfile.id, r.id)}
										disabled={removeUserRoleMutation.isPending}
									>
										×
									</button>
								</div>
							))}
						</div>
						<div>
							<p className="text-muted-foreground text-xs mb-1">Add role</p>
							<div className="flex flex-wrap gap-2">
								{rolesData
									?.filter(r => !activeProfile.roles.some(ar => ar.id === r.id))
									.map(role => (
										<button
											key={role.id}
											type="button"
											className="rounded-full border border-dashed px-3 py-1 text-xs hover:bg-muted"
											onClick={() => handleAddRole(activeProfile.id, role.id)}
											disabled={addUserRoleMutation.isPending}
										>
											+ {role.name}
										</button>
									))}
							</div>
						</div>
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
					{resetEmailSent && (
						<p className="text-green-600 text-sm mb-2">
							Reset email sent. {resetCooldown && "You can resend in 60 seconds."}
						</p>
					)}
					<Button
						variant="outline"
						onClick={handleResetPassword}
						disabled={resetPasswordMutation.isPending || resetCooldown}
					>
						{resetCooldown ? "Resend in 60s" : resetEmailSent ? "Resend Reset Email" : "Send Reset Email"}
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
