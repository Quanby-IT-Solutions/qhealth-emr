"use client"

import { useState } from "react"
import { format } from "date-fns"
import { DollarSign } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Switch } from "@/core/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { Button } from "@/core/components/ui/button"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { TableToolbar } from "@/features/admin/components/table-toolbar"
import { EmptyState, ErrorState, SkeletonRows } from "@/features/admin/components/state-views"
import { OecbTagIndicator } from "@/features/ed/components/oecb-tag-indicator"
import { useUnbilledEncountersQuery } from "@/features/billing/api/billing.hooks"

const BILLING_GRANULAR_READ_PERMS = [
	"billing.charges:read",
	"billing.invoices:read",
	"billing.payments:read",
	"billing.cf4:read",
	"billing.drg:read",
	"billing.cf5:read",
	"billing.esoa:read",
	"billing.cews:read",
	"billing.konsulta:read",
] as const

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function canAccessBilling(permSet: Set<string>) {
	if (permSet.has("billing:view")) return true
	return BILLING_GRANULAR_READ_PERMS.some(p => permSet.has(p))
}

const PAGE_SIZE = 25

export default function BillingPage() {
	const { data: profile } = useMyProfile()
	const permSet = usePermissionSet()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const [oecbOnly, setOecbOnly] = useState(false)
	const [page, setPage] = useState(1)

	const { data, isLoading, isError, error, refetch } = useUnbilledEncountersQuery({
		facilityId,
		page,
		limit: PAGE_SIZE,
		oecbOnly: oecbOnly || undefined,
	})

	if (!canAccessBilling(permSet)) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access billing.
			</div>
		)
	}

	const encounters = data?.encounters ?? []
	const totalPages = data?.totalPages ?? 1

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Billing</h1>
				<p className="text-muted-foreground text-sm">
					Invoice management, PhilHealth eClaims, and payment processing
				</p>
			</div>

			<Card className="overflow-hidden">
				<TableToolbar
					title="Unbilled Encounters"
					description="Encounters with charges but no invoice. Generate invoices to begin billing."
					filters={
						<div className="flex items-center gap-2">
							<Switch
								id="oecb-filter"
								checked={oecbOnly}
								onCheckedChange={checked => {
									setOecbOnly(checked)
									setPage(1)
								}}
							/>
							<Label htmlFor="oecb-filter" className="text-sm font-normal cursor-pointer">
								OECB only
							</Label>
						</div>
					}
				/>

				<CardContent className="p-0">
					{isLoading ? (
						<div className="p-4">
							<SkeletonRows count={5} />
						</div>
					) : isError ? (
						<ErrorState error={error} retry={() => void refetch()} />
					) : encounters.length === 0 ? (
						<EmptyState
							icon={<DollarSign className="size-10" />}
							title="No unbilled encounters"
							description={
								oecbOnly
									? "No OECB-eligible emergency encounters awaiting billing."
									: "All encounters with charges have been invoiced."
							}
						/>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Patient</TableHead>
										<TableHead>MRN</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>OECB</TableHead>
										<TableHead>Admitted</TableHead>
										<TableHead className="text-right">Charges</TableHead>
										<TableHead className="text-right">Items</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{encounters.map(enc => (
										<TableRow key={enc.encounterId}>
											<TableCell className="font-medium">{enc.patientName}</TableCell>
											<TableCell className="text-muted-foreground text-sm">{enc.mrn}</TableCell>
											<TableCell>
												<Badge variant="outline" className="capitalize text-xs">
													{enc.encounterType}
												</Badge>
											</TableCell>
											<TableCell>
												<OecbTagIndicator
													oecbEligible={enc.oecbEligible}
													hideWhenIneligible
												/>
											</TableCell>
											<TableCell className="text-sm">
												{format(new Date(enc.admittedAt), "MMM d, yyyy")}
											</TableCell>
											<TableCell className="text-right text-sm">
												₱{enc.totalCharges.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
											</TableCell>
											<TableCell className="text-right text-sm text-muted-foreground">
												{enc.chargeCount}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>

							{totalPages > 1 && (
								<div className="flex items-center justify-between border-t px-4 py-3">
									<p className="text-xs text-muted-foreground">
										Page {page} of {totalPages} · {data?.total ?? 0} total
									</p>
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											disabled={page <= 1}
											onClick={() => setPage(p => p - 1)}
										>
											Previous
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={page >= totalPages}
											onClick={() => setPage(p => p + 1)}
										>
											Next
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
