"use client"

import { useState } from "react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
import { EncounterContextBar } from "@/features/billing/components/encounter-context-bar"
import { useInvoiceQuery } from "@/features/billing/invoice-payment/api/invoices.hooks"

import {
	useGenerateEsoaFromInvoiceMutation,
	useGenerateEsoaMutation,
	useGenerateSoaMutation,
	useListEsoaStatementsQuery,
	useSendEsoaMutation,
	useSoaQuery,
} from "../api/esoa.hooks"
import { DeliveryActivityPanel } from "./delivery-activity-panel"

type DeliveryChannel = "patient_portal" | "email" | "print"
const CHANNELS: { value: DeliveryChannel; label: string }[] = [
	{ value: "patient_portal", label: "Patient Portal" },
	{ value: "email", label: "Email" },
	{ value: "print", label: "Print" },
]

interface EsoaPageProps {
	encounterId: string
	facilityId: string
	patientId: string
	invoiceId?: string
}

export function EsoaPage({ encounterId, facilityId, patientId, invoiceId }: EsoaPageProps) {
	const [sendChannel, setSendChannel] = useState<DeliveryChannel>("patient_portal")
	const [sendRecipient, setSendRecipient] = useState("")
	const [selectedEsoaId, setSelectedEsoaId] = useState<string | null>(null)

	const { data: soa, isLoading } = useSoaQuery(encounterId)
	const { mutate: generateSoa, isPending: isGeneratingSoa } = useGenerateSoaMutation()
	const { mutate: generateEsoa, isPending: isGeneratingEsoa } = useGenerateEsoaMutation()
	const { mutate: generateEsoaFromInvoice, isPending: isGeneratingFromInvoice } =
		useGenerateEsoaFromInvoiceMutation()

	const { data: esoaStatements, isLoading: statementsLoading } = useListEsoaStatementsQuery(
		invoiceId ?? ""
	)
	const { data: invoiceData } = useInvoiceQuery(invoiceId ?? "")

	const invoiceTotal = Number(invoiceData?.totalAmount ?? 0)
	const soaNet = soa ? Number(soa.netAmount) : 0
	const totalsDrift = !!invoiceData && !!soa && Math.abs(invoiceTotal - soaNet) > 0.01
	const { mutate: sendEsoa, isPending: isSending } = useSendEsoaMutation()

	const statements = esoaStatements?.statements ?? []
	const latestStatement = statements[0] ?? null
	const activeEsoaId = selectedEsoaId ?? latestStatement?.id ?? null

	const deliveryRecords = statements
		.filter(
			(s: {
				id: string
				sentAt: Date | string | null
				sentVia: string | null
				sentToRecipient: string | null
				deliveryStatus: string | null
			}) => !!s.sentAt
		)
		.map(
			(s: {
				id: string
				sentAt: Date | string | null
				sentVia: string | null
				sentToRecipient: string | null
				deliveryStatus: string | null
				version: number
			}) => ({
				id: s.id,
				channel: s.sentVia ?? "unknown",
				recipient: s.sentToRecipient ?? null,
				status: s.deliveryStatus ?? "sent",
				sentAt: s.sentAt,
			})
		)

	function handleGenerateSoa() {
		generateSoa({ facilityId, encounterId, patientId })
	}

	function handleGenerateEsoa() {
		generateEsoa({ encounterId, format: "pdf" })
	}

	function handleGenerateFromInvoice() {
		if (!invoiceId) return
		generateEsoaFromInvoice(
			{ invoiceId },
			{
				onSuccess: result => {
					setSelectedEsoaId(result.id)
				},
			}
		)
	}

	function handleSend() {
		if (!activeEsoaId) return
		sendEsoa({
			id: activeEsoaId,
			channel: sendChannel,
			recipient: sendRecipient || undefined,
		})
	}

	return (
		<div className="space-y-4">
			<EncounterContextBar
				esoaVersion={latestStatement?.version ?? undefined}
				esoaGeneratedAt={latestStatement?.generatedAt ?? undefined}
			/>

			<div className="max-w-2xl space-y-4 px-4">
				<h1 className="text-lg font-semibold">Electronic Statement of Account</h1>

				{isLoading && <p className="text-muted-foreground text-sm">Loading SOA...</p>}

				{!isLoading && !soa && (
					<Card>
						<CardContent className="space-y-3 pt-4">
							<p className="text-muted-foreground text-sm">
								No Statement of Account generated yet.
							</p>
							<Button onClick={handleGenerateSoa} disabled={isGeneratingSoa}>
								{isGeneratingSoa ? "Generating SOA..." : "Generate SOA"}
							</Button>
						</CardContent>
					</Card>
				)}

				{soa && (
					<>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm">SOA Summary</CardTitle>
							</CardHeader>
							<CardContent className="space-y-1 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">SOA Number</span>
									<span className="font-mono">{soa.soaNumber}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Patient</span>
									<span>{soa.patientName}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">MRN</span>
									<span className="font-mono">{soa.patientMrn}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Subtotal</span>
									<span className="tabular-nums">
										â‚±{soa.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
									</span>
								</div>
								<div className="text-muted-foreground flex justify-between">
									<span>PhilHealth Deduction</span>
									<span className="tabular-nums">
										- â‚±
										{soa.philhealthDeduction.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
									</span>
								</div>
								<div className="flex justify-between border-t pt-1 font-semibold">
									<span>Net Amount</span>
									<span className="tabular-nums">
										â‚±{soa.netAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
									</span>
								</div>
							</CardContent>
						</Card>

						{totalsDrift && (
							<Alert variant="destructive">
								<AlertDescription>
									SOA net amount (₱{soaNet.toLocaleString("en-PH", { minimumFractionDigits: 2 })})
									does not match invoice total (₱
									{invoiceTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}). Regenerate
									the invoice before generating eSOA.
								</AlertDescription>
							</Alert>
						)}

						<div className="flex flex-wrap gap-2">
							<Button
								onClick={handleGenerateEsoa}
								disabled={isGeneratingEsoa || totalsDrift}
								variant="outline"
							>
								{isGeneratingEsoa ? "Generating eSOA..." : "Generate eSOA (XML/PDF)"}
							</Button>
							{invoiceId && (
								<Button
									onClick={handleGenerateFromInvoice}
									disabled={isGeneratingFromInvoice || totalsDrift}
									variant="outline"
								>
									{isGeneratingFromInvoice ? "Generating..." : "Generate from Invoice"}
								</Button>
							)}
						</div>

						{/* Send-via section */}
						{statements.length > 0 && (
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm">Send eSOA</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{statements.length > 1 && (
										<div className="space-y-1.5">
											<Label htmlFor="esoa-version" className="text-xs">
												Version
											</Label>
											<Select value={activeEsoaId ?? ""} onValueChange={v => setSelectedEsoaId(v)}>
												<SelectTrigger id="esoa-version" className="h-8 text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{statements.map(
														(s: {
															id: string
															version: number
															generatedAt: Date | string | null
														}) => (
															<SelectItem key={s.id} value={s.id} className="text-xs">
																v{s.version} â€”{" "}
																{s.generatedAt
																	? new Date(s.generatedAt).toLocaleDateString("en-PH")
																	: "pending"}
															</SelectItem>
														)
													)}
												</SelectContent>
											</Select>
										</div>
									)}

									<div className="space-y-1.5">
										<Label htmlFor="send-channel" className="text-xs">
											Delivery Channel
										</Label>
										<Select
											value={sendChannel}
											onValueChange={v => setSendChannel(v as DeliveryChannel)}
										>
											<SelectTrigger id="send-channel" className="h-8 text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{CHANNELS.map(c => (
													<SelectItem key={c.value} value={c.value} className="text-xs">
														{c.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{sendChannel === "email" && (
										<div className="space-y-1.5">
											<Label htmlFor="send-recipient" className="text-xs">
												Email Address
											</Label>
											<Input
												id="send-recipient"
												value={sendRecipient}
												onChange={e => setSendRecipient(e.target.value)}
												placeholder="recipient@example.com"
												className="h-8 text-xs"
											/>
										</div>
									)}

									<Button onClick={handleSend} disabled={!activeEsoaId || isSending} size="sm">
										{isSending ? "Sending..." : "Send eSOA"}
									</Button>
								</CardContent>
							</Card>
						)}

						{/* Delivery activity panel */}
						{invoiceId && (
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm">Delivery Activity</CardTitle>
								</CardHeader>
								<CardContent>
									<DeliveryActivityPanel records={deliveryRecords} isLoading={statementsLoading} />
								</CardContent>
							</Card>
						)}

						{!invoiceId && !statementsLoading && <Separator />}
					</>
				)}
			</div>
		</div>
	)
}
