"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { useCreateImagingOrderMutation } from "@/features/orders/api/orders.hooks"
import {
	Icd10IndicationPicker,
	type DiagnosisEntry,
} from "@/features/orders/components/create-lab-order-dialog"

type ImagingModality = "xray" | "ct" | "mri" | "ultrasound" | "other"
type OrderPriority = "routine" | "urgent" | "stat"

interface CreateImagingOrderDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	facilityId: string
}

export function CreateImagingOrderDialog({
	open,
	onOpenChange,
	encounterId,
	facilityId,
}: CreateImagingOrderDialogProps) {
	const [modality, setModality] = useState<ImagingModality | "">("")
	const [bodyPart, setBodyPart] = useState("")
	const [clinicalIndication, setClinicalIndication] = useState("")
	const [indicationDiagnosis, setIndicationDiagnosis] = useState<DiagnosisEntry | null>(null)
	const [priority, setPriority] = useState<OrderPriority>("routine")

	const createImagingOrder = useCreateImagingOrderMutation()

	function resetForm() {
		setModality("")
		setBodyPart("")
		setClinicalIndication("")
		setIndicationDiagnosis(null)
		setPriority("routine")
	}

	function handleOpenChange(next: boolean) {
		if (!next) resetForm()
		onOpenChange(next)
	}

	function handleSubmit() {
		if (!modality || !bodyPart.trim() || !clinicalIndication.trim() || !indicationDiagnosis) return

		createImagingOrder.mutate(
			{
				facilityId,
				encounterId,
				modality,
				bodyPart: bodyPart.trim(),
				clinicalIndication: clinicalIndication.trim(),
				indicationIcd10Code: indicationDiagnosis.code,
				indicationIcd10Display: indicationDiagnosis.description,
				priority,
			},
			{
				onSuccess: () => handleOpenChange(false),
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>New Imaging Order</DialogTitle>
					<DialogDescription>Enter the imaging study details.</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="imgModality">Modality *</Label>
						<Select
							value={modality || undefined}
							onValueChange={v => setModality((v ?? "") as ImagingModality | "")}
						>
							<SelectTrigger id="imgModality" className="w-full">
								<SelectValue placeholder="Select imaging modality">
									{modality ? undefined : "Select imaging modality"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="xray">X-Ray</SelectItem>
								<SelectItem value="ct">CT Scan</SelectItem>
								<SelectItem value="mri">MRI</SelectItem>
								<SelectItem value="ultrasound">Ultrasound</SelectItem>
								<SelectItem value="other">Other</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="imgBodyPart">Body Part *</Label>
						<Input
							id="imgBodyPart"
							value={bodyPart}
							onChange={e => setBodyPart(e.target.value)}
							placeholder="e.g., Chest, Abdomen"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="imgClinicalIndication">Clinical Indication</Label>
						<Textarea
							id="imgClinicalIndication"
							value={clinicalIndication}
							onChange={e => setClinicalIndication(e.target.value)}
							rows={2}
							placeholder="Medical necessity for the requested imaging study"
						/>
					</div>

					<Icd10IndicationPicker value={indicationDiagnosis} onChange={setIndicationDiagnosis} />

					<div className="space-y-2">
						<Label htmlFor="imgPriority">Priority</Label>
						<Select
							value={priority}
							onValueChange={v => setPriority((v ?? "routine") as OrderPriority)}
						>
							<SelectTrigger id="imgPriority" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="routine">Routine</SelectItem>
								<SelectItem value="urgent">Urgent</SelectItem>
								<SelectItem value="stat">STAT</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>
					<Button
						disabled={
							!modality ||
							!bodyPart.trim() ||
							!clinicalIndication.trim() ||
							!indicationDiagnosis ||
							createImagingOrder.isPending
						}
						onClick={handleSubmit}
					>
						{createImagingOrder.isPending ? "Signing..." : "Sign Imaging Order"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
