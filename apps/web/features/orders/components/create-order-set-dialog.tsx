"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { cn } from "@/core/lib/utils"
import {
	useCreateImagingOrderMutation,
	useCreateLabOrderMutation,
} from "@/features/orders/api/orders.hooks"
import {
	ORDER_SETS,
	type OrderSetImagingModality,
	type OrderSetOrder,
} from "@/features/orders/lib/order-sets"

interface CreateOrderSetDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	facilityId: string
}

function formatModalityLabel(modality: OrderSetImagingModality) {
	switch (modality) {
		case "xray":
			return "X-Ray"
		case "ct":
			return "CT"
		case "mri":
			return "MRI"
		case "ultrasound":
			return "Ultrasound"
		default:
			return "Other"
	}
}

function getOrderPreviewLabel(order: OrderSetOrder) {
	if (order.type === "lab") return order.payload.testName
	return `${formatModalityLabel(order.payload.modality)} - ${order.payload.bodyPart}`
}

export function CreateOrderSetDialog({
	open,
	onOpenChange,
	encounterId,
	facilityId,
}: CreateOrderSetDialogProps) {
	const [selectedSetId, setSelectedSetId] = useState(ORDER_SETS[0]?.id ?? "")
	const [isSubmitting, setIsSubmitting] = useState(false)

	const createLabOrder = useCreateLabOrderMutation()
	const createImagingOrder = useCreateImagingOrderMutation()

	const selectedSet = ORDER_SETS.find(orderSet => orderSet.id === selectedSetId) ?? ORDER_SETS[0]
	const isPending = isSubmitting || createLabOrder.isPending || createImagingOrder.isPending

	function resetDialog() {
		setSelectedSetId(ORDER_SETS[0]?.id ?? "")
		setIsSubmitting(false)
	}

	function handleOpenChange(next: boolean) {
		if (!next) resetDialog()
		onOpenChange(next)
	}

	async function handleSubmit() {
		if (!selectedSet) return

		setIsSubmitting(true)

		try {
			for (const order of selectedSet.orders) {
				if (order.type === "lab") {
					await createLabOrder.mutateAsync({
						facilityId,
						encounterId,
						...order.payload,
					})
					continue
				}

				await createImagingOrder.mutateAsync({
					facilityId,
					encounterId,
					...order.payload,
				})
			}

			handleOpenChange(false)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl lg:max-w-4xl">
				<DialogHeader>
					<DialogTitle>Create Order Set</DialogTitle>
					<DialogDescription>
						Select a predefined order bundle to place multiple lab and imaging orders at once.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-5 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
					<div className="space-y-3">
						<p className="text-sm font-medium">Available Order Sets</p>
						<RadioGroup
							value={selectedSetId}
							onValueChange={value => setSelectedSetId(typeof value === "string" ? value : "")}
						>
							{ORDER_SETS.map(orderSet => {
								const radioId = `order-set-${orderSet.id}`
								const isSelected = orderSet.id === selectedSetId

								return (
									<Card
										key={orderSet.id}
										className={cn("gap-0 transition-colors", isSelected && "ring-primary ring-2")}
									>
										<Label htmlFor={radioId} className="flex cursor-pointer items-start gap-3 p-4">
											<RadioGroupItem
												id={radioId}
												value={orderSet.id}
												className="mt-0.5"
												disabled={isPending}
											/>
											<div className="space-y-1">
												<div className="font-medium">{orderSet.name}</div>
												<div className="text-muted-foreground text-sm">{orderSet.description}</div>
											</div>
										</Label>
									</Card>
								)
							})}
						</RadioGroup>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Preview</CardTitle>
							<CardDescription>
								{selectedSet
									? `${selectedSet.orders.length} orders will be created.`
									: "Select an order set to preview its contents."}
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2">
							{selectedSet?.orders.map((order, index) => (
								<div
									key={`${selectedSet.id}-${index}`}
									className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
								>
									<div className="flex min-w-0 items-center gap-2">
										<Badge variant={order.type === "lab" ? "secondary" : "outline"} className="shrink-0">
											{order.type === "lab" ? "Lab" : "Imaging"}
										</Badge>
										<div className="min-w-0">
											<div className="truncate font-medium">{getOrderPreviewLabel(order)}</div>
											{"panelName" in order.payload && order.payload.panelName ? (
												<div className="text-muted-foreground text-xs">
													{order.payload.panelName}
												</div>
											) : null}
											{order.payload.indicationIcd10Code ? (
												<div className="text-muted-foreground text-xs">
													{order.payload.indicationIcd10Code}
													{order.payload.indicationIcd10Display
														? ` - ${order.payload.indicationIcd10Display}`
														: ""}
												</div>
											) : null}
										</div>
									</div>
									<Badge
										variant={order.payload.priority === "stat" ? "destructive" : "outline"}
										className="w-fit shrink-0"
									>
										{order.payload.priority ?? "routine"}
									</Badge>
								</div>
							))}
						</CardContent>
					</Card>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
						Cancel
					</Button>
					<Button disabled={!selectedSet || isPending} onClick={handleSubmit}>
						{isPending ? "Signing Order Set..." : "Sign Order Set"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
