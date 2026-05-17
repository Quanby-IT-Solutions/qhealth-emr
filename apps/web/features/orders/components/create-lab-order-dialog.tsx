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
import { useCreateLabOrderMutation } from "@/features/orders/api/orders.hooks"

type OrderPriority = "routine" | "urgent" | "stat"

interface CreateLabOrderDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	facilityId: string
}

export function CreateLabOrderDialog({
	open,
	onOpenChange,
	encounterId,
	facilityId,
}: CreateLabOrderDialogProps) {
	const [testName, setTestName] = useState("")
	const [panelName, setPanelName] = useState("")
	const [loincCode, setLoincCode] = useState("")
	const [panelCode, setPanelCode] = useState("")
	const [specimenType, setSpecimenType] = useState("")
	const [clinicalIndication, setClinicalIndication] = useState("")
	const [indicationIcd10Code, setIndicationIcd10Code] = useState("")
	const [indicationIcd10Display, setIndicationIcd10Display] = useState("")
	const [priority, setPriority] = useState<OrderPriority>("routine")

	const createLabOrder = useCreateLabOrderMutation()

	function resetForm() {
		setTestName("")
		setPanelName("")
		setLoincCode("")
		setPanelCode("")
		setSpecimenType("")
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
		if (!testName.trim()) return

		createLabOrder.mutate(
			{
				facilityId,
				encounterId,
				testName: testName.trim(),
				panelName: panelName.trim() || undefined,
				loincCode: loincCode.trim() || undefined,
				panelCode: panelCode.trim() || undefined,
				specimenType: specimenType.trim() || undefined,
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
					<DialogTitle>New Lab Order</DialogTitle>
					<DialogDescription>
						Enter the lab test details.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="labTestName">Test Name *</Label>
						<Input
							id="labTestName"
							value={testName}
							onChange={(e) => setTestName(e.target.value)}
							placeholder="e.g., Complete Blood Count"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="labPanelName">Panel Name</Label>
							<Input
								id="labPanelName"
								value={panelName}
								onChange={(e) => setPanelName(e.target.value)}
								placeholder="Optional"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="labLoincCode">LOINC Code</Label>
							<Input
								id="labLoincCode"
								value={loincCode}
								onChange={(e) => setLoincCode(e.target.value)}
								placeholder="Optional"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="labPanelCode">Panel Code</Label>
							<Input
								id="labPanelCode"
								value={panelCode}
								onChange={(e) => setPanelCode(e.target.value)}
								placeholder="Optional"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="labSpecimenType">Specimen Type</Label>
							<Input
								id="labSpecimenType"
								value={specimenType}
								onChange={(e) => setSpecimenType(e.target.value)}
								placeholder="e.g., Blood, Urine"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="labClinicalIndication">Clinical Indication</Label>
						<Textarea
							id="labClinicalIndication"
							value={clinicalIndication}
							onChange={(e) => setClinicalIndication(e.target.value)}
							rows={2}
							placeholder="Optional"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="labIndicationIcd10Code">ICD-10 Code</Label>
							<Input
								id="labIndicationIcd10Code"
								value={indicationIcd10Code}
								onChange={(e) => setIndicationIcd10Code(e.target.value)}
								placeholder="e.g., J18.9"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="labIndicationIcd10Display">ICD-10 Diagnosis</Label>
							<Input
								id="labIndicationIcd10Display"
								value={indicationIcd10Display}
								onChange={(e) => setIndicationIcd10Display(e.target.value)}
								placeholder="e.g., Pneumonia, unspecified"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="labPriority">Priority</Label>
						<Select value={priority} onValueChange={v => setPriority((v ?? "routine") as OrderPriority)}>
							<SelectTrigger id="labPriority">
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
						disabled={!testName.trim() || createLabOrder.isPending}
						onClick={handleSubmit}
					>
						{createLabOrder.isPending ? "Signing..." : "Sign Lab Order"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
