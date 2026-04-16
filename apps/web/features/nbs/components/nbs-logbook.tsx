"use client"

import { useState } from "react"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

import type { NbsStatus } from "@/features/nbs/api/nbs.hooks"
import { useNbsLogbookQuery } from "@/features/nbs/api/nbs.hooks"

// ============================================================================
// Config
// ============================================================================

const STATUS_CONFIG: Record<NbsStatus, { label: string; className: string }> = {
	pending: {
		label: "Pending",
		className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
	},
	collected: {
		label: "Collected",
		className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	},
	sent: {
		label: "Sent",
		className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
	},
	resulted: {
		label: "Resulted",
		className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
	},
	positive: {
		label: "Positive",
		className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
	},
	negative: {
		label: "Negative",
		className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	},
}

// ============================================================================
// Component
// ============================================================================

interface NbsLogbookProps {
	facilityId: string
}

export function NbsLogbook({ facilityId }: NbsLogbookProps) {
	const [page, setPage] = useState(1)
	const { data, isLoading } = useNbsLogbookQuery(facilityId, page)

	const entries = data?.data ?? []
	const totalPages = data?.totalPages ?? 1

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">NBS Logbook</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="rounded-md border overflow-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Patient</TableHead>
								<TableHead>MRN</TableHead>
								<TableHead>Birth Date</TableHead>
								<TableHead>Collected At</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Overall Result</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center text-muted-foreground py-8">
										Loading logbook…
									</TableCell>
								</TableRow>
							) : entries.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center text-muted-foreground py-8">
										No NBS entries recorded yet.
									</TableCell>
								</TableRow>
							) : (
								entries.map((entry) => {
									const statusCfg = STATUS_CONFIG[entry.status]
									return (
										<TableRow key={entry.id}>
											<TableCell className="font-medium">
												{entry.patientName}
											</TableCell>
											<TableCell className="font-mono text-xs">
												{entry.patientMrn}
											</TableCell>
											<TableCell className="text-sm">
												{new Date(entry.birthDatetime).toLocaleDateString(
													undefined,
													{
														month: "short",
														day: "numeric",
														year: "numeric",
													}
												)}
											</TableCell>
											<TableCell className="text-sm">
												{entry.specimenCollectedAt
													? new Date(
															entry.specimenCollectedAt
														).toLocaleString(undefined, {
															month: "short",
															day: "numeric",
															hour: "2-digit",
															minute: "2-digit",
														})
													: "—"}
											</TableCell>
											<TableCell>
												<Badge className={statusCfg.className}>
													{statusCfg.label}
												</Badge>
											</TableCell>
											<TableCell>
												{entry.result_overall ? (
													<Badge
														className={
															entry.result_overall === "normal"
																? "bg-green-100 text-green-800"
																: entry.result_overall === "borderline"
																	? "bg-amber-100 text-amber-800"
																	: "bg-red-100 text-red-800"
														}
													>
														{entry.result_overall.charAt(0).toUpperCase() +
															entry.result_overall.slice(1)}
													</Badge>
												) : (
													<span className="text-muted-foreground text-sm">—</span>
												)}
											</TableCell>
										</TableRow>
									)
								})
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<span>
							Page {page} of {totalPages} · {data?.total ?? 0} entries
						</span>
						<div className="flex gap-1">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="size-8 p-0"
								disabled={page <= 1}
								onClick={() => setPage((p) => p - 1)}
							>
								<ChevronLeft className="size-4" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="size-8 p-0"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => p + 1)}
							>
								<ChevronRight className="size-4" />
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
