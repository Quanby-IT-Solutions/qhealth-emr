"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Input } from "@/core/components/ui/input"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { FilterBar, FilterField } from "@/features/admin/components/filter-bar"
import { EmptyState, ErrorState, SkeletonRows } from "@/features/admin/components/state-views"
import { TableToolbar } from "@/features/admin/components/table-toolbar"

import { useRecordsAuditQuery } from "../api/records.hooks"

interface RecordsAuditPageProps {
	facilityId: string
}

export function RecordsAuditPage({ facilityId }: RecordsAuditPageProps) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	const dateFrom = searchParams.get("from") ?? ""
	const dateTo = searchParams.get("to") ?? ""
	const documentType = searchParams.get("doc") ?? ""
	const recipient = searchParams.get("rcp") ?? ""

	const { data, isLoading, isError, refetch, error } = useRecordsAuditQuery({
		facilityId,
		dateFrom: dateFrom || undefined,
		dateTo: dateTo || undefined,
		documentType: documentType || undefined,
		recipient: recipient || undefined,
	})

	const updateParam = useCallback(
		(key: string, value: string) => {
			const params = new URLSearchParams(searchParams.toString())
			if (value) params.set(key, value)
			else params.delete(key)
			router.replace(`${pathname}?${params.toString()}`, { scroll: false })
		},
		[router, pathname, searchParams]
	)

	return (
		<div className="space-y-3 px-4 py-3">
			<TableToolbar
				title="Records Release Audit"
				description="Tamper-evident audit trail for all medical record releases."
			/>

			<FilterBar>
				<FilterField label="From" htmlFor="from-f">
					<Input
						id="from-f"
						type="date"
						value={dateFrom}
						onChange={e => updateParam("from", e.target.value)}
						className="h-8 w-36 text-xs"
					/>
				</FilterField>
				<FilterField label="To" htmlFor="to-f">
					<Input
						id="to-f"
						type="date"
						value={dateTo}
						onChange={e => updateParam("to", e.target.value)}
						className="h-8 w-36 text-xs"
					/>
				</FilterField>
				<FilterField label="Document Type" htmlFor="doc-f">
					<Input
						id="doc-f"
						value={documentType}
						onChange={e => updateParam("doc", e.target.value)}
						placeholder="e.g. discharge_summary"
						className="h-8 w-44 text-xs"
					/>
				</FilterField>
				<FilterField label="Recipient" htmlFor="rcp-f">
					<Input
						id="rcp-f"
						value={recipient}
						onChange={e => updateParam("rcp", e.target.value)}
						placeholder="Patient/agent name"
						className="h-8 w-48 text-xs"
					/>
				</FilterField>
			</FilterBar>

			{isLoading && <SkeletonRows count={5} />}
			{isError && <ErrorState error={error} retry={refetch} />}
			{data && data.entries.length === 0 && !isLoading && (
				<EmptyState title="No audit entries match filters" />
			)}

			{data && data.entries.length > 0 && (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-44">Occurred</TableHead>
							<TableHead>Action</TableHead>
							<TableHead>Recipient</TableHead>
							<TableHead>Document Types</TableHead>
							<TableHead className="w-24">Actor</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.entries.map(entry => (
							<TableRow key={entry.id}>
								<TableCell className="text-xs">
									{new Date(entry.occurredAt).toLocaleString("en-PH")}
								</TableCell>
								<TableCell>
									<Badge variant="outline" className="text-[10px] capitalize">
										{entry.action.replace(/_/g, " ")}
									</Badge>
								</TableCell>
								<TableCell className="text-xs">{entry.recipient ?? "—"}</TableCell>
								<TableCell className="text-xs">{entry.documentTypes?.join(", ") ?? "—"}</TableCell>
								<TableCell className="font-mono text-[10px]">
									{entry.actorStaffId?.slice(0, 8) ?? "—"}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	)
}
