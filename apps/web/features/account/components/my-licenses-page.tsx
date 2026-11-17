"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { StatusBadge } from "@/core/components/status-badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Skeleton } from "@/core/components/ui/skeleton"
import type { StatusVariant } from "@/core/styles/status-tokens"
import { AddLicenseDialog } from "@/features/admin/clinician-licenses/components/add-license-dialog"
import { DeleteLicenseAlert } from "@/features/admin/clinician-licenses/components/delete-license-alert"
import { EditLicenseDialog } from "@/features/admin/clinician-licenses/components/edit-license-dialog"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { isCoordinatorRole } from "@/features/app-shell/lib/navigation"

import {
	useDeleteMyLicenseMutation,
	useMyLicensesQuery,
	useVerifyMyLicenseMutation,
} from "../api/my-licenses.hooks"

function getBadgeVariant(status: string | null | undefined): StatusVariant {
	if (status === "verified") return "verified"
	if (status === "expired") return "expired"
	if (status === "pending") return "pending"
	return "inactive"
}

function formatCredential(value: string | null | undefined, expiry: string | null | undefined) {
	if (!value) return "Not on file"
	if (expiry) return `${value} (expires ${expiry})`
	return value
}

export function MyLicensesPage() {
	const { data: profile, isLoading: isProfileLoading, isError: isProfileError } = useMyProfile()
	const isClinicCoordinator = isCoordinatorRole(profile?.activeRole)
	const {
		data,
		isLoading: isLicensesLoading,
		isError,
	} = useMyLicensesQuery(Boolean(profile?.staffProfiles.length) && isClinicCoordinator)
	const verifyMutation = useVerifyMyLicenseMutation()
	const deleteMutation = useDeleteMyLicenseMutation()
	const [proofInputs, setProofInputs] = useState<Record<string, string>>({})
	const [addOpen, setAddOpen] = useState(false)
	const [editingLicense, setEditingLicense] = useState<{
		id: string
		licenseType: string
		licenseNumber: string
		issueDate: string | null
		expiryDate: string | null
	} | null>(null)
	const [deletingLicense, setDeletingLicense] = useState<{
		id: string
		licenseType: string
		licenseNumber: string
	} | null>(null)

	const activeStaffProfile =
		profile?.staffProfiles.find(staffProfile =>
			staffProfile.roles.some(role => role.id === profile.activeRole?.id)
		) ?? profile?.staffProfiles[0]

	if (isProfileLoading || (isClinicCoordinator && isLicensesLoading)) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-40 w-full" />
			</div>
		)
	}

	if (isProfileError || !profile) {
		return <p className="text-destructive text-sm">Failed to load your account profile.</p>
	}

	if (!isClinicCoordinator) {
		return (
			<p className="text-muted-foreground text-sm">
				License management is available only for the Clinic Coordinator role.
			</p>
		)
	}

	if (!activeStaffProfile) {
		return (
			<p className="text-muted-foreground text-sm">
				No staff profile is linked to your account. Contact your administrator if you need to manage
				clinical licenses.
			</p>
		)
	}

	if (isError || !data) {
		return <p className="text-destructive text-sm">Failed to load your license records.</p>
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-xl font-semibold sm:text-2xl">My Licenses</h1>
				<p className="text-muted-foreground text-sm">
					Manage your PRC, PTR, and PDEA S-2 credentials for prescriptions, orders, and clinical
					signing.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Active Credentials</CardTitle>
					<CardDescription>
						These values are used on prescriptions and clinical documents after a license is
						verified.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 text-sm sm:grid-cols-3">
					<div>
						<p className="text-muted-foreground">PRC</p>
						<p className="font-medium">
							{formatCredential(activeStaffProfile.prcLicenseNumber, activeStaffProfile.prcExpiry)}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground">PTR</p>
						<p className="font-medium">
							{formatCredential(activeStaffProfile.ptrNumber, activeStaffProfile.ptrExpiry)}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground">PDEA S-2</p>
						<p className="font-medium">
							{formatCredential(activeStaffProfile.pdeaS2License, activeStaffProfile.pdeaS2Expiry)}
						</p>
					</div>
				</CardContent>
			</Card>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<h2 className="text-lg font-semibold">License Records</h2>
					{data.daysUntilNextExpiry !== null ? (
						<p
							className={`text-sm ${data.daysUntilNextExpiry <= 30 ? "font-medium text-amber-600" : "text-muted-foreground"}`}
						>
							Next expiry in {data.daysUntilNextExpiry} days
						</p>
					) : (
						<p className="text-muted-foreground text-sm">
							Add or update your license records, then verify them to apply changes.
						</p>
					)}
				</div>
				<Button className="w-full sm:w-auto" onClick={() => setAddOpen(true)}>
					Add License
				</Button>
			</div>

			{data.licenses.length === 0 ? (
				<p className="text-muted-foreground py-8 text-center text-sm">
					No license records yet. Add your PRC, PTR, or S-2 details to get started.
				</p>
			) : (
				<div className="grid gap-4 lg:grid-cols-2">
					{data.licenses.map(license => (
						<Card key={license.id}>
							<CardHeader className="pb-2">
								<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
									<CardTitle className="text-base">{license.licenseType}</CardTitle>
									<StatusBadge variant={getBadgeVariant(license.status)} />
								</div>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
									<Button size="sm" variant="outline" onClick={() => setEditingLicense(license)}>
										Edit
									</Button>
									<Button
										size="sm"
										variant="destructive"
										className="justify-center"
										onClick={() => setDeletingLicense(license)}
									>
										<Trash2 className="size-3.5" />
										Delete
									</Button>
								</div>
								<div className="space-y-1 text-sm">
									<p>
										<span className="text-muted-foreground">Number:</span> {license.licenseNumber}
									</p>
									{license.issueDate ? (
										<p>
											<span className="text-muted-foreground">Issued:</span> {license.issueDate}
										</p>
									) : null}
									{license.expiryDate ? (
										<p>
											<span className="text-muted-foreground">Expires:</span> {license.expiryDate}
										</p>
									) : null}
									{license.verifiedAt ? (
										<p>
											<span className="text-muted-foreground">Verified at:</span>{" "}
											{new Date(license.verifiedAt).toLocaleDateString()}
										</p>
									) : null}
								</div>

								{license.status !== "verified" ? (
									<div className="space-y-2 pt-1">
										<Label htmlFor={`proof-${license.id}`} className="text-xs">
											Verification note (optional)
										</Label>
										<Input
											id={`proof-${license.id}`}
											placeholder="Registry reference or note"
											value={proofInputs[license.id] ?? ""}
											onChange={event =>
												setProofInputs(previous => ({
													...previous,
													[license.id]: event.target.value,
												}))
											}
										/>
										<Button
											size="sm"
											className="w-full sm:w-auto"
											onClick={() =>
												verifyMutation.mutate(
													{
														id: license.id,
														verificationProof: proofInputs[license.id] || undefined,
													},
													{
														onSuccess: () => toast.success("License verified."),
														onError: () => toast.error("Failed to verify license."),
													}
												)
											}
											disabled={verifyMutation.isPending}
										>
											Verify
										</Button>
									</div>
								) : null}
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<AddLicenseDialog open={addOpen} onOpenChange={setAddOpen} mode="self" />
			<EditLicenseDialog
				open={editingLicense !== null}
				onOpenChange={open => {
					if (!open) setEditingLicense(null)
				}}
				license={editingLicense}
				mode="self"
			/>
			<DeleteLicenseAlert
				open={deletingLicense !== null}
				onOpenChange={open => {
					if (!open) setDeletingLicense(null)
				}}
				license={deletingLicense}
				isPending={deleteMutation.isPending}
				onConfirm={() => {
					if (!deletingLicense) return
					deleteMutation.mutate(
						{ id: deletingLicense.id },
						{
							onSuccess: () => {
								toast.success("License deleted.")
								setDeletingLicense(null)
							},
							onError: () => toast.error("Failed to delete license."),
						}
					)
				}}
			/>
		</div>
	)
}
