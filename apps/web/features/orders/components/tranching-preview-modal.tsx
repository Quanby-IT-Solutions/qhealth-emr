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
const MAX_TOTAL_DAYS = 90

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
	const normalizedFrequency = frequency.toLowerCase()
	if (normalizedFrequency.includes("q4h") || normalizedFrequency === "6x/day") return 6
	if (
		normalizedFrequency.includes("q6h") ||
		normalizedFrequency === "4x/day" ||
		normalizedFrequency === "qid"
	) {
		return 4
	}
	if (
		normalizedFrequency.includes("q8h") ||
		normalizedFrequency === "3x/day" ||
		normalizedFrequency === "tid"
	) {
		return 3
	}
	if (
		normalizedFrequency.includes("q12h") ||
		normalizedFrequency === "bid" ||
		normalizedFrequency === "2x/day"
	) {
		return 2
	}
	if (
		normalizedFrequency.includes("once") ||
		normalizedFrequency === "qd" ||
		normalizedFrequency === "od" ||
		normalizedFrequency === "1x/day"
	) {
		return 1
	}

	return 1
}

function buildTranches(durationDays: number, frequency: string, startDate: Date): TrancheRow[] {
	const totalTranches = Math.ceil(durationDays / TRANCHE_DAYS)
	const dosesPerDay = frequencyToDosesPerDay(frequency)
	const rows: TrancheRow[] = []

	for (let index = 0; index < totalTranches; index++) {
		const trancheStartDate = addDays(startDate, index * TRANCHE_DAYS)
		const trancheDurationDays = Math.min(TRANCHE_DAYS, durationDays - index * TRANCHE_DAYS)
		const trancheEndDate = addDays(trancheStartDate, trancheDurationDays - 1)
		const isLastTranche = index === totalTranches - 1
		const nextTrancheStartDate = isLastTranche ? null : addDays(trancheStartDate, TRANCHE_DAYS)

		rows.push({
			trancheNumber: index + 1,
			startDate: trancheStartDate,
			endDate: trancheEndDate,
			quantity: estimateQuantity(dosesPerDay, trancheDurationDays),
			noRefill: true,
			dispensingInstructions: !nextTrancheStartDate
				? "No Refill. Final tranche for this treatment course."
				: `No Refill. Next tranche dispense date: ${format(nextTrancheStartDate, "MMM d, yyyy")}.`,
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
	const exceedsMaxDays = durationDays > MAX_TOTAL_DAYS

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-4xl lg:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Controlled Substance Tranche Preview</DialogTitle>
					<DialogDescription className="max-w-3xl">
						The prescription for{" "}
						<span className="font-medium">
							{drugName} {dose} {doseUnit}
						</span>{" "}
						spans {durationDays} days and requires{" "}
						<span className="font-medium">{tranches.length} tranches</span> of up to {TRANCHE_DAYS}{" "}
						days each under PDEA controlled-substance rules.
					</DialogDescription>
				</DialogHeader>

				<div className="overflow-hidden rounded-md border">
					<Table className="table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead className="w-[12%] px-3">Tranche</TableHead>
								<TableHead className="w-[15%] px-3">Start Date</TableHead>
								<TableHead className="w-[15%] px-3">End Date</TableHead>
								<TableHead className="w-[14%] px-3">Quantity</TableHead>
								<TableHead className="w-[12%] px-3 text-center">No Refill</TableHead>
								<TableHead className="w-[32%] px-3">Dispensing Instructions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tranches.map(row => (
								<TableRow key={row.trancheNumber}>
									<TableCell className="px-3 font-medium">#{row.trancheNumber}</TableCell>
									<TableCell className="px-3">{format(row.startDate, "MMM d, yyyy")}</TableCell>
									<TableCell className="px-3">{format(row.endDate, "MMM d, yyyy")}</TableCell>
									<TableCell className="px-3">{row.quantity}</TableCell>
									<TableCell className="px-3 text-center">
										<span className="text-destructive font-semibold">YES</span>
									</TableCell>
									<TableCell className="text-muted-foreground whitespace-normal px-3 text-xs leading-relaxed">
										{row.dispensingInstructions}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				<p className="text-muted-foreground text-xs">
					Temporal dispensing note: Each tranche corresponds to a maximum 30-day supply. Each
					prescription must carry a No Refill inscription, and the pharmacist may not dispense the
					next tranche before the earliest dispensing date shown above.
				</p>
				{exceedsMaxDays && (
					<p className="text-destructive text-xs font-medium">
						PDEA controlled substance courses cannot exceed {MAX_TOTAL_DAYS} days.
					</p>
				)}

				<DialogFooter className="gap-2 sm:justify-end">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Back to Form
					</Button>
					<Button disabled={exceedsMaxDays} onClick={() => onConfirm(tranches)}>
						Confirm &amp; Submit Order
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
