"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useChartContext } from "@/features/encounters/context/chart-context"

function formatDateTime(dateStr: Date | string | null | undefined) {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export default function TransferHistoryPage() {
	const { encounter } = useChartContext()

	const transfers = encounter?.transfers ?? []

	return (
		<Card>
			<CardHeader>
				<CardTitle>Transfer History</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{transfers.length > 0 ? (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>From</TableHead>
								<TableHead>To</TableHead>
								<TableHead>Reason</TableHead>
								<TableHead>Ordered By</TableHead>
								<TableHead>Date</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{transfers.map(t => (
								<TableRow key={t.id}>
									<TableCell>
										{t.fromWardName ?? "—"} / {t.fromBedNumber ?? "—"}
									</TableCell>
									<TableCell>
										{t.toWardName ?? "—"} / {t.toBedNumber ?? "—"}
									</TableCell>
									<TableCell>{t.transferReason ?? "—"}</TableCell>
									<TableCell>{t.orderingStaffName ?? "—"}</TableCell>
									<TableCell>{formatDateTime(t.transferredAt)}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				) : (
					<div className="text-muted-foreground py-8 text-center text-sm">
						No transfers recorded.
					</div>
				)}
			</CardContent>
		</Card>
	)
}
