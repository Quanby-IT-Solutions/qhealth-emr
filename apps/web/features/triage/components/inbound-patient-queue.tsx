"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PhoneCall, Video } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	useCancelInboundTriageMutation,
	useInboundTriageListQuery,
	useMarkInboundArrivedMutation,
} from "@/features/ed/api/ed.hooks"
import { acuityColor, acuityLabel } from "@/features/ed/lib/acuity-utils"

interface InboundPatientQueueProps {
	facilityId: string
	canEdit: boolean
}

function EtaCountdown({ etaAt }: { etaAt: string | Date }) {
	const [remaining, setRemaining] = useState(() =>
		Math.max(0, Math.floor((new Date(etaAt).getTime() - Date.now()) / 60_000))
	)

	useEffect(() => {
		const id = setInterval(() => {
			setRemaining(Math.max(0, Math.floor((new Date(etaAt).getTime() - Date.now()) / 60_000)))
		}, 30_000)
		return () => clearInterval(id)
	}, [etaAt])

	return <span className="font-medium">{remaining === 0 ? "Arriving now" : `${remaining}m`}</span>
}

export function InboundPatientQueue({ facilityId, canEdit }: InboundPatientQueueProps) {
	const router = useRouter()
	const { data: queue = [], isLoading } = useInboundTriageListQuery(facilityId, "queued")
	const markArrived = useMarkInboundArrivedMutation()
	const cancel = useCancelInboundTriageMutation()

	function handleMarkArrived(id: string) {
		markArrived.mutate(
			{ id },
			{
				onSuccess: () => {
					toast.success("Pre-encounter created — patient is now in the Triage Queue")
					router.push("/triage")
				},
				onError: () => toast.error("Failed to mark patient as arrived"),
			}
		)
	}

	function handleCancel(id: string) {
		cancel.mutate(
			{ id },
			{
				onSuccess: () => toast.success("Inbound record cancelled"),
				onError: () => toast.error("Failed to cancel record"),
			}
		)
	}

	return (
		<Card className="h-fit">
			<CardHeader>
				<CardTitle>Inbound Patient Queue</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{isLoading ? (
					<p className="text-muted-foreground text-sm">Loading…</p>
				) : queue.length === 0 ? (
					<p className="text-muted-foreground text-sm">No inbound patients queued.</p>
				) : (
					queue.map(patient => {
						const resourceNeeds = patient.resourceNeeds as {
							bed?: boolean
							codeTeam?: boolean
							equipment?: string[]
						}
						return (
							<div key={patient.id} className="space-y-2 rounded-md border p-3">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											{patient.channelType === "video" ? (
												<Video className="size-3.5 shrink-0 text-blue-500" />
											) : (
												<PhoneCall className="size-3.5 shrink-0 text-green-500" />
											)}
											<p className="truncate text-sm font-semibold">{patient.callerName}</p>
										</div>
										<p className="text-muted-foreground text-xs">{patient.patientLocation}</p>
									</div>
									<Badge className={acuityColor(patient.provisionalAcuityLevel)}>
										L{patient.provisionalAcuityLevel}
									</Badge>
								</div>

								<p className="text-muted-foreground text-xs">
									{patient.transportMode.replace("_", " ")} · ETA{" "}
									<EtaCountdown etaAt={patient.etaAt} /> ·{" "}
									{acuityLabel(patient.provisionalAcuityLevel)}
								</p>

								{(resourceNeeds.bed ||
									resourceNeeds.codeTeam ||
									(resourceNeeds.equipment?.length ?? 0) > 0) && (
									<div className="flex flex-wrap gap-1">
										{resourceNeeds.bed && (
											<Badge variant="outline" className="text-xs">
												Bed ready
											</Badge>
										)}
										{resourceNeeds.codeTeam && (
											<Badge variant="outline" className="text-xs">
												Code team
											</Badge>
										)}
										{resourceNeeds.equipment?.map(eq => (
											<Badge key={eq} variant="outline" className="text-xs">
												{eq}
											</Badge>
										))}
									</div>
								)}

								{patient.assessmentNotes && (
									<p className="text-muted-foreground line-clamp-2 text-xs">
										{patient.assessmentNotes}
									</p>
								)}

								{canEdit && (
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="default"
											disabled={markArrived.isPending}
											onClick={() => handleMarkArrived(patient.id)}
										>
											Mark Arrived
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={cancel.isPending}
											onClick={() => handleCancel(patient.id)}
										>
											Cancel
										</Button>
									</div>
								)}
							</div>
						)
					})
				)}
			</CardContent>
		</Card>
	)
}
