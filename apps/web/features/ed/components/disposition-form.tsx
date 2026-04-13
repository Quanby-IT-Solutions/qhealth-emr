"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { useWardsQuery, useBedListQuery } from "@/features/beds/api/beds.hooks"
import { useEdDispositionMutation } from "@/features/ed/api/ed.hooks"

interface DispositionFormProps {
	encounterId: string
	facilityId: string
	onSuccess: () => void
}

export function DispositionForm({ encounterId, facilityId, onSuccess }: DispositionFormProps) {
	const dispose = useEdDispositionMutation()

	const [disposition, setDisposition] = useState<"admit" | "discharge" | "transfer" | "deceased" | "">("")
	const [oecbEligible, setOecbEligible] = useState(false)
	const [admitWardId, setAdmitWardId] = useState("")
	const [admitBedId, setAdmitBedId] = useState("")

	const { data: wards } = useWardsQuery(facilityId)
	const { data: bedData } = useBedListQuery({
		facilityId,
		wardId: admitWardId || undefined,
		status: "available",
	})

	const availableBeds = bedData?.wards?.flatMap(w => w.beds.filter(b => b.status === "available")) ?? []

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!disposition) return

		dispose.mutate(
			{
				encounterId,
				disposition,
				oecbEligible,
				admitWardId: disposition === "admit" && admitWardId ? admitWardId : undefined,
				admitBedId: disposition === "admit" && admitBedId ? admitBedId : undefined,
			},
			{
				onSuccess: () => {
					onSuccess()
				},
			}
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Disposition Type */}
			<div className="space-y-2">
				<Label>Disposition</Label>
				<Select
					value={disposition || null}
					onValueChange={v =>
						setDisposition((v ?? "") as "admit" | "discharge" | "transfer" | "deceased" | "")
					}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="admit">Admit (Inpatient)</SelectItem>
						<SelectItem value="discharge">Discharge</SelectItem>
						<SelectItem value="transfer">Transfer</SelectItem>
						<SelectItem value="deceased">Deceased</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Admit: Ward & Bed Selection */}
			{disposition === "admit" && (
				<>
					<div className="space-y-2">
						<Label>Admitting Ward</Label>
						<Select
							value={admitWardId || null}
							onValueChange={v => {
								setAdmitWardId(v ?? "")
								setAdmitBedId("")
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(wards ?? []).map(ward => (
									<SelectItem key={ward.id} value={ward.id}>
										{ward.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{admitWardId && (
						<div className="space-y-2">
							<Label>Bed</Label>
							<Select
								value={admitBedId || null}
								onValueChange={v => setAdmitBedId(v ?? "")}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{availableBeds.map(bed => (
										<SelectItem key={bed.id} value={bed.id}>
											{bed.bedNumber}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</>
			)}

			{/* OECB Flag */}
			{disposition === "discharge" && (
				<div className="flex items-center gap-2">
					<Checkbox
						checked={oecbEligible}
						onCheckedChange={v => setOecbEligible(v === true)}
					/>
					<Label className="text-sm">
						OECB Eligible (Outpatient Emergency Care Benefit)
					</Label>
				</div>
			)}

			<Button
				type="submit"
				className="w-full"
				disabled={!disposition || dispose.isPending}
			>
				{dispose.isPending ? "Processing…" : "Confirm Disposition"}
			</Button>

			{dispose.isError && (
				<p className="text-destructive text-sm">
					{dispose.error.message}
				</p>
			)}
		</form>
	)
}
