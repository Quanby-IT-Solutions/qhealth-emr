"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"

import { EmptyState, ErrorState, SkeletonRows } from "@/features/admin/components/state-views"
import { FilterBar, FilterField } from "@/features/admin/components/filter-bar"
import { TableToolbar } from "@/features/admin/components/table-toolbar"

import { useMedicalRecordsRequestsQuery } from "../api/medical-records.hooks"

interface RecordsRequestListPageProps {
	facilityId: string
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	pending: "secondary",
	processing: "outline",
	completed: "default",
	rejected: "destructive",
}

export function RecordsRequestListPage({ facilityId }: RecordsRequestListPageProps) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const filterStatus = (searchParams.get("status") ?? "all") as "all" | "pending" | "processing" | "completed" | "rejected"

	const { data, isLoading, isError, refetch, error } = useMedicalRecordsRequestsQuery({
		facilityId,
		status: filterStatus !== "all" ? filterStatus : undefined,
	})

	const updateParam = useCallback(
		(key: string, value: string) => {
			const params = new URLSearchParams(searchParams.toString())
			if (value && value !== "all") params.set(key, value)
			else params.delete(key)
			router.replace(`${pathname}?${params.toString()}`, { scroll: false })
		},
		[router, pathname, searchParams]
	)

	return (
		<div className="space-y-3 px-4 py-3">
			<TableToolbar
				title="Medical Records Requests"
				description="Process patient requests for medical record copies."
			/>

			<FilterBar>
				<FilterField label="Status" htmlFor="rs-f">
					<Select value={filterStatus} onValueChange={v => updateParam("status", v ?? "")}>
						<SelectTrigger id="rs-f" className="h-8 w-36 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="processing">Processing</SelectItem>
							<SelectItem value="completed">Completed</SelectItem>
							<SelectItem value="rejected">Rejected</SelectItem>
						</SelectContent>
					</Select>
				</FilterField>
			</FilterBar>

			{isLoading && <SkeletonRows count={5} />}
			{isError && <ErrorState error={error} retry={refetch} />}
			{data && data.data.length === 0 && !isLoading && (
				<EmptyState title="No records requests" description="Adjust filters or wait for new requests." />
			)}

			{data && data.data.length > 0 && (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-32">Created</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Requested By</TableHead>
							<TableHead className="w-24">Status</TableHead>
							<TableHead className="w-20">DPA</TableHead>
							<TableHead className="w-20">Paid</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.data.map(r => (
							<TableRow
								key={r.id}
								className="cursor-pointer hover:bg-muted/40"
								onClick={() => router.push(`/him/records-requests/${r.id}`)}
							>
								<TableCell className="text-xs">{new Date(r.createdAt).toLocaleDateString("en-PH")}</TableCell>
								<TableCell className="text-xs capitalize">{r.requestType.replace(/_/g, " ")}</TableCell>
								<TableCell className="text-xs">
									{r.requestedByName}
									{r.requestedByRelationship && (
										<span className="ml-1 text-muted-foreground">({r.requestedByRelationship})</span>
									)}
								</TableCell>
								<TableCell>
									<Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="text-[10px] capitalize">
										{r.status}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge variant={r.dpaConsentObtained ? "default" : "secondary"} className="text-[10px]">
										{r.dpaConsentObtained ? "yes" : "no"}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge variant={r.paidAt ? "default" : "secondary"} className="text-[10px]">
										{r.paidAt ? "yes" : "no"}
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	)
}
