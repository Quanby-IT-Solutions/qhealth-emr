"use client"

import Link from "next/link"

import { Badge } from "@/core/components/ui/badge"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"

import { formatSourceLabel, sourceOriginHref, type SourceType } from "../lib/charge-utils"

interface Charge {
	id: string
	description: string
	quantity: string
	unitPrice: string
	totalAmount: string
	sourceType: SourceType
	sourceOrderId: string | null
	createdAt: Date | string
}

interface AutoPulledTabProps {
	charges: Charge[]
	isLoading: boolean
	encounterId: string
}

export function AutoPulledTab({ charges, isLoading, encounterId }: AutoPulledTabProps) {
	const autoPulled = charges.filter(c => c.sourceType !== "manual")

	if (isLoading) {
		return (
			<div className="space-y-2 py-2">
				{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
			</div>
		)
	}

	if (autoPulled.length === 0) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">
				No auto-pulled charges yet. Charges from CPOE, MAR, and Ancillary orders appear here.
			</p>
		)
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Description</TableHead>
					<TableHead>Source</TableHead>
					<TableHead className="w-28">Date</TableHead>
					<TableHead className="w-20 text-right">Qty</TableHead>
					<TableHead className="w-32 text-right">Unit Price</TableHead>
					<TableHead className="w-32 text-right">Total</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{autoPulled.map(charge => {
					const originHref = sourceOriginHref(charge.sourceType, charge.sourceOrderId, encounterId)
					const capturedDate = new Date(charge.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
					return (
						<TableRow key={charge.id}>
							<TableCell className="text-sm">{charge.description}</TableCell>
							<TableCell>
								<div className="flex items-center gap-1.5">
									<Badge variant="outline" className="text-xs">
										{formatSourceLabel(charge.sourceType)}
									</Badge>
									{originHref && (
										<Link
											href={originHref}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs text-muted-foreground underline hover:text-foreground"
											aria-label={`View source order for ${charge.description}`}
										>
											View order
										</Link>
									)}
								</div>
							</TableCell>
							<TableCell className="text-xs text-muted-foreground tabular-nums">{capturedDate}</TableCell>
							<TableCell className="text-right tabular-nums text-sm">{Number(charge.quantity)}</TableCell>
							<TableCell className="text-right tabular-nums text-sm">
								₱{Number(charge.unitPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
							</TableCell>
							<TableCell className="text-right tabular-nums text-sm font-medium">
								₱{Number(charge.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
							</TableCell>
						</TableRow>
					)
				})}
			</TableBody>
		</Table>
	)
}
