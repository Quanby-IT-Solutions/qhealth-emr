"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import {
	useCreateIoEntryMutation,
	useIoBalanceQuery,
	useIoEntriesQuery,
} from "@/features/nursing/api/nursing.hooks"

function formatDateTime(dateStr: string | null | undefined) {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

interface IoTrackingProps {
	encounterId: string
	facilityId: string
	readOnly?: boolean
}

export function IoTracking({ encounterId, facilityId, readOnly }: IoTrackingProps) {
	const [createOpen, setCreateOpen] = useState(false)

	const ioEntries = useIoEntriesQuery({ encounterId, facilityId })
	const ioBalance = useIoBalanceQuery({ encounterId, facilityId })
	const createIo = useCreateIoEntryMutation()

	function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const fd = new FormData(e.currentTarget)
		createIo.mutate(
			{
				facilityId,
				encounterId,
				ioType: fd.get("ioType") as "intake" | "output",
				route: fd.get("route") as string,
				description: (fd.get("description") as string) || undefined,
				amountMl: Number(fd.get("amountMl")),
			},
			{
				onSuccess: () => {
					setCreateOpen(false)
					;(e.target as HTMLFormElement).reset()
				},
			}
		)
	}

	const balance = ioBalance.data
	const intakeTotal = balance?.totalIntake ?? 0
	const outputTotal = balance?.totalOutput ?? 0
	const net = balance?.netBalance ?? 0

	return (
		<div className="space-y-4">
			{/* Balance summary */}
			<div className="grid grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-sm font-medium">
							Total Intake
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-green-600">{intakeTotal} mL</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-sm font-medium">
							Total Output
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-red-600">{outputTotal} mL</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-muted-foreground text-sm font-medium">Net Balance</CardTitle>
					</CardHeader>
					<CardContent>
						<p className={`text-2xl font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
							{net >= 0 ? "+" : ""}
							{net} mL
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Record entry dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Record Intake / Output</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreate} className="grid gap-3">
						<div>
							<Label htmlFor="ioType">Type</Label>
							<select
								id="ioType"
								name="ioType"
								className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
								required
							>
								<option value="intake">Intake</option>
								<option value="output">Output</option>
							</select>
						</div>
						<div>
							<Label htmlFor="route">Route</Label>
							<Input id="route" name="route" placeholder="e.g. IV, PO, Foley, NG" required />
						</div>
						<div>
							<Label htmlFor="amountMl">Amount (mL)</Label>
							<Input id="amountMl" name="amountMl" type="number" min="0" step="1" required />
						</div>
						<div>
							<Label htmlFor="description">Description</Label>
							<Input id="description" name="description" placeholder="Optional" />
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={createIo.isPending}>
								{createIo.isPending ? "Saving…" : "Record"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Entries table */}
			<div className="flex items-center justify-between">
				<h3 className="font-semibold">Entries</h3>
				{!readOnly && (
					<Button size="sm" onClick={() => setCreateOpen(true)}>
						Record I/O
					</Button>
				)}
			</div>

			{ioEntries.isLoading ? (
				<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
			) : !ioEntries.data?.data?.length ? (
				<div className="text-muted-foreground py-8 text-center text-sm">No I/O entries yet.</div>
			) : (
				<div className="overflow-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Time</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Route</TableHead>
								<TableHead>Amount (mL)</TableHead>
								<TableHead>Description</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{ioEntries.data.data.map(io => (
								<TableRow key={io.id}>
									<TableCell className="whitespace-nowrap">
										{formatDateTime(io.recordedAt)}
									</TableCell>
									<TableCell>
										<Badge variant={io.ioType === "intake" ? "default" : "secondary"}>
											{io.ioType}
										</Badge>
									</TableCell>
									<TableCell>{io.route}</TableCell>
									<TableCell>{io.amountMl}</TableCell>
									<TableCell className="max-w-[200px] truncate">{io.description ?? "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	)
}
