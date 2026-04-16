"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { TableCell, TableRow } from "@/core/components/ui/table"
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
}: OrderGroupRowProps) {
	const [expanded, setExpanded] = useState(false)
	const hasChildren = tranches.length > 0

	return (
		<>
			{/* Parent row */}
			<TableRow className="hover:bg-muted/50">
				<TableCell>
					<div className="flex items-center gap-1">
						{hasChildren && (
							<button
								type="button"
								aria-label={expanded ? "Collapse tranches" : "Expand tranches"}
								className="rounded p-0.5 hover:bg-muted"
								onClick={() => setExpanded((v) => !v)}
							>
								{expanded ? (
									<ChevronDown className="size-3.5" />
								) : (
									<ChevronRight className="size-3.5" />
								)}
							</button>
						)}
						<div>
							<div className="font-bold">{parent.genericName}</div>
							{parent.brandName && (
								<div className="text-muted-foreground text-xs">
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
				<TableCell>
					{parent.dose} {parent.doseUnit}
				</TableCell>
				<TableCell>{parent.route}</TableCell>
				<TableCell>{parent.frequency}</TableCell>
				<TableCell>
					{parent.durationDays != null ? `${parent.durationDays}d` : "—"}
				</TableCell>
				<TableCell>{parent.isPrn ? "Yes" : "No"}</TableCell>
				<TableCell>
					<Badge variant={statusBadge(parent.status)}>
						{parent.status.replace(/_/g, " ")}
					</Badge>
				</TableCell>
				<TableCell>{parent.orderingStaffName ?? "—"}</TableCell>
				<TableCell>{formatDate(parent.createdAt)}</TableCell>
				<TableCell className="text-right">
					<div className="flex justify-end gap-1">
						{parent.status === "active" && onDiscontinue && (
							<Button
								variant="outline"
								size="sm"
								disabled={discontinuePending}
								onClick={() => onDiscontinue(parent.id)}
							>
								Discontinue
							</Button>
						)}
						{(parent.status === "active" || parent.status === "verified") &&
							onGenerateRx && (
								<Button
									variant="outline"
									size="sm"
									disabled={createRxPending}
									onClick={() => onGenerateRx(parent.id)}
								>
									Generate Rx
								</Button>
							)}
					</div>
				</TableCell>
			</TableRow>

			{/* Child tranche rows */}
			{hasChildren &&
				expanded &&
				tranches.map((tranche) => (
					<TableRow
						key={tranche.id}
						className={cn("bg-muted/30 hover:bg-muted/50")}
					>
						<TableCell className="pl-10">
							<div className="text-muted-foreground text-sm">
								<span className="font-medium text-foreground">
									Tranche #{tranche.pdeaTrancheNumber}
								</span>{" "}
								of {tranche.pdeaTrancheTotal}
							</div>
						</TableCell>
						<TableCell className="text-sm">
							{tranche.dose} {tranche.doseUnit}
						</TableCell>
						<TableCell className="text-sm">{tranche.route}</TableCell>
						<TableCell className="text-sm">{tranche.frequency}</TableCell>
						<TableCell className="text-sm">
							{tranche.durationDays != null ? `${tranche.durationDays}d` : "—"}
						</TableCell>
						<TableCell className="text-sm">{tranche.isPrn ? "Yes" : "No"}</TableCell>
						<TableCell>
							<Badge variant={statusBadge(tranche.status)} className="text-xs">
								{tranche.status.replace(/_/g, " ")}
							</Badge>
						</TableCell>
						<TableCell className="text-sm">
							{tranche.orderingStaffName ?? "—"}
						</TableCell>
						<TableCell className="text-sm">{formatDate(tranche.createdAt)}</TableCell>
						<TableCell />
					</TableRow>
				))}
		</>
	)
}
