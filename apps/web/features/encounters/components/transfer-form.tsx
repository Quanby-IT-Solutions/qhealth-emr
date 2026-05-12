"use client"

import { useState } from "react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useBedListQuery } from "@/features/beds/api/beds.hooks"
import { useInitiateTransferMutation } from "@/features/encounters/api/encounters.hooks"

interface TransferFormProps {
	encounterId: string
	hasPendingTransfer?: boolean
}

export function TransferForm({ encounterId, hasPendingTransfer }: TransferFormProps) {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const staffId = profile?.staffProfiles?.[0]?.id ?? ""

	const { data: bedData } = useBedListQuery({ facilityId })
	const transfer = useInitiateTransferMutation()

	const [wardId, setWardId] = useState("")
	const [bedId, setBedId] = useState("")
	const [reason, setReason] = useState("")
	const [initiated, setInitiated] = useState(false)

	const wards = bedData?.wards ?? []
	const selectedWard = wards.find(w => w.id === wardId)
	const availableBeds = selectedWard?.beds.filter(b => b.status === "available") ?? []

	if (hasPendingTransfer) {
		return (
			<Alert>
				<AlertDescription>
					A transfer is already in progress for this patient. Awaiting Ward Nurse confirmation.
				</AlertDescription>
			</Alert>
		)
	}

	if (initiated) {
		return (
			<Alert>
				<AlertDescription>
					Transfer initiated. Source bed is now Pending Transfer. Ward Nurse at the destination has
					been notified.
				</AlertDescription>
			</Alert>
		)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!wardId || !bedId) return

		await transfer.mutateAsync({
			encounterId,
			toWardId: wardId,
			toBedId: bedId,
			transferReason: reason || undefined,
			orderingStaffId: staffId,
		})

		setInitiated(true)
	}

	return (
		<form onSubmit={handleSubmit}>
			<Card>
				<CardHeader>
					<CardTitle>Initiate Transfer</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>Destination Ward *</Label>
						<Select
							value={wardId}
							onValueChange={v => {
								setWardId(v ?? "")
								setBedId("")
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{wards.map(w => (
									<SelectItem key={w.id} value={w.id}>
										{w.name} ({w.availableCount} available)
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label>Destination Bed *</Label>
						<Select value={bedId} onValueChange={v => setBedId(v ?? "")}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{availableBeds.map(b => (
									<SelectItem key={b.id} value={b.id}>
										{b.bedNumber}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5 sm:col-span-2">
						<Label>Transfer Reason</Label>
						<Textarea
							rows={3}
							value={reason}
							onChange={e => setReason(e.target.value)}
						/>
					</div>

					<div className="sm:col-span-2">
						<Button type="submit" disabled={!wardId || !bedId || transfer.isPending}>
							{transfer.isPending ? "Initiating…" : "Initiate Transfer"}
						</Button>
					</div>
				</CardContent>
			</Card>
		</form>
	)
}
