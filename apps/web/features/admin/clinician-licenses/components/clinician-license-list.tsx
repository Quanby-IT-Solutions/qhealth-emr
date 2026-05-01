"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { StatusBadge } from "@/core/components/status-badge"
import type { StatusVariant } from "@/core/styles/status-tokens"

import { useListCliniciansQuery } from "../api/licenses.hooks"
import { AddLicenseDrawer } from "./add-license-drawer"

type LicenseType = "PRC" | "PTR" | "S2"
type LicenseStatus = "pending" | "verified" | "expired"

function getBadgeVariant(status: LicenseStatus | null | undefined): StatusVariant {
	if (status === "verified") return "verified"
	if (status === "expired") return "expired"
	if (status === "pending") return "pending"
	return "inactive"
}

export function ClinicianLicenseList() {
	const [search, setSearch] = useState("")
	const [statusFilter, setStatusFilter] = useState<LicenseStatus | "all">("all")
	const [page, setPage] = useState(1)
	const [addOpen, setAddOpen] = useState(false)

	const { data, isLoading, isError } = useListCliniciansQuery({
		search: search || undefined,
		status: statusFilter === "all" ? undefined : statusFilter,
		page,
		limit: 20,
	})

	function getLicenseByType(licenses: Array<{ licenseType: LicenseType; status: LicenseStatus; expiryDate: string | null }>, type: LicenseType) {
		return licenses.find(l => l.licenseType === type)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-2 flex-1 max-w-md">
					<Input
						placeholder="Search clinician name..."
						value={search}
						onChange={e => {
							setSearch(e.target.value)
							setPage(1)
						}}
					/>
					<Select
						value={statusFilter}
						onValueChange={v => {
							setStatusFilter((v ?? "all") as LicenseStatus | "all")
							setPage(1)
						}}
					>
						<SelectTrigger className="w-36">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All statuses</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="verified">Verified</SelectItem>
							<SelectItem value="expired">Expired</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<Button onClick={() => setAddOpen(true)}>Add License</Button>
			</div>

			{isLoading && (
				<div className="space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
				</div>
			)}

			{isError && (
				<p className="text-sm text-destructive py-8 text-center">Failed to load clinician licenses.</p>
			)}

			{!isLoading && !isError && data?.data.length === 0 && (
				<p className="text-sm text-muted-foreground py-8 text-center">No clinicians found.</p>
			)}

			{!isLoading && !isError && data && data.data.length > 0 && (
				<>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Clinician</TableHead>
								<TableHead>PRC</TableHead>
								<TableHead>PTR</TableHead>
								<TableHead>S2</TableHead>
								<TableHead>Next Expiry</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.data.map(row => {
								const prc = getLicenseByType(row.licenses, "PRC")
								const ptr = getLicenseByType(row.licenses, "PTR")
								const s2 = getLicenseByType(row.licenses, "S2")
								const expiring = row.daysUntilNextExpiry !== null && row.daysUntilNextExpiry <= 30

								return (
									<TableRow key={row.staffProfileId}>
										<TableCell className="font-medium">
											{row.staffName}
											{expiring && (
												<span className="ml-2 text-xs text-amber-600 font-normal">
													Expires in {row.daysUntilNextExpiry}d
												</span>
											)}
										</TableCell>
										<TableCell>
											{prc ? (
												<StatusBadge variant={getBadgeVariant(prc.status)} />
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell>
											{ptr ? (
												<StatusBadge variant={getBadgeVariant(ptr.status)} />
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell>
											{s2 ? (
												<StatusBadge variant={getBadgeVariant(s2.status)} />
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell>
											{row.daysUntilNextExpiry !== null ? (
												<span className={row.daysUntilNextExpiry <= 30 ? "text-amber-600 font-medium" : ""}>
													{row.daysUntilNextExpiry}d
												</span>
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												nativeButton={false}
												render={<Link href={`/admin/clinician-licenses/${row.staffProfileId}`} />}
											>
												View
											</Button>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>

					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<span>{data.total} total</span>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={page * 20 >= data.total}
								onClick={() => setPage(p => p + 1)}
							>
								Next
							</Button>
						</div>
					</div>
				</>
			)}

			<AddLicenseDrawer open={addOpen} onOpenChange={setAddOpen} />
		</div>
	)
}
