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
	const [indicationIcd10Code, setIndicationIcd10Code] = useState("")
	const [indicationIcd10Display, setIndicationIcd10Display] = useState("")
	const [priority, setPriority] = useState<OrderPriority>("routine")

	const createImagingOrder = useCreateImagingOrderMutation()

	function resetForm() {
		setModality("")
		setBodyPart("")
		setClinicalIndication("")
		setIndicationIcd10Code("")
		setIndicationIcd10Display("")
		setPriority("routine")
	}

	function handleOpenChange(next: boolean) {
		if (!next) resetForm()
		onOpenChange(next)
	}

	function handleSubmit() {
		if (!modality || !bodyPart.trim()) return

		createImagingOrder.mutate(
			{
				facilityId,
				encounterId,
				modality,
				bodyPart: bodyPart.trim(),
				clinicalIndication: clinicalIndication.trim() || undefined,
				indicationIcd10Code: indicationIcd10Code.trim() || undefined,
				indicationIcd10Display: indicationIcd10Display.trim() || undefined,
				priority,
			},
			{
				onSuccess: () => handleOpenChange(false),
			},
		)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>New Imaging Order</DialogTitle>
					<DialogDescription>
						Enter the imaging study details.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="imgModality">Modality *</Label>
						<Select value={modality || undefined} onValueChange={v => setModality((v ?? "") as ImagingModality | "")}>
							<SelectTrigger id="imgModality">
								<SelectValue />
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
							onChange={(e) => setBodyPart(e.target.value)}
							placeholder="e.g., Chest, Abdomen"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="imgClinicalIndication">Clinical Indication</Label>
						<Textarea
							id="imgClinicalIndication"
							value={clinicalIndication}
							onChange={(e) => setClinicalIndication(e.target.value)}
							rows={2}
							placeholder="Optional"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="imgIndicationIcd10Code">ICD-10 Code</Label>
							<Input
								id="imgIndicationIcd10Code"
								value={indicationIcd10Code}
								onChange={(e) => setIndicationIcd10Code(e.target.value)}
								placeholder="e.g., R05.9"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="imgIndicationIcd10Display">ICD-10 Diagnosis</Label>
							<Input
								id="imgIndicationIcd10Display"
								value={indicationIcd10Display}
								onChange={(e) => setIndicationIcd10Display(e.target.value)}
								placeholder="e.g., Cough, unspecified"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="imgPriority">Priority</Label>
						<Select value={priority} onValueChange={v => setPriority((v ?? "routine") as OrderPriority)}>
							<SelectTrigger id="imgPriority">
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
						disabled={!modality || !bodyPart.trim() || createImagingOrder.isPending}
						onClick={handleSubmit}
					>
						{createImagingOrder.isPending ? "Signing..." : "Sign Imaging Order"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
