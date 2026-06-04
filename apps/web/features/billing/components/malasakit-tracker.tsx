"use client"

import { useState } from "react"
import { HandHeart, Loader2, Plus } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
import { Separator } from "@/core/components/ui/separator"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Textarea } from "@/core/components/ui/textarea"

import {
	useAddMalasakitMutation,
	useMalasakitQuery,
	useUpdateMalasakitStatusMutation,
	type MalasakitSource,
} from "../api/billing.hooks"

interface MalasakitTrackerProps {
	encounterId: string
	facilityId: string
	patientId: string
}

const SOURCE_LABELS: Record<MalasakitSource, string> = {
	doh_medisure: "DOH MediSure",
	hospital_fund: "Hospital Fund",
	lgu: "LGU / Local Government",
	pcso: "PCSO",
	dswd: "DSWD",
	private_donation: "Private Donation",
	other: "Other",
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	pending: "secondary",
	approved: "outline",
	disbursed: "default",
	denied: "destructive",
}

function formatPeso(value: number): string {
	return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function MalasakitTracker({ encounterId, facilityId, patientId }: MalasakitTrackerProps) {
	const [addOpen, setAddOpen] = useState(false)
	const [source, setSource] = useState<MalasakitSource>("hospital_fund")
	const [amount, setAmount] = useState("")
	const [purpose, setPurpose] = useState("")
	const [notes, setNotes] = useState("")

	const { data: summary, isLoading } = useMalasakitQuery({ facilityId, encounterId })
	const addMutation = useAddMalasakitMutation()
	const updateStatus = useUpdateMalasakitStatusMutation()

	function handleAdd() {
		if (!amount || !purpose) return
		addMutation.mutate(
			{
				facilityId,
				encounterId,
				patientId,
				source,
				amount: Number(amount),
				purpose,
				notes: notes || undefined,
			},
			{
				onSuccess: () => {
					setAddOpen(false)
					setAmount("")
					setPurpose("")
					setNotes("")
				},
			}
		)
	}

	function resetForm() {
		setSource("hospital_fund")
		setAmount("")
		setPurpose("")
		setNotes("")
	}

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div className="flex items-center gap-2">
						<HandHeart className="size-5" />
						<CardTitle>Malasakit Center Assistance</CardTitle>
					</div>
					<Button size="sm" onClick={() => setAddOpen(true)}>
						<Plus className="mr-1.5 size-4" />
						Add Assistance
					</Button>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoading && (
						<div className="flex h-20 items-center justify-center">
							<Loader2 className="text-muted-foreground size-5 animate-spin" />
						</div>
					)}

					{!isLoading && summary && (
						<>
							{/* Summary strip */}
							<div className="bg-muted grid grid-cols-3 gap-4 rounded-md p-4 text-sm">
								<div className="text-center">
									<p className="text-muted-foreground">Total Requested</p>
									<p className="font-semibold">{formatPeso(summary.totalRequested)}</p>
								</div>
								<div className="text-center">
									<p className="text-muted-foreground">Total Approved</p>
									<p className="font-semibold text-green-700">
										{formatPeso(summary.totalApproved)}
									</p>
								</div>
								<div className="text-center">
									<p className="text-muted-foreground">Total Disbursed</p>
									<p className="font-semibold text-blue-700">
										{formatPeso(summary.totalDisbursed)}
									</p>
								</div>
							</div>

							{summary.items.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									No Malasakit assistance recorded for this encounter.
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Source</TableHead>
											<TableHead>Purpose</TableHead>
											<TableHead className="text-right">Amount</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{summary.items.map(item => (
											<TableRow key={item.id}>
												<TableCell className="text-sm font-medium">
													{SOURCE_LABELS[item.source]}
												</TableCell>
												<TableCell className="max-w-xs text-sm">
													<p>{item.purpose}</p>
													{item.notes && (
														<p className="text-muted-foreground text-xs">{item.notes}</p>
													)}
												</TableCell>
												<TableCell className="text-right font-medium">
													{formatPeso(item.amount)}
												</TableCell>
												<TableCell>
													<Badge variant={STATUS_VARIANT[item.status] ?? "secondary"}>
														{item.status}
													</Badge>
												</TableCell>
												<TableCell>
													<div className="flex gap-1">
														{item.status === "pending" && (
															<>
																<Button
																	size="sm"
																	variant="outline"
																	className="text-green-700"
																	disabled={updateStatus.isPending}
																	onClick={() =>
																		updateStatus.mutate({
																			id: item.id,
																			status: "approved",
																		})
																	}
																>
																	Approve
																</Button>
																<Button
																	size="sm"
																	variant="ghost"
																	className="text-destructive"
																	disabled={updateStatus.isPending}
																	onClick={() =>
																		updateStatus.mutate({
																			id: item.id,
																			status: "denied",
																		})
																	}
																>
																	Deny
																</Button>
															</>
														)}
														{item.status === "approved" && (
															<Button
																size="sm"
																variant="outline"
																disabled={updateStatus.isPending}
																onClick={() =>
																	updateStatus.mutate({
																		id: item.id,
																		status: "disbursed",
																	})
																}
															>
																Mark Disbursed
															</Button>
														)}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Add Assistance Dialog */}
			<Dialog
				open={addOpen}
				onOpenChange={open => {
					setAddOpen(open)
					if (!open) resetForm()
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Add Malasakit Assistance</DialogTitle>
						<DialogDescription>
							Record a financial assistance request from a Malasakit Center source.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-1">
							<Label>Assistance Source</Label>
							<Select
								value={source}
								onValueChange={v => {
									if (v) setSource(v as MalasakitSource)
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(Object.keys(SOURCE_LABELS) as MalasakitSource[]).map(key => (
										<SelectItem key={key} value={key}>
											{SOURCE_LABELS[key]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Amount (₱)</Label>
							<Input
								type="number"
								min="0"
								step="0.01"
								value={amount}
								onChange={e => setAmount(e.target.value)}
								placeholder="0.00"
							/>
						</div>
						<div className="space-y-1">
							<Label>Purpose / Description</Label>
							<Input
								value={purpose}
								onChange={e => setPurpose(e.target.value)}
								placeholder="e.g. Partial coverage for laboratory fees"
							/>
						</div>
						<div className="space-y-1">
							<Label>Notes (optional)</Label>
							<Textarea
								rows={2}
								value={notes}
								onChange={e => setNotes(e.target.value)}
								placeholder="Additional details…"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAddOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleAdd} disabled={addMutation.isPending || !amount || !purpose}>
							{addMutation.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
							Add Assistance
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
