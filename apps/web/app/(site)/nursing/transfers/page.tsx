"use client"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	usePendingTransfersQuery,
	useReceiveTransferMutation,
} from "@/features/encounters/api/encounters.hooks"

function formatDateTime(value: Date | string | null) {
	if (!value) return "-"
	return new Date(value).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export default function NursingTransfersPage() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const permSet = new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const staffProfileId = profile?.staffProfiles?.[0]?.id ?? ""

	const { data: pendingTransfers, isLoading } = usePendingTransfersQuery(
		{ facilityId },
		{ enabled: !!facilityId }
	)

	const receive = useReceiveTransferMutation()

	const handleReceive = async (transferId: string) => {
		await receive.mutateAsync({ transferId, receivingStaffId: staffProfileId })
	}

	if (!permSet.has("nursing:create")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to confirm patient transfers.
			</div>
		)
	}

	return (
		<div className="space-y-6 p-4 md:p-6">
			<div>
				<h1 className="text-2xl font-semibold">Pending Transfers</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Confirm arrival of patients being transferred to your ward.
				</p>
			</div>

			{receive.isSuccess ? (
				<Alert>
					<AlertDescription>
						Patient received. Source bed is now Dirty / For Cleaning. Destination bed is now
						Occupied.
					</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Incoming Patients</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Patient</TableHead>
								<TableHead>From</TableHead>
								<TableHead>To</TableHead>
								<TableHead>Reason</TableHead>
								<TableHead>Initiated</TableHead>
								<TableHead className="w-32 text-right">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								Array.from({ length: 3 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={6}>
											<Skeleton className="h-5 w-full" />
										</TableCell>
									</TableRow>
								))
							) : !pendingTransfers || pendingTransfers.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
										No pending transfers.
									</TableCell>
								</TableRow>
							) : (
								pendingTransfers.map(t => (
									<TableRow key={t.transferId}>
										<TableCell>
											<div className="font-medium">{t.patientName}</div>
											<div className="text-muted-foreground text-xs">{t.patientMrn}</div>
										</TableCell>
										<TableCell className="text-sm">
											<div>{t.fromWardName ?? "-"}</div>
											{t.fromBedNumber ? (
												<Badge variant="outline" className="mt-0.5 text-xs">
													Bed {t.fromBedNumber}
												</Badge>
											) : null}
										</TableCell>
										<TableCell className="text-sm">
											<div>{t.toWardName ?? "-"}</div>
											{t.toBedNumber ? (
												<Badge variant="secondary" className="mt-0.5 text-xs">
													Bed {t.toBedNumber}
												</Badge>
											) : null}
										</TableCell>
										<TableCell className="max-w-xs truncate text-sm">
											{t.transferReason ?? "-"}
										</TableCell>
										<TableCell className="text-sm">
											{formatDateTime(t.transferredAt)}
										</TableCell>
										<TableCell className="text-right">
											<Button
												size="sm"
												disabled={receive.isPending || !staffProfileId}
												onClick={() => handleReceive(t.transferId)}
											>
												{receive.isPending ? "Confirming…" : "Receive Patient"}
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}
