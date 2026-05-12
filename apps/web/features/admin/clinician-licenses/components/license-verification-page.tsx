"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Skeleton } from "@/core/components/ui/skeleton"
import { StatusBadge } from "@/core/components/status-badge"
import type { StatusVariant } from "@/core/styles/status-tokens"

import { useGetClinicianLicensesQuery, useMarkPendingMutation, useVerifyLicenseMutation } from "../api/licenses.hooks"
import { AddLicenseDrawer } from "./add-license-drawer"

function getBadgeVariant(status: string | null | undefined): StatusVariant {
	if (status === "verified") return "verified"
	if (status === "expired") return "expired"
	if (status === "pending") return "pending"
	return "inactive"
}

interface LicenseVerificationPageProps {
	staffProfileId: string
}

export function LicenseVerificationPage({ staffProfileId }: LicenseVerificationPageProps) {
	const { data, isLoading, isError } = useGetClinicianLicensesQuery(staffProfileId)
	const verifyMutation = useVerifyLicenseMutation()
	const markPendingMutation = useMarkPendingMutation()
	const [proofInputs, setProofInputs] = useState<Record<string, string>>({})
	const [addOpen, setAddOpen] = useState(false)

	if (isLoading) return <Skeleton className="h-64 w-full" />
	if (isError || !data) return <p className="text-sm text-destructive">Failed to load license data.</p>

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h2 className="text-xl font-semibold">{data.staffName}</h2>
					<p className="text-sm text-muted-foreground">Staff Profile ID: {staffProfileId}</p>
					{data.daysUntilNextExpiry !== null && (
						<p className={`text-sm ${data.daysUntilNextExpiry <= 30 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
							Next expiry in {data.daysUntilNextExpiry} days
						</p>
					)}
				</div>
				<Button onClick={() => setAddOpen(true)}>Add License</Button>
			</div>

			{data.licenses.length === 0 && (
				<p className="text-sm text-muted-foreground py-8 text-center">No licenses on record.</p>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				{data.licenses.map(license => (
					<Card key={license.id}>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-base">{license.licenseType}</CardTitle>
								<StatusBadge variant={getBadgeVariant(license.status)} />
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="text-sm space-y-1">
								<p><span className="text-muted-foreground">Number:</span> {license.licenseNumber}</p>
								{license.issueDate && <p><span className="text-muted-foreground">Issued:</span> {license.issueDate}</p>}
								{license.expiryDate && <p><span className="text-muted-foreground">Expires:</span> {license.expiryDate}</p>}
								{license.verifiedAt && (
									<p><span className="text-muted-foreground">Verified at:</span> {new Date(license.verifiedAt).toLocaleDateString()}</p>
								)}
							</div>

							{license.documentUri && (
								<div className="border rounded overflow-hidden h-48">
									<object
										data={license.documentUri}
										type="application/pdf"
										className="w-full h-full"
									>
										<a href={license.documentUri} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
											View document
										</a>
									</object>
								</div>
							)}

							{license.status !== "verified" && (
								<div className="space-y-2 pt-1">
									<Label htmlFor={`proof-${license.id}`} className="text-xs">Verification Proof (optional)</Label>
									<Input
										id={`proof-${license.id}`}
										placeholder="Registry reference or note"
										value={proofInputs[license.id] ?? ""}
										onChange={e => setProofInputs(prev => ({ ...prev, [license.id]: e.target.value }))}
									/>
									<Button
										size="sm"
										onClick={() =>
											verifyMutation.mutate({
												id: license.id,
												verificationProof: proofInputs[license.id] || undefined,
											})
										}
										disabled={verifyMutation.isPending}
									>
										Verify
									</Button>
								</div>
							)}

							{license.status === "verified" && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => markPendingMutation.mutate({ id: license.id }, { onSuccess: () => toast("Marked as pending review."), onError: () => toast.error("Failed to update status.") })}
									disabled={markPendingMutation.isPending}
								>
									Mark Pending Review
								</Button>
							)}
						</CardContent>
					</Card>
				))}
			</div>

			<AddLicenseDrawer open={addOpen} onOpenChange={setAddOpen} staffProfileId={staffProfileId} />
		</div>
	)
}
