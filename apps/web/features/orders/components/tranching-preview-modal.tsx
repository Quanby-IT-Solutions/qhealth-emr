"use client"

import { addDays, format } from "date-fns"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

const TRANCHE_DAYS = 30

export interface TrancheRow {
	trancheNumber: number
	startDate: Date
	endDate: Date
	quantity: string
	noRefill: boolean
	dispensingInstructions: string
}

interface TranchingPreviewModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: (tranches: TrancheRow[]) => void
	drugName: string
	dose: string
	doseUnit: string
	frequency: string
	durationDays: number
	startDate?: Date
}

function estimateQuantity(doseTimePerDay: number, days: number): string {
	return `${doseTimePerDay * days} unit(s)`
}

function frequencyToDosesPerDay(frequency: string): number {
	const f = frequency.toLowerCase()
	if (f.includes("q4h") || f === "6x/day") return 6
	if (f.includes("q6h") || f === "4x/day" || f === "qid") return 4
	if (f.includes("q8h") || f === "3x/day" || f === "tid") return 3
	if (f.includes("q12h") || f === "bid" || f === "2x/day") return 2
	if (f.includes("once") || f === "qd" || f === "od" || f === "1x/day") return 1
	return 1
}

function buildTranches(durationDays: number, frequency: string, startDate: Date): TrancheRow[] {
	const total = Math.ceil(durationDays / TRANCHE_DAYS)
	const dosesPerDay = frequencyToDosesPerDay(frequency)
	const rows: TrancheRow[] = []

	for (let i = 0; i < total; i++) {
		const start = addDays(startDate, i * TRANCHE_DAYS)
		const daysInTranche = Math.min(TRANCHE_DAYS, durationDays - i * TRANCHE_DAYS)
		const end = addDays(start, daysInTranche - 1)
		const isLast = i === total - 1

		rows.push({
			trancheNumber: i + 1,
			startDate: start,
			endDate: end,
			quantity: estimateQuantity(dosesPerDay, daysInTranche),
			noRefill: isLast,
			dispensingInstructions: isLast
				? "No further refills. Last authorized supply."
				: `Refill authorized on or after ${format(addDays(start, daysInTranche - 3), "MMM d, yyyy")}.`,
		})
	}

	return rows
}

export function TranchingPreviewModal({
	open,
	onOpenChange,
	onConfirm,
	drugName,
	dose,
	doseUnit,
	frequency,
	durationDays,
	startDate = new Date(),
}: TranchingPreviewModalProps) {
	const tranches = buildTranches(durationDays, frequency, startDate)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>90-Day Tranche Preview</DialogTitle>
					<DialogDescription>
						The prescription for{" "}
						<span className="font-medium">
							{drugName} {dose} {doseUnit}
						</span>{" "}
						spans {durationDays} days and must be dispensed in{" "}
						<span className="font-medium">{tranches.length} tranches</span> of up to{" "}
						{TRANCHE_DAYS} days each, as required by PDEA regulations for controlled
						substances.
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-20">Tranche</TableHead>
								<TableHead>Start Date</TableHead>
								<TableHead>End Date</TableHead>
								<TableHead>Quantity</TableHead>
								<TableHead className="w-24 text-center">No Refill</TableHead>
								<TableHead>Dispensing Instructions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tranches.map((row) => (
								<TableRow key={row.trancheNumber}>
									<TableCell className="font-medium">
										#{row.trancheNumber}
									</TableCell>
									<TableCell>
										{format(row.startDate, "MMM d, yyyy")}
									</TableCell>
									<TableCell>
										{format(row.endDate, "MMM d, yyyy")}
									</TableCell>
									<TableCell>{row.quantity}</TableCell>
									<TableCell className="text-center">
										{row.noRefill ? (
											<span className="font-semibold text-destructive">
												YES
											</span>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell className="text-xs text-muted-foreground">
										{row.dispensingInstructions}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				<p className="text-xs text-muted-foreground">
					Temporal dispensing note: Each tranche corresponds to a maximum 30-day supply.
					The prescriber must issue a separate S-2 prescription for each tranche. The
					pharmacist may not dispense the next tranche before the earliest dispensing
					date shown above.
				</p>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Back to Form
					</Button>
					<Button onClick={() => onConfirm(tranches)}>
						Confirm &amp; Submit Order
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
