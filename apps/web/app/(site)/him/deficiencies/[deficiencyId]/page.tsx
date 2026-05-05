"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

import { useDeficiencyQuery, useMarkDeficiencyResolvedMutation, useNotifyDeficiencyMutation } from "@/features/him/deficiency-tracking/api/deficiencies.hooks"
import { HimEncounterContextBar } from "@/features/him/components/him-encounter-context-bar"
import { EmptyState, ErrorState, SkeletonRows } from "@/features/admin/components/state-views"

function normalizeDeficiencyLabel(deficiencyType: string) {
	return deficiencyType === "missing_diagnosis_code"
		? "undocumented procedure"
		: deficiencyType.replace(/_/g, " ")
}

export default function DeficiencyDetailPage() {
	const params = useParams<{ deficiencyId: string }>()
	const router = useRouter()
	const id = params.deficiencyId
	const [confirmOpen, setConfirmOpen] = useState(false)

	const { data: d, isLoading, isError, refetch, error } = useDeficiencyQuery(id)
	const notifyMutation = useNotifyDeficiencyMutation()
	const { mutate: markResolved, isPending: resolving, error: resolveError } = useMarkDeficiencyResolvedMutation()

	if (isLoading) return <SkeletonRows count={4} className="p-6" />
	if (isError) return <ErrorState error={error} retry={refetch} />
	if (!d) {
		return <EmptyState title="Deficiency not found" description="The selected chart deficiency could not be loaded." />
	}

	return (
		<div className="space-y-4">
			<HimEncounterContextBar encounterId={d.encounterId} />

			<div className="max-w-4xl space-y-4 p-4">
				<Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
					← Back
				</Button>

				<div>
					<h1 className="text-lg font-semibold capitalize">{normalizeDeficiencyLabel(d.deficiencyType)}</h1>
					<p className="text-xs text-muted-foreground">
						Encounter {d.encounterId} • Patient {d.patientName}
					</p>
				</div>

				<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
					<div className="space-y-4">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm">Deficiency Summary</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<p className="text-sm text-foreground">{d.description}</p>
								<div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
									<div>
										<span className="font-medium text-foreground">Owner:</span> {d.ownerDisplayName ?? "Unassigned"}
									</div>
									<div>
										<span className="font-medium text-foreground">Age:</span> {d.ageDays} days since discharge
									</div>
									<div>
										<span className="font-medium text-foreground">Discharged:</span>{" "}
										{d.dischargeDatetime ? new Date(d.dischargeDatetime).toLocaleString("en-PH") : "Pending"}
									</div>
									<div>
										<span className="font-medium text-foreground">MRN:</span> {d.patientMrn}
									</div>
								</div>
								<Link href={`/encounters/${d.encounterId}/cf4`} className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">
									Open chart workspace
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm">Notification History</CardTitle>
							</CardHeader>
							<CardContent>
								{d.notifications.length === 0 ? (
									<p className="text-sm text-muted-foreground">No notifications sent yet.</p>
								) : (
									<div className="space-y-3">
										{d.notifications.map(notification => (
											<div key={notification.id} className="rounded-md border p-3 text-sm">
												<div className="flex items-center justify-between gap-3">
													<Badge variant="secondary" className="uppercase">
														{notification.channel}
													</Badge>
													<span className="text-xs text-muted-foreground">
														{new Date(notification.sentAt).toLocaleString("en-PH")}
													</span>
												</div>
												{notification.sentByDisplayName && (
													<p className="mt-2 text-xs text-muted-foreground">Sent by {notification.sentByDisplayName}</p>
												)}
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Status</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
						<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Current</span>
								<Badge variant={d.status === "open" ? "destructive" : "secondary"} className="capitalize">
									{d.status}
								</Badge>
						</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Detected</span>
								<span>{new Date(d.detectedAt).toLocaleString("en-PH")}</span>
							</div>
							{d.resolvedAt && (
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Resolved</span>
									<span>{new Date(d.resolvedAt).toLocaleString("en-PH")}</span>
								</div>
							)}

							{resolveError && (
								<p className="text-xs text-destructive" role="alert">
									{(resolveError as Error).message}
								</p>
							)}

							{!d.canMarkResolved && d.resolutionBlockedReason && (
								<p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
									{d.resolutionBlockedReason}
								</p>
							)}

							<div className="flex flex-col gap-2">
								<Button
									variant="outline"
									onClick={async () => {
										await notifyMutation.mutateAsync({ id, channel: "in_app" })
										await notifyMutation.mutateAsync({ id, channel: "email" })
									}}
									disabled={notifyMutation.isPending || d.status === "resolved"}
								>
									{notifyMutation.isPending ? "Notifying…" : "Notify Owner"}
								</Button>
								<Button
									onClick={() => setConfirmOpen(true)}
									disabled={resolving || d.status === "resolved" || !d.canMarkResolved}
								>
									Mark Resolved
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Mark Deficiency Resolved</DialogTitle>
						<DialogDescription>
							Server will verify required artifact exists before allowing resolution.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
						<Button
							onClick={() =>
								markResolved(
									{ id },
									{ onSuccess: () => setConfirmOpen(false) }
								)
							}
							disabled={resolving || !d.canMarkResolved}
						>
							{resolving ? "Resolving…" : "Confirm"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			</div>
		</div>
	)
}
