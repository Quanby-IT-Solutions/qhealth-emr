"use client"

import { useState } from "react"

import { ArrowRight, FlaskConical, PhoneForwarded } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

import { type NbsLogbookEntry, type NbsStatus, useNbsLogbookQuery } from "@/features/nbs/api/nbs.hooks"
import { NbsReferralTracker } from "@/features/nbs/components/nbs-referral-tracker"

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

const NBS_PAGE_SIZE = 8

export function NbsLogbook({ facilityId }: NbsLogbookProps) {
	const [page, setPage] = useState(1)
	const { data, isLoading, isFetching } = useNbsLogbookQuery(facilityId, page, NBS_PAGE_SIZE)
	const [referralEntry, setReferralEntry] = useState<NbsLogbookEntry | null>(null)

	const entries = data?.data ?? []
	const totalPages = data?.totalPages ?? 1
	const totalEntries = data?.total ?? 0
	const pageStart = totalEntries === 0 ? 0 : (page - 1) * NBS_PAGE_SIZE + 1
	const pageEnd = Math.min(page * NBS_PAGE_SIZE, totalEntries)

	const needsReferral = (entry: NbsLogbookEntry) =>
		entry.result_overall === "abnormal" || entry.result_overall === "borderline"

	return (
		<>
			<Card>
				<CardHeader className="border-border/60 border-b pb-3">
					<div className="flex items-start gap-3">
						<div className="bg-secondary/60 text-muted-foreground flex size-10 items-center justify-center rounded-xl">
							<FlaskConical className="size-4" />
						</div>
						<div className="space-y-1">
							<CardTitle className="tracking-tight">NBS Logbook</CardTitle>
							<p className="text-sm text-muted-foreground">
								Track screening records, panel status, and referrals.
							</p>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{isLoading ? (
						<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
							Loading logbook...
						</div>
					) : entries.length === 0 ? (
						<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
							No NBS entries recorded yet.
						</div>
					) : (
						<>
							<p className="text-xs text-muted-foreground px-0.5">
								Showing {pageStart}-{pageEnd} of {totalEntries} entries
								{isFetching && " · Updating..."}
							</p>

							<div className="border-border/60 bg-background overflow-hidden rounded-2xl border divide-y divide-border/60">
								{entries.map((entry) => {
									const statusCfg = STATUS_CONFIG[entry.status]
									const birthDate = new Date(entry.birthDatetime).toLocaleDateString(undefined, {
										month: "short",
										day: "numeric",
										year: "numeric",
									})
									const collectedAt = entry.specimenCollectedAt
										? new Date(entry.specimenCollectedAt).toLocaleString(undefined, {
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})
										: "—"

									return (
										<div
											key={entry.id}
											className="hover:bg-secondary/30 flex flex-col gap-2 px-4 py-2.5 transition-colors md:flex-row md:items-center md:justify-between"
										>
											<div className="min-w-0 space-y-1.5">
												<div className="flex flex-wrap items-center gap-2">
													<span className="text-foreground text-sm font-semibold tracking-tight">
														{entry.patientName}
													</span>
													<Badge
														variant="secondary"
														className="border-border/60 bg-secondary/60 text-foreground rounded-full border px-2 py-0.5 font-mono text-[0.68rem] tracking-[0.14em]"
													>
														{entry.patientMrn}
													</Badge>
													<Badge className={`${statusCfg.className} rounded-full px-2 py-0.5 text-[0.68rem]`}>
														{statusCfg.label}
													</Badge>
													{entry.result_overall && (
														<Badge
															className={
																entry.result_overall === "normal"
																	? "rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-[0.68rem]"
																	: entry.result_overall === "borderline"
																		? "rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[0.68rem]"
																		: "rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-[0.68rem]"
															}
														>
															{entry.result_overall.charAt(0).toUpperCase() + entry.result_overall.slice(1)}
														</Badge>
													)}
												</div>
												<p className="text-muted-foreground text-xs">
													Birth date {birthDate} · Collected {collectedAt}
												</p>
											</div>

											{needsReferral(entry) ? (
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="shrink-0 justify-between gap-2"
													onClick={() => setReferralEntry(entry)}
												>
													Refer patient
													<ArrowRight className="size-4" />
												</Button>
											) : (
												<span className="text-xs text-muted-foreground">No referral needed</span>
											)}
										</div>
									)
								})}
							</div>

							{totalPages > 1 && (
								<div className="flex items-center justify-between gap-3 px-0.5">
									<p className="text-xs text-muted-foreground">
										Page {page} of {totalPages}
									</p>
									<div className="flex items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={page <= 1}
											onClick={() => setPage((p) => p - 1)}
										>
											Previous
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={page >= totalPages}
											onClick={() => setPage((p) => p + 1)}
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

		{/* Referral Tracking Dialog */}
		<Dialog
			open={referralEntry !== null}
			onOpenChange={(open) => { if (!open) setReferralEntry(null) }}
		>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<PhoneForwarded className="size-4" />
						Referral Tracking — {referralEntry?.patientName}
					</DialogTitle>
				</DialogHeader>
				{referralEntry && (
					<NbsReferralTracker
						nbsId={referralEntry.id}
						encounterId={referralEntry.encounterId}
						patientId={referralEntry.patientId}
					/>
				)}
			</DialogContent>
		</Dialog>
		</>
	)
}
