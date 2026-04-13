"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { Textarea } from "@/core/components/ui/textarea"

import {
	useAdministerMarMutation,
	useAdministerTarMutation,
	useCreateHandoffMutation,
	useCreateHaiTagMutation,
	useCreateIoEntryMutation,
	useCreateTarEntryMutation,
	useCreateVitalMutation,
	useFinalizeHandoffMutation,
	useFlowsheetsQuery,
	useGenerateHandoffMutation,
	useHaiTagsQuery,
	useHandoffsQuery,
	useIoBalanceQuery,
	useIoEntriesQuery,
	useMarEntriesQuery,
	useTarEntriesQuery,
	useUpdateHaiTagMutation,
	useVitalsQuery,
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

function newsRiskBadge(level: "low" | "medium" | "high" | null) {
	if (!level) return <Badge variant="outline">—</Badge>
	const variants = { low: "secondary", medium: "default", high: "destructive" } as const
	return <Badge variant={variants[level]}>{level.toUpperCase()}</Badge>
}

// ============================================================================
// Props
// ============================================================================

interface NursingTabProps {
	encounterId: string
	facilityId: string
	patientId: string
}

export function NursingTab({ encounterId, facilityId }: NursingTabProps) {
	return (
		<Tabs defaultValue="vitals">
			<TabsList variant="line">
				<TabsTrigger value="vitals">Vitals</TabsTrigger>
				<TabsTrigger value="mar">MAR</TabsTrigger>
				<TabsTrigger value="tar">TAR</TabsTrigger>
				<TabsTrigger value="io">I/O</TabsTrigger>
				<TabsTrigger value="flowsheets">Flowsheets</TabsTrigger>
				<TabsTrigger value="handoff">Handoff</TabsTrigger>
				<TabsTrigger value="hai">HAI Tags</TabsTrigger>
			</TabsList>

			<TabsContent value="vitals">
				<VitalsPanel encounterId={encounterId} facilityId={facilityId} />
			</TabsContent>
			<TabsContent value="mar">
				<MarPanel encounterId={encounterId} facilityId={facilityId} />
			</TabsContent>
			<TabsContent value="tar">
				<TarPanel encounterId={encounterId} facilityId={facilityId} />
			</TabsContent>
			<TabsContent value="io">
				<IoPanel encounterId={encounterId} facilityId={facilityId} />
			</TabsContent>
			<TabsContent value="flowsheets">
				<FlowsheetsPanel encounterId={encounterId} facilityId={facilityId} />
			</TabsContent>
			<TabsContent value="handoff">
				<HandoffPanel encounterId={encounterId} facilityId={facilityId} />
			</TabsContent>
			<TabsContent value="hai">
				<HaiPanel encounterId={encounterId} facilityId={facilityId} />
			</TabsContent>
		</Tabs>
	)
}

// ============================================================================
// Vitals Panel
// ============================================================================

function VitalsPanel({ encounterId, facilityId }: { encounterId: string; facilityId: string }) {
	const [createOpen, setCreateOpen] = useState(false)
	const vitals = useVitalsQuery({ encounterId, facilityId })
	const createVital = useCreateVitalMutation()

	function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const fd = new FormData(e.currentTarget)
		createVital.mutate(
			{
				facilityId,
				encounterId,
				temperature: fd.get("temperature") ? Number(fd.get("temperature")) : undefined,
				bpSystolic: fd.get("bpSystolic") ? Number(fd.get("bpSystolic")) : undefined,
				bpDiastolic: fd.get("bpDiastolic") ? Number(fd.get("bpDiastolic")) : undefined,
				heartRate: fd.get("heartRate") ? Number(fd.get("heartRate")) : undefined,
				respiratoryRate: fd.get("respiratoryRate") ? Number(fd.get("respiratoryRate")) : undefined,
				spo2: fd.get("spo2") ? Number(fd.get("spo2")) : undefined,
				painScore: fd.get("painScore") ? Number(fd.get("painScore")) : undefined,
			},
			{ onSuccess: () => setCreateOpen(false) }
		)
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Vital Signs</CardTitle>
				<Button size="sm" onClick={() => setCreateOpen(true)}>Record Vitals</Button>
				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Record Vital Signs</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
							<div>
								<Label htmlFor="temperature">Temperature (°C)</Label>
								<Input id="temperature" name="temperature" type="number" step="0.1" />
							</div>
							<div>
								<Label htmlFor="bpSystolic">BP Systolic</Label>
								<Input id="bpSystolic" name="bpSystolic" type="number" />
							</div>
							<div>
								<Label htmlFor="bpDiastolic">BP Diastolic</Label>
								<Input id="bpDiastolic" name="bpDiastolic" type="number" />
							</div>
							<div>
								<Label htmlFor="heartRate">Heart Rate</Label>
								<Input id="heartRate" name="heartRate" type="number" />
							</div>
							<div>
								<Label htmlFor="respiratoryRate">Resp Rate</Label>
								<Input id="respiratoryRate" name="respiratoryRate" type="number" />
							</div>
							<div>
								<Label htmlFor="spo2">SpO₂ (%)</Label>
								<Input id="spo2" name="spo2" type="number" step="0.1" />
							</div>
							<div>
								<Label htmlFor="painScore">Pain (0–10)</Label>
								<Input id="painScore" name="painScore" type="number" min="0" max="10" />
							</div>
							<div className="col-span-2 flex justify-end pt-2">
								<Button type="submit" disabled={createVital.isPending}>
									{createVital.isPending ? "Saving…" : "Save Vitals"}
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			</CardHeader>
			<CardContent className="p-0">
				{vitals.isLoading ? (
					<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
				) : !vitals.data?.data?.length ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						No vital signs recorded yet.
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Recorded</TableHead>
								<TableHead>Temp</TableHead>
								<TableHead>BP</TableHead>
								<TableHead>HR</TableHead>
								<TableHead>RR</TableHead>
								<TableHead>SpO₂</TableHead>
								<TableHead>Pain</TableHead>
								<TableHead>NEWS</TableHead>
								<TableHead>Risk</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{vitals.data.data.map(v => (
								<TableRow key={v.id}>
									<TableCell>{formatDateTime(v.recordedAt)}</TableCell>
									<TableCell>{v.temperature ?? "—"}</TableCell>
									<TableCell>
										{v.bpSystolic != null && v.bpDiastolic != null
											? `${v.bpSystolic}/${v.bpDiastolic}`
											: "—"}
									</TableCell>
									<TableCell>{v.heartRate ?? "—"}</TableCell>
									<TableCell>{v.respiratoryRate ?? "—"}</TableCell>
									<TableCell>{v.spo2 ?? "—"}</TableCell>
									<TableCell>{v.painScore ?? "—"}</TableCell>
									<TableCell>{v.newsScore ?? "—"}</TableCell>
									<TableCell>{newsRiskBadge(v.newsRiskLevel)}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// MAR Panel
// ============================================================================

function MarPanel({ encounterId, facilityId }: { encounterId: string; facilityId: string }) {
	const marEntries = useMarEntriesQuery({ encounterId, facilityId })
	const administerMar = useAdministerMarMutation()

	function markGiven(id: string) {
		administerMar.mutate({ id, status: "given" })
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Medication Administration Record</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{marEntries.isLoading ? (
					<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
				) : !marEntries.data?.data?.length ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						No MAR entries yet.
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Scheduled</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Dose</TableHead>
								<TableHead>Route</TableHead>
								<TableHead>Administered</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{marEntries.data.data.map(m => (
								<TableRow key={m.id}>
									<TableCell>{formatDateTime(m.scheduledTime)}</TableCell>
									<TableCell>
										<Badge
											variant={
												m.status === "given"
													? "default"
													: m.status === "due"
														? "secondary"
														: "destructive"
											}
										>
											{m.status}
										</Badge>
									</TableCell>
									<TableCell>{m.administeredDose ?? "—"}</TableCell>
									<TableCell>{m.administeredRoute ?? "—"}</TableCell>
									<TableCell>{formatDateTime(m.administeredAt)}</TableCell>
									<TableCell className="max-w-[200px] truncate">{m.notes ?? "—"}</TableCell>
									<TableCell>
										{m.status === "due" && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => markGiven(m.id)}
												disabled={administerMar.isPending}
											>
												Give
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// TAR Panel
// ============================================================================

function TarPanel({ encounterId, facilityId }: { encounterId: string; facilityId: string }) {
	const [createOpen, setCreateOpen] = useState(false)
	const tarEntries = useTarEntriesQuery({ encounterId, facilityId })
	const createTar = useCreateTarEntryMutation()
	const administerTar = useAdministerTarMutation()

	function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const fd = new FormData(e.currentTarget)
		createTar.mutate(
			{
				facilityId,
				encounterId,
				treatmentDescription: fd.get("treatmentDescription") as string,
				scheduledTime: new Date(fd.get("scheduledTime") as string).toISOString(),
			},
			{ onSuccess: () => setCreateOpen(false) }
		)
	}

	function markGiven(id: string) {
		administerTar.mutate({ id, status: "given" })
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Treatment Administration Record</CardTitle>
				<Button size="sm" onClick={() => setCreateOpen(true)}>Add Treatment</Button>
				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create TAR Entry</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleCreate} className="grid gap-3">
							<div>
								<Label htmlFor="treatmentDescription">Treatment Description</Label>
								<Textarea id="treatmentDescription" name="treatmentDescription" required />
							</div>
							<div>
								<Label htmlFor="scheduledTime">Scheduled Time</Label>
								<Input id="scheduledTime" name="scheduledTime" type="datetime-local" required />
							</div>
							<div className="flex justify-end pt-2">
								<Button type="submit" disabled={createTar.isPending}>
									{createTar.isPending ? "Saving…" : "Create"}
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			</CardHeader>
			<CardContent className="p-0">
				{tarEntries.isLoading ? (
					<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
				) : !tarEntries.data?.data?.length ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						No TAR entries yet.
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Treatment</TableHead>
								<TableHead>Scheduled</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Administered</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tarEntries.data.data.map(t => (
								<TableRow key={t.id}>
									<TableCell className="max-w-[200px] truncate">
										{t.treatmentDescription}
									</TableCell>
									<TableCell>{formatDateTime(t.scheduledTime)}</TableCell>
									<TableCell>
										<Badge
											variant={
												t.status === "given"
													? "default"
													: t.status === "due"
														? "secondary"
														: "destructive"
											}
										>
											{t.status}
										</Badge>
									</TableCell>
									<TableCell>{formatDateTime(t.administeredAt)}</TableCell>
									<TableCell className="max-w-[200px] truncate">{t.notes ?? "—"}</TableCell>
									<TableCell>
										{t.status === "due" && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => markGiven(t.id)}
												disabled={administerTar.isPending}
											>
												Complete
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// I/O Panel
// ============================================================================

function IoPanel({ encounterId, facilityId }: { encounterId: string; facilityId: string }) {
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
			{ onSuccess: () => setCreateOpen(false) }
		)
	}

	return (
		<div className="space-y-4">
			{/* Balance Summary */}
			{ioBalance.data && (
				<Card>
					<CardHeader>
						<CardTitle>24-Hour Fluid Balance</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-3 gap-4 text-center">
							<div>
								<div className="text-muted-foreground text-sm">Total Intake</div>
								<div className="text-2xl font-bold text-green-600">
									{ioBalance.data.totalIntake} mL
								</div>
							</div>
							<div>
								<div className="text-muted-foreground text-sm">Total Output</div>
								<div className="text-2xl font-bold text-red-600">
									{ioBalance.data.totalOutput} mL
								</div>
							</div>
							<div>
								<div className="text-muted-foreground text-sm">Net Balance</div>
								<div
									className={`text-2xl font-bold ${ioBalance.data.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}
								>
									{ioBalance.data.netBalance >= 0 ? "+" : ""}
									{ioBalance.data.netBalance} mL
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Entries Table */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Intake / Output Entries</CardTitle>
					<Button size="sm" onClick={() => setCreateOpen(true)}>Record I/O</Button>
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
									<Input id="route" name="route" placeholder="e.g. IV, PO, Foley" required />
								</div>
								<div>
									<Label htmlFor="amountMl">Amount (mL)</Label>
									<Input id="amountMl" name="amountMl" type="number" min="0" required />
								</div>
								<div>
									<Label htmlFor="description">Description</Label>
									<Input id="description" name="description" placeholder="Optional" />
								</div>
								<div className="flex justify-end pt-2">
									<Button type="submit" disabled={createIo.isPending}>
										{createIo.isPending ? "Saving…" : "Record"}
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				</CardHeader>
				<CardContent className="p-0">
					{ioEntries.isLoading ? (
						<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
					) : !ioEntries.data?.data?.length ? (
						<div className="text-muted-foreground py-8 text-center text-sm">
							No I/O entries yet.
						</div>
					) : (
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
										<TableCell>{formatDateTime(io.recordedAt)}</TableCell>
										<TableCell>
											<Badge variant={io.ioType === "intake" ? "default" : "secondary"}>
												{io.ioType}
											</Badge>
										</TableCell>
										<TableCell>{io.route}</TableCell>
										<TableCell>{io.amountMl}</TableCell>
										<TableCell>{io.description ?? "—"}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

// ============================================================================
// Flowsheets Panel
// ============================================================================

function FlowsheetsPanel({ encounterId, facilityId }: { encounterId: string; facilityId: string }) {
	const flowsheets = useFlowsheetsQuery({ encounterId, facilityId })

	return (
		<Card>
			<CardHeader>
				<CardTitle>Flowsheet Entries</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{flowsheets.isLoading ? (
					<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
				) : !flowsheets.data?.data?.length ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						No flowsheet entries yet.
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Parameter</TableHead>
								<TableHead>Value</TableHead>
								<TableHead>Unit</TableHead>
								<TableHead>Recorded</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{flowsheets.data.data.map(f => (
								<TableRow key={f.id}>
									<TableCell>{f.parameterName}</TableCell>
									<TableCell>{f.parameterValue}</TableCell>
									<TableCell>{f.unit ?? "—"}</TableCell>
									<TableCell>{formatDateTime(f.recordedAt)}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// Shift Handoff Panel
// ============================================================================

function HandoffPanel({ encounterId, facilityId }: { encounterId: string; facilityId: string }) {
	const [createOpen, setCreateOpen] = useState(false)
	const handoffs = useHandoffsQuery({ encounterId, facilityId })
	const generateHandoff = useGenerateHandoffMutation()
	const createHandoff = useCreateHandoffMutation()
	const finalizeHandoff = useFinalizeHandoffMutation()

	function handleGenerate() {
		generateHandoff.mutate({ encounterId, facilityId })
	}

	function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const fd = new FormData(e.currentTarget)
		createHandoff.mutate(
			{
				facilityId,
				encounterId,
				handoffNotes: (fd.get("handoffNotes") as string) || undefined,
				incomingStaffId: (fd.get("incomingStaffId") as string) || undefined,
			},
			{ onSuccess: () => setCreateOpen(false) }
		)
	}

	return (
		<div className="space-y-4">
			{/* Generated Summary */}
			{generateHandoff.data && (
				<Card>
					<CardHeader>
						<CardTitle>Generated Handoff Summary</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div>
							<span className="font-medium">Active Problems: </span>
							{generateHandoff.data.activeProblems.length > 0
								? generateHandoff.data.activeProblems
										.map(p => p.description)
										.join(", ")
								: "None"}
						</div>
						<div>
							<span className="font-medium">Current Medications: </span>
							{generateHandoff.data.currentMedications.length > 0
								? generateHandoff.data.currentMedications
										.map(m => `${m.genericName} ${m.dose} ${m.frequency}`)
										.join("; ")
								: "None"}
						</div>
						<div>
							<span className="font-medium">NEWS Score: </span>
							{generateHandoff.data.newsScore ?? "N/A"}{" "}
							{generateHandoff.data.newsRiskLevel &&
								newsRiskBadge(generateHandoff.data.newsRiskLevel)}
						</div>
						{generateHandoff.data.ioBalance && (
							<div>
								<span className="font-medium">24hr Balance: </span>
								Intake {generateHandoff.data.ioBalance.totalIntake} mL | Output{" "}
								{generateHandoff.data.ioBalance.totalOutput} mL | Net{" "}
								{generateHandoff.data.ioBalance.netBalance} mL
							</div>
						)}
						<div>
							<span className="font-medium">Pending Orders: </span>
							{generateHandoff.data.pendingOrders}
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Shift Handoffs</CardTitle>
					<div className="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={handleGenerate}
							disabled={generateHandoff.isPending}
						>
							{generateHandoff.isPending ? "Generating…" : "Generate Summary"}
						</Button>
						<Button size="sm" onClick={() => setCreateOpen(true)}>New Handoff</Button>
						<Dialog open={createOpen} onOpenChange={setCreateOpen}>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Create Shift Handoff</DialogTitle>
								</DialogHeader>
								<form onSubmit={handleCreate} className="grid gap-3">
									<div>
										<Label htmlFor="handoffNotes">Handoff Notes</Label>
										<Textarea id="handoffNotes" name="handoffNotes" rows={4} />
									</div>
									<div>
										<Label htmlFor="incomingStaffId">Incoming Staff ID (optional)</Label>
										<Input id="incomingStaffId" name="incomingStaffId" />
									</div>
									<div className="flex justify-end pt-2">
										<Button type="submit" disabled={createHandoff.isPending}>
											{createHandoff.isPending ? "Saving…" : "Create"}
										</Button>
									</div>
								</form>
							</DialogContent>
						</Dialog>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{handoffs.isLoading ? (
						<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
					) : !handoffs.data?.data?.length ? (
						<div className="text-muted-foreground py-8 text-center text-sm">
							No handoff reports yet.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Created</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Notes</TableHead>
									<TableHead>Signed</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{handoffs.data.data.map(h => (
									<TableRow key={h.id}>
										<TableCell>{formatDateTime(h.createdAt)}</TableCell>
										<TableCell>
											<Badge variant={h.status === "signed" ? "default" : "secondary"}>
												{h.status}
											</Badge>
										</TableCell>
										<TableCell className="max-w-[300px] truncate">
											{h.handoffNotes || "—"}
										</TableCell>
										<TableCell>{formatDateTime(h.signedAt)}</TableCell>
										<TableCell>
											{h.status === "draft" && (
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														finalizeHandoff.mutate({ id: h.id })
													}
													disabled={finalizeHandoff.isPending}
												>
													Sign
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

// ============================================================================
// HAI Tags Panel
// ============================================================================

function HaiPanel({ encounterId, facilityId }: { encounterId: string; facilityId: string }) {
	const [createOpen, setCreateOpen] = useState(false)
	const haiTags = useHaiTagsQuery({ encounterId, facilityId })
	const createHai = useCreateHaiTagMutation()
	const updateHai = useUpdateHaiTagMutation()

	function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const fd = new FormData(e.currentTarget)
		createHai.mutate(
			{
				facilityId,
				encounterId,
				haiType: fd.get("haiType") as "clabsi" | "cauti" | "vap" | "ssi" | "cdiff",
				onsetDate: fd.get("onsetDate") as string,
				notes: (fd.get("notes") as string) || undefined,
			},
			{ onSuccess: () => setCreateOpen(false) }
		)
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Healthcare-Associated Infections</CardTitle>
				<Button size="sm" onClick={() => setCreateOpen(true)}>Report HAI</Button>
				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Report Healthcare-Associated Infection</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleCreate} className="grid gap-3">
							<div>
								<Label htmlFor="haiType">HAI Type</Label>
								<select
									id="haiType"
									name="haiType"
									className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
									required
								>
									<option value="clabsi">CLABSI</option>
									<option value="cauti">CAUTI</option>
									<option value="vap">VAP</option>
									<option value="ssi">SSI</option>
									<option value="cdiff">C. diff</option>
								</select>
							</div>
							<div>
								<Label htmlFor="onsetDate">Onset Date</Label>
								<Input id="onsetDate" name="onsetDate" type="date" required />
							</div>
							<div>
								<Label htmlFor="notes">Notes</Label>
								<Textarea id="notes" name="notes" />
							</div>
							<div className="flex justify-end pt-2">
								<Button type="submit" disabled={createHai.isPending}>
									{createHai.isPending ? "Saving…" : "Report"}
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			</CardHeader>
			<CardContent className="p-0">
				{haiTags.isLoading ? (
					<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
				) : !haiTags.data?.data?.length ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						No HAI tags recorded.
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Type</TableHead>
								<TableHead>Onset</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Confirmed</TableHead>
								<TableHead>Resolved</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{haiTags.data.data.map(h => (
								<TableRow key={h.id}>
									<TableCell className="uppercase">{h.haiType}</TableCell>
									<TableCell>{h.onsetDate}</TableCell>
									<TableCell>
										<Badge
											variant={
												h.status === "resolved"
													? "secondary"
													: h.status === "confirmed"
														? "destructive"
														: "outline"
											}
										>
											{h.status}
										</Badge>
									</TableCell>
									<TableCell>{formatDateTime(h.confirmedAt)}</TableCell>
									<TableCell>{formatDateTime(h.resolvedAt)}</TableCell>
									<TableCell className="max-w-[200px] truncate">{h.notes ?? "—"}</TableCell>
									<TableCell>
										<div className="flex gap-1">
											{h.status === "suspected" && (
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														updateHai.mutate({ id: h.id, status: "confirmed" })
													}
													disabled={updateHai.isPending}
												>
													Confirm
												</Button>
											)}
											{h.status !== "resolved" && (
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														updateHai.mutate({ id: h.id, status: "resolved" })
													}
													disabled={updateHai.isPending}
												>
													Resolve
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	)
}
