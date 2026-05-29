"use client"

import { useState } from "react"
import { Ban, ChevronDown, ChevronRight, FileText } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { TableCell, TableRow } from "@/core/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import { cn } from "@/core/lib/utils"

interface MedOrderRow {
	id: string
	genericName: string
	brandName: string | null
	dose: string
	doseUnit: string
	doseForm: string
	route: string
	frequency: string
	durationDays: number | null
	isPrn: boolean
	isControlledSubstance: boolean
	priority?: string | null
	pdeaSchedule: string | null
	pdeaTrancheNumber: number | null
	pdeaTrancheTotal: number | null
	status: string
	orderingStaffName: string | null
	createdAt: string
}

interface OrderGroupRowProps {
	parent: MedOrderRow
	tranches?: MedOrderRow[]
	statusBadge: (status: string) => "default" | "secondary" | "outline" | "destructive"
	formatDate: (d: string | null | undefined) => string
	onDiscontinue?: (id: string) => void
	onGenerateRx?: (id: string) => void
	discontinuePending?: boolean
	createRxPending?: boolean
	prescriberHasValidLicense?: boolean
}

export function OrderGroupRow({
	parent,
	tranches = [],
	statusBadge,
	formatDate,
	onDiscontinue,
	onGenerateRx,
	discontinuePending,
	createRxPending,
	prescriberHasValidLicense = true,
}: OrderGroupRowProps) {
	const [expanded, setExpanded] = useState(false)
	const [confirmDiscontinueOpen, setConfirmDiscontinueOpen] = useState(false)
	const [confirmGenerateRxOpen, setConfirmGenerateRxOpen] = useState(false)
	const hasChildren = tranches.length > 0
	const parentTrancheLabel =
		(parent.pdeaTrancheTotal ?? 0) > 1 && parent.pdeaTrancheNumber
			? `Tranche #${parent.pdeaTrancheNumber} of ${parent.pdeaTrancheTotal}`
			: null

	function handleConfirmDiscontinue() {
		onDiscontinue?.(parent.id)
		setConfirmDiscontinueOpen(false)
	}

	function handleConfirmGenerateRx() {
		onGenerateRx?.(parent.id)
		setConfirmGenerateRxOpen(false)
	}

	return (
		<>
			{/* Parent row */}
			<TableRow>
				<TableCell className="px-4 py-3 align-top">
					<div className="flex items-center gap-1">
						{hasChildren && (
							<button
								type="button"
								aria-label={expanded ? "Collapse tranches" : "Expand tranches"}
								className="hover:bg-muted rounded p-0.5"
								onClick={() => setExpanded(v => !v)}
							>
								{expanded ? (
									<ChevronDown className="size-3.5" />
								) : (
									<ChevronRight className="size-3.5" />
								)}
							</button>
						)}
						<div className="min-w-0">
							<div className="truncate font-bold" title={parent.genericName}>
								{parent.genericName}
							</div>
							{parentTrancheLabel && (
								<div className="text-muted-foreground truncate text-xs">
									{parentTrancheLabel}
								</div>
							)}
							{parent.brandName && (
								<div className="text-muted-foreground truncate text-xs" title={parent.brandName}>
									{parent.brandName}
								</div>
							)}
							{parent.isControlledSubstance && (
								<Badge variant="outline" className="mt-0.5 text-[10px]">
									CS {parent.pdeaSchedule ?? ""}
								</Badge>
							)}
						</div>
					</div>
				</TableCell>
				<TableCell className="px-4 py-3 align-top">
					<p
						className="truncate"
						title={`${parent.dose} ${parent.doseUnit} ${parent.route} ${parent.frequency}`}
					>
						{parent.dose} {parent.doseUnit} {parent.route} {parent.frequency}
					</p>
					<p className="text-muted-foreground truncate text-xs">
						{parent.durationDays !== null ? `${parent.durationDays} days` : "No duration"}
						{parent.isPrn ? " - PRN" : ""}
					</p>
				</TableCell>
				<TableCell className="overflow-hidden px-4 py-3 align-top">
					<Badge variant={statusBadge(parent.status)} className="max-w-full truncate">
						{parent.status.replace(/_/g, " ")}
					</Badge>
				</TableCell>
				<TableCell className="overflow-hidden px-4 py-3 align-top">
					<p className="truncate" title={parent.orderingStaffName ?? undefined}>
						{parent.orderingStaffName ?? "--"}
					</p>
				</TableCell>
				<TableCell className="overflow-hidden px-4 py-3 align-top">
					<p className="truncate" title={formatDate(parent.createdAt)}>
						{formatDate(parent.createdAt)}
					</p>
				</TableCell>
				<TableCell className="px-4 py-3 text-right align-top">
					<div className="flex flex-nowrap justify-end gap-1">
						{parent.status === "active" && onDiscontinue && (
							<Button
								variant="outline"
								size="icon-sm"
								className="border-destructive/20 from-destructive/10 via-background to-destructive/15 text-destructive ring-background/80 hover:from-destructive/15 hover:to-destructive/20 hover:text-destructive bg-gradient-to-b shadow-[0_2px_0_hsl(var(--destructive)/0.22),0_6px_14px_hsl(var(--destructive)/0.12),inset_0_1px_0_hsl(var(--background)/0.9)] ring-1 ring-inset hover:shadow-[0_3px_0_hsl(var(--destructive)/0.25),0_8px_18px_hsl(var(--destructive)/0.16),inset_0_1px_0_hsl(var(--background)/0.95)] active:translate-y-px active:shadow-[0_1px_0_hsl(var(--destructive)/0.18),0_3px_8px_hsl(var(--destructive)/0.12),inset_0_2px_5px_hsl(var(--destructive)/0.14)]"
								disabled={discontinuePending}
								aria-label="Discontinue"
								title="Discontinue"
								onClick={() => setConfirmDiscontinueOpen(true)}
							>
								<Ban className="size-3.5" />
							</Button>
						)}
						{(parent.status === "active" || parent.status === "verified") && onGenerateRx && (
							<Tooltip>
								<TooltipTrigger render={<span className="inline-flex" />}>
									<Button
										variant="outline"
										size="icon-sm"
										className="border-primary/20 from-primary/10 via-background to-primary/15 text-primary ring-background/80 hover:from-primary/15 hover:to-primary/20 hover:text-primary bg-gradient-to-b shadow-[0_2px_0_hsl(var(--primary)/0.22),0_6px_14px_hsl(var(--primary)/0.12),inset_0_1px_0_hsl(var(--background)/0.9)] ring-1 ring-inset hover:shadow-[0_3px_0_hsl(var(--primary)/0.25),0_8px_18px_hsl(var(--primary)/0.16),inset_0_1px_0_hsl(var(--background)/0.95)] active:translate-y-px active:shadow-[0_1px_0_hsl(var(--primary)/0.18),0_3px_8px_hsl(var(--primary)/0.12),inset_0_2px_5px_hsl(var(--primary)/0.14)]"
										disabled={createRxPending || !prescriberHasValidLicense}
										aria-label="Generate Rx"
										title="Generate Rx"
										onClick={() => setConfirmGenerateRxOpen(true)}
									>
										<FileText className="size-3.5" />
									</Button>
								</TooltipTrigger>
								{!prescriberHasValidLicense && (
									<TooltipContent>PRC/PTR not verified or expired</TooltipContent>
								)}
							</Tooltip>
						)}
					</div>
				</TableCell>
			</TableRow>

			{/* Child tranche rows */}
			{hasChildren &&
				expanded &&
				tranches.map(tranche => (
					<TableRow key={tranche.id} className={cn("bg-muted/30")}>
						<TableCell className="py-3 pr-4 pl-10 align-top">
							<div className="text-muted-foreground text-sm">
								<span className="text-foreground font-medium">
									Tranche #{tranche.pdeaTrancheNumber}
								</span>{" "}
								of {tranche.pdeaTrancheTotal}
							</div>
						</TableCell>
						<TableCell className="px-4 py-3 align-top text-sm">
							<p className="truncate">
								{tranche.dose} {tranche.doseUnit} {tranche.route} {tranche.frequency}
							</p>
							<p className="text-muted-foreground truncate text-xs">
								{tranche.durationDays !== null ? `${tranche.durationDays} days` : "No duration"}
								{tranche.isPrn ? " - PRN" : ""}
							</p>
						</TableCell>
						<TableCell className="overflow-hidden px-4 py-3 align-top">
							<Badge variant={statusBadge(tranche.status)} className="max-w-full truncate text-xs">
								{tranche.status.replace(/_/g, " ")}
							</Badge>
						</TableCell>
						<TableCell className="px-4 py-3 align-top text-sm">
							{tranche.orderingStaffName ?? "--"}
						</TableCell>
						<TableCell className="px-4 py-3 align-top text-sm">
							<p className="truncate" title={formatDate(tranche.createdAt)}>
								{formatDate(tranche.createdAt)}
							</p>
						</TableCell>
						<TableCell />
					</TableRow>
				))}

			<Dialog open={confirmDiscontinueOpen} onOpenChange={setConfirmDiscontinueOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Discontinue medication?</DialogTitle>
						<DialogDescription>
							This will stop the active {parent.genericName} order for this encounter.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setConfirmDiscontinueOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							disabled={discontinuePending}
							onClick={handleConfirmDiscontinue}
						>
							Discontinue
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={confirmGenerateRxOpen} onOpenChange={setConfirmGenerateRxOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Generate prescription?</DialogTitle>
						<DialogDescription>
							This will create an e-Prescription draft from the {parent.genericName} medication
							order.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<Button type="button" variant="outline" onClick={() => setConfirmGenerateRxOpen(false)}>
							Cancel
						</Button>
						<Button type="button" disabled={createRxPending} onClick={handleConfirmGenerateRx}>
							Generate Rx
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
