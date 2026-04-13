"use client"

import { useState } from "react"

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
	useChargesQuery,
	useChargeMasterQuery,
	useCreateChargeMutation,
	useUpdateChargeMutation,
	useDeleteChargeMutation,
	useInvoicesQuery,
	useInvoiceQuery,
	useGenerateInvoiceMutation,
	useFinalizeInvoiceMutation,
	usePaymentsQuery,
	useRecordPaymentMutation,
	useGenerateCf4Mutation,
	useFinalizeCf4Mutation,
	useCheckEligibilityMutation,
	useBillingStatusQuery,
} from "@/features/billing/api/billing.hooks"

interface BillingTabProps {
	encounterId: string
	facilityId: string
	patientId: string
}

export function BillingTab({ encounterId, facilityId, patientId }: BillingTabProps) {
	return (
		<Tabs defaultValue="charges">
			<TabsList variant="line">
				<TabsTrigger value="charges">Charges</TabsTrigger>
				<TabsTrigger value="invoices">Invoices</TabsTrigger>
				<TabsTrigger value="cf4">CF4</TabsTrigger>
				<TabsTrigger value="eligibility">Eligibility</TabsTrigger>
			</TabsList>

			<TabsContent value="charges">
				<ChargesPanel encounterId={encounterId} facilityId={facilityId} />
			</TabsContent>

			<TabsContent value="invoices">
				<InvoicesPanel encounterId={encounterId} facilityId={facilityId} patientId={patientId} />
			</TabsContent>

			<TabsContent value="cf4">
				<Cf4Panel encounterId={encounterId} facilityId={facilityId} patientId={patientId} />
			</TabsContent>

			<TabsContent value="eligibility">
				<EligibilityPanel facilityId={facilityId} patientId={patientId} />
			</TabsContent>
		</Tabs>
	)
}

// ============================================================================
// Charges Panel — Flow 9.1
// ============================================================================

function ChargesPanel({ encounterId, facilityId }: { encounterId: string; facilityId: string }) {
	const [addOpen, setAddOpen] = useState(false)
	const [search, setSearch] = useState("")
	const [selectedItem, setSelectedItem] = useState<{ id: string; description: string; unitPrice: string } | null>(null)
	const [quantity, setQuantity] = useState("1")
	const [manualDesc, setManualDesc] = useState("")
	const [manualPrice, setManualPrice] = useState("")

	const chargesQuery = useChargesQuery({ facilityId, encounterId })
	const chargeMasterQuery = useChargeMasterQuery({ facilityId, search, isActive: true, limit: 20 })
	const createCharge = useCreateChargeMutation()
	const updateCharge = useUpdateChargeMutation()
	const deleteCharge = useDeleteChargeMutation()

	const chargeList = chargesQuery.data?.charges ?? []

	const totalCharges = chargeList.reduce((sum, c) => sum + Number(c.totalAmount), 0)

	function handleAddCharge() {
		if (selectedItem) {
			createCharge.mutate({
				facilityId,
				encounterId,
				chargeMasterItemId: selectedItem.id,
				description: selectedItem.description,
				quantity: Number(quantity),
				unitPrice: Number(selectedItem.unitPrice),
			}, { onSuccess: () => { setAddOpen(false); resetForm() } })
		} else if (manualDesc && manualPrice) {
			createCharge.mutate({
				facilityId,
				encounterId,
				description: manualDesc,
				quantity: Number(quantity),
				unitPrice: Number(manualPrice),
			}, { onSuccess: () => { setAddOpen(false); resetForm() } })
		}
	}

	function resetForm() {
		setSelectedItem(null)
		setQuantity("1")
		setManualDesc("")
		setManualPrice("")
		setSearch("")
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>Charges</CardTitle>
					<p className="text-sm text-muted-foreground mt-1">
						Total: ₱{totalCharges.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
					</p>
				</div>
				<Button size="sm" onClick={() => setAddOpen(true)}>Add Charge</Button>
				<Dialog open={addOpen} onOpenChange={setAddOpen}>
					<DialogContent className="max-w-lg">
						<DialogHeader>
							<DialogTitle>Add Charge</DialogTitle>
							<DialogDescription>Select from charge master or add manually.</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<Label>Search Charge Master</Label>
								<Input
									value={search}
									onChange={e => { setSearch(e.target.value); setSelectedItem(null) }}
									placeholder="Search by code or description..."
								/>
								{chargeMasterQuery.data?.items && chargeMasterQuery.data.items.length > 0 && search && !selectedItem && (
									<div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
										{chargeMasterQuery.data.items.map(item => (
											<button
												key={item.id}
												className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
												onClick={() => {
													setSelectedItem({ id: item.id, description: item.description, unitPrice: item.unitPrice })
													setSearch(item.description)
												}}
											>
												<span className="font-medium">{item.itemCode}</span> — {item.description} (₱{Number(item.unitPrice).toFixed(2)})
											</button>
										))}
									</div>
								)}
							</div>
							{!selectedItem && (
								<>
									<div>
										<Label>Or Manual Description</Label>
										<Input value={manualDesc} onChange={e => setManualDesc(e.target.value)} placeholder="Service description" />
									</div>
									<div>
										<Label>Unit Price (₱)</Label>
										<Input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="0.00" />
									</div>
								</>
							)}
							<div>
								<Label>Quantity</Label>
								<Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min={1} />
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => { setAddOpen(false); resetForm() }}>Cancel</Button>
							<Button onClick={handleAddCharge} disabled={createCharge.isPending || (!selectedItem && (!manualDesc || !manualPrice))}>
								{createCharge.isPending ? "Adding..." : "Add"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</CardHeader>
			<CardContent className="p-0">
				{chargesQuery.isLoading ? (
					<p className="p-4 text-sm text-muted-foreground">Loading charges...</p>
				) : chargeList.length === 0 ? (
					<p className="p-4 text-sm text-muted-foreground">No charges found.</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Description</TableHead>
								<TableHead>Source</TableHead>
								<TableHead className="text-right">Qty</TableHead>
								<TableHead className="text-right">Unit Price</TableHead>
								<TableHead className="text-right">Total</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{chargeList.map(charge => (
								<TableRow key={charge.id}>
									<TableCell>{charge.description}</TableCell>
									<TableCell>
										<Badge variant={charge.sourceType === "manual" ? "default" : "secondary"}>
											{charge.sourceType.replace("auto_", "").replace("_", " ")}
										</Badge>
									</TableCell>
									<TableCell className="text-right">{charge.quantity}</TableCell>
									<TableCell className="text-right">₱{Number(charge.unitPrice).toFixed(2)}</TableCell>
									<TableCell className="text-right font-medium">₱{Number(charge.totalAmount).toFixed(2)}</TableCell>
									<TableCell>
										{charge.sourceType === "manual" && (
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive"
												onClick={() => deleteCharge.mutate(charge.id)}
											>
												Remove
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
// Invoices Panel — Flow 9.2 + 9.3
// ============================================================================

function InvoicesPanel({
	encounterId,
	facilityId,
	patientId,
}: {
	encounterId: string
	facilityId: string
	patientId: string
}) {
	const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
	const [payOpen, setPayOpen] = useState(false)
	const [payAmount, setPayAmount] = useState("")
	const [payMethod, setPayMethod] = useState<string>("cash")
	const [payRef, setPayRef] = useState("")
	const [payNotes, setPayNotes] = useState("")
	const [philhealthCoverage, setPhilhealthCoverage] = useState("0")

	const invoicesQuery = useInvoicesQuery({ facilityId, encounterId })
	const invoiceDetailQuery = useInvoiceQuery(selectedInvoiceId ?? "")
	const paymentsQuery = usePaymentsQuery({ facilityId, invoiceId: selectedInvoiceId ?? "" })
	const billingStatus = useBillingStatusQuery(encounterId)

	const generateInvoice = useGenerateInvoiceMutation()
	const finalizeInvoice = useFinalizeInvoiceMutation()
	const recordPayment = useRecordPaymentMutation()

	const invoiceList = invoicesQuery.data?.invoices ?? []

	function handleGenerate() {
		generateInvoice.mutate({
			facilityId,
			encounterId,
			patientId,
			philhealthCoverage: Number(philhealthCoverage),
		})
	}

	function handleRecordPayment() {
		if (!selectedInvoiceId || !payAmount) return
		recordPayment.mutate({
			facilityId,
			invoiceId: selectedInvoiceId,
			amount: Number(payAmount),
			paymentMethod: payMethod,
			referenceNumber: payRef || undefined,
			paymentDate: new Date().toISOString().split("T")[0]!,
			notes: payNotes || undefined,
		}, { onSuccess: () => { setPayOpen(false); setPayAmount(""); setPayRef(""); setPayNotes("") } })
	}

	const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
		draft: "secondary",
		finalized: "default",
		paid: "default",
		partially_paid: "outline",
	}

	return (
		<div className="space-y-4">
			{/* Generate Invoice */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Invoices</CardTitle>
					<div className="flex items-center gap-2">
						<Input
							type="number"
							className="w-40"
							placeholder="PhilHealth ₱"
							value={philhealthCoverage}
							onChange={e => setPhilhealthCoverage(e.target.value)}
						/>
						<Button
							size="sm"
							onClick={handleGenerate}
							disabled={generateInvoice.isPending || !billingStatus.data?.areChargesCaptured}
						>
							{generateInvoice.isPending ? "Generating..." : "Generate Invoice"}
						</Button>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{invoicesQuery.isLoading ? (
						<p className="p-4 text-sm text-muted-foreground">Loading invoices...</p>
					) : invoiceList.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">No invoices yet. Generate one from the charges.</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Invoice #</TableHead>
									<TableHead className="text-right">Subtotal</TableHead>
									<TableHead className="text-right">PhilHealth</TableHead>
									<TableHead className="text-right">Patient Owes</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{invoiceList.map(inv => (
									<TableRow key={inv.id} className={selectedInvoiceId === inv.id ? "bg-muted/50" : ""}>
										<TableCell>
											<button className="text-blue-600 underline text-sm" onClick={() => setSelectedInvoiceId(inv.id)}>
												{inv.invoiceNumber}
											</button>
										</TableCell>
										<TableCell className="text-right">₱{Number(inv.subtotal).toFixed(2)}</TableCell>
										<TableCell className="text-right">₱{Number(inv.philhealthCoverage).toFixed(2)}</TableCell>
										<TableCell className="text-right font-medium">₱{Number(inv.patientResponsibility).toFixed(2)}</TableCell>
										<TableCell>
											<Badge variant={statusColors[inv.status] ?? "secondary"}>{inv.status}</Badge>
										</TableCell>
										<TableCell className="flex gap-1">
											{inv.status === "draft" && (
												<Button size="sm" variant="outline" onClick={() => finalizeInvoice.mutate(inv.id)}>
													Finalize
												</Button>
											)}
											{(inv.status === "finalized" || inv.status === "partially_paid") && (
												<Button size="sm" onClick={() => { setSelectedInvoiceId(inv.id); setPayOpen(true) }}>
													Record Payment
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

			{/* Invoice Detail */}
			{selectedInvoiceId && invoiceDetailQuery.data && (
				<Card>
					<CardHeader>
						<CardTitle>Invoice Detail — {invoiceDetailQuery.data.invoiceNumber}</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						{invoiceDetailQuery.data.lineItems && invoiceDetailQuery.data.lineItems.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Description</TableHead>
										<TableHead className="text-right">Qty</TableHead>
										<TableHead className="text-right">Unit Price</TableHead>
										<TableHead className="text-right">Total</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invoiceDetailQuery.data.lineItems.map(li => (
										<TableRow key={li.id}>
											<TableCell>{li.description}</TableCell>
											<TableCell className="text-right">{li.quantity}</TableCell>
											<TableCell className="text-right">₱{Number(li.unitPrice).toFixed(2)}</TableCell>
											<TableCell className="text-right font-medium">₱{Number(li.totalAmount).toFixed(2)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<p className="p-4 text-sm text-muted-foreground">No line items.</p>
						)}
					</CardContent>
				</Card>
			)}

			{/* Payments for selected invoice */}
			{selectedInvoiceId && (paymentsQuery.data?.payments ?? []).length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Payments</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Method</TableHead>
									<TableHead>Reference</TableHead>
									<TableHead className="text-right">Amount</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(paymentsQuery.data?.payments ?? []).map(p => (
									<TableRow key={p.id}>
										<TableCell>{p.paymentDate}</TableCell>
										<TableCell>
											<Badge variant="outline">{p.paymentMethod.replace("_", " ")}</Badge>
										</TableCell>
										<TableCell>{p.referenceNumber ?? "—"}</TableCell>
										<TableCell className="text-right font-medium">₱{Number(p.amount).toFixed(2)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* Record Payment Dialog */}
			<Dialog open={payOpen} onOpenChange={setPayOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Record Payment</DialogTitle>
						<DialogDescription>Enter payment details.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Amount (₱)</Label>
							<Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
						</div>
						<div>
							<Label>Payment Method</Label>
							<Select value={payMethod} onValueChange={(v) => { if (v) setPayMethod(v) }}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="cash">Cash</SelectItem>
									<SelectItem value="philhealth">PhilHealth</SelectItem>
									<SelectItem value="hmo">HMO</SelectItem>
									<SelectItem value="credit_card">Credit Card</SelectItem>
									<SelectItem value="bank_transfer">Bank Transfer</SelectItem>
									<SelectItem value="other">Other</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Reference Number</Label>
							<Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional" />
						</div>
						<div>
							<Label>Notes</Label>
							<Textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional" />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
						<Button onClick={handleRecordPayment} disabled={recordPayment.isPending || !payAmount}>
							{recordPayment.isPending ? "Recording..." : "Record"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

// ============================================================================
// CF4 Panel — Flow 9.4
// ============================================================================

function Cf4Panel({
	encounterId,
	facilityId,
	patientId,
}: {
	encounterId: string
	facilityId: string
	patientId: string
}) {
	const [cf4Preview, setCf4Preview] = useState<{
		cf4: { id: string; status: string }
		extractedData: {
			chiefComplaint: string | null
			briefHistory: string | null
			vitalSigns: Record<string, unknown> | null
			diagnoses: { code: string; displayName: string }[]
			procedures: { rvsCode: string | null; description: string }[]
			managementPlan: string | null
		}
		missingFields: string[]
	} | null>(null)

	const generateCf4 = useGenerateCf4Mutation()
	const finalizeCf4 = useFinalizeCf4Mutation()

	function handleGenerate() {
		generateCf4.mutate({ facilityId, encounterId, patientId }, {
			onSuccess: data => setCf4Preview(data),
		})
	}

	function handleFinalize() {
		if (!cf4Preview) return
		finalizeCf4.mutate({ id: cf4Preview.cf4.id }, {
			onSuccess: () => {
				setCf4Preview(null)
			},
		})
	}

	function handleExportEclaims() {
		// Stubbed — show toast-like message (alert for simplicity)
		alert("Integration pending — eClaims export is not yet available.")
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>PhilHealth CF4</CardTitle>
				{!cf4Preview && (
					<Button size="sm" onClick={handleGenerate} disabled={generateCf4.isPending}>
						{generateCf4.isPending ? "Generating..." : "Generate CF4"}
					</Button>
				)}
			</CardHeader>
			<CardContent>
				{!cf4Preview ? (
					<p className="text-sm text-muted-foreground">Click "Generate CF4" to auto-extract clinical data for the PhilHealth claim form.</p>
				) : (
					<div className="space-y-4">
						{cf4Preview.missingFields.length > 0 && (
							<div className="rounded-md bg-red-50 border border-red-200 p-3">
								<p className="text-sm font-medium text-red-800">Missing fields:</p>
								<ul className="list-disc list-inside text-sm text-red-700 mt-1">
									{cf4Preview.missingFields.map(f => <li key={f}>{f}</li>)}
								</ul>
							</div>
						)}

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label className={!cf4Preview.extractedData.chiefComplaint ? "text-red-600" : ""}>Chief Complaint</Label>
								<p className="text-sm mt-1">{cf4Preview.extractedData.chiefComplaint ?? "—"}</p>
							</div>
							<div>
								<Label className={!cf4Preview.extractedData.briefHistory ? "text-red-600" : ""}>Brief History</Label>
								<p className="text-sm mt-1">{cf4Preview.extractedData.briefHistory ?? "—"}</p>
							</div>
							<div>
								<Label className={!cf4Preview.extractedData.vitalSigns ? "text-red-600" : ""}>Vital Signs</Label>
								{cf4Preview.extractedData.vitalSigns ? (
									<div className="text-sm mt-1 space-x-3">
										{Object.entries(cf4Preview.extractedData.vitalSigns).map(([k, v]) => (
											<span key={k}><strong>{k}:</strong> {String(v ?? "—")}</span>
										))}
									</div>
								) : <p className="text-sm mt-1">—</p>}
							</div>
							<div>
								<Label className={cf4Preview.extractedData.diagnoses.length === 0 ? "text-red-600" : ""}>Diagnoses (ICD-10)</Label>
								{cf4Preview.extractedData.diagnoses.length > 0 ? (
									<ul className="list-disc list-inside text-sm mt-1">
										{cf4Preview.extractedData.diagnoses.map((d, i) => (
											<li key={i}>{d.code} — {d.displayName}</li>
										))}
									</ul>
								) : <p className="text-sm mt-1">—</p>}
							</div>
							<div>
								<Label>Procedures</Label>
								{cf4Preview.extractedData.procedures.length > 0 ? (
									<ul className="list-disc list-inside text-sm mt-1">
										{cf4Preview.extractedData.procedures.map((p, i) => (
											<li key={i}>{p.rvsCode ? `${p.rvsCode} — ` : ""}{p.description}</li>
										))}
									</ul>
								) : <p className="text-sm mt-1">No procedures recorded.</p>}
							</div>
							<div>
								<Label className={!cf4Preview.extractedData.managementPlan ? "text-red-600" : ""}>Management Plan</Label>
								<p className="text-sm mt-1">{cf4Preview.extractedData.managementPlan ?? "—"}</p>
							</div>
						</div>

						<div className="flex gap-2 pt-2">
							<Button onClick={handleFinalize} disabled={finalizeCf4.isPending}>
								{finalizeCf4.isPending ? "Finalizing..." : "Finalize CF4"}
							</Button>
							<Button variant="outline" onClick={handleExportEclaims}>
								Export to eClaims
							</Button>
							<Button variant="ghost" onClick={() => setCf4Preview(null)}>Cancel</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// Eligibility Panel — Flow 9.5
// ============================================================================

function EligibilityPanel({
	facilityId,
	patientId,
}: {
	facilityId: string
	patientId: string
}) {
	const [memberId, setMemberId] = useState("")
	const [result, setResult] = useState<{
		isEligible: boolean
		benefitType: string | null
		remainingCoverage: number | null
		message: string
	} | null>(null)

	const checkEligibility = useCheckEligibilityMutation()

	function handleCheck() {
		if (!memberId) return
		checkEligibility.mutate({ facilityId, patientId, philhealthMemberId: memberId }, {
			onSuccess: data => setResult(data.result),
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>PhilHealth Eligibility Check (CEWS)</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4 max-w-md">
					<div>
						<Label>PhilHealth Member ID</Label>
						<Input value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="Enter member ID" />
					</div>
					<Button onClick={handleCheck} disabled={checkEligibility.isPending || !memberId}>
						{checkEligibility.isPending ? "Checking..." : "Verify Eligibility"}
					</Button>

					{result && (
						<div className={`rounded-md border p-4 ${result.isEligible ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
							<div className="flex items-center gap-2 mb-2">
								<Badge variant={result.isEligible ? "default" : "destructive"}>
									{result.isEligible ? "Eligible" : "Not Eligible"}
								</Badge>
							</div>
							<p className="text-sm">{result.message}</p>
							{result.benefitType && (
								<p className="text-sm mt-1"><strong>Benefit Type:</strong> {result.benefitType}</p>
							)}
							{result.remainingCoverage !== null && (
								<p className="text-sm mt-1"><strong>Remaining Coverage:</strong> ₱{result.remainingCoverage.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
							)}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
