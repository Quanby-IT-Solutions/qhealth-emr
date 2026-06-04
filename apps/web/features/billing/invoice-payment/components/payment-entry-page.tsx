"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"

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
import { MoneyInput } from "@/features/billing/components/money-input"

import { useInvoicesQuery, useRecordPaymentMutation } from "../api/invoices.hooks"
import { computeChange, paymentMethodLabel } from "../lib/invoice-utils"

type PaymentMethod = "cash" | "card" | "gcash" | "hmo" | "malasakit" | "philhealth" | "coe"
const PAYMENT_METHODS: PaymentMethod[] = [
	"cash",
	"card",
	"gcash",
	"hmo",
	"malasakit",
	"philhealth",
	"coe",
]

interface PaymentEntryPageProps {
	encounterId: string
	facilityId: string
}

export function PaymentEntryPage({ encounterId, facilityId }: PaymentEntryPageProps) {
	const router = useRouter()
	const [method, setMethod] = useState<PaymentMethod>("cash")
	const [amountTendered, setAmountTendered] = useState(0)
	const [reference, setReference] = useState("")

	// HMO-specific fields
	const [hmoProvider, setHmoProvider] = useState("")
	const [hmoClaimNumber, setHmoClaimNumber] = useState("")
	const [hmoCoveredAmount, setHmoCoveredAmount] = useState(0)
	const [hmoPercentage, setHmoPercentage] = useState<number | "">("")

	const { data: invoicesData } = useInvoicesQuery(encounterId, facilityId)
	const { mutate: recordPayment, isPending } = useRecordPaymentMutation()

	const invoice = invoicesData?.invoices?.[0] ?? null
	const grossTotal = Number(invoice?.totalAmount ?? invoice?.subtotal ?? 0)
	const hmoDeduction = method === "hmo" ? hmoCoveredAmount : 0
	const patientResponsibility = Math.max(0, grossTotal - hmoDeduction)
	const change = computeChange(amountTendered, patientResponsibility)
	const isCash = method === "cash"
	const isHmo = method === "hmo"
	const canPay = (() => {
		if (!invoice) return false
		if (isHmo) return hmoProvider.trim().length > 0
		if (isCash) return amountTendered >= patientResponsibility
		return true
	})()

	const handleMethodChange = (m: PaymentMethod) => {
		setMethod(m)
		setHmoProvider("")
		setHmoClaimNumber("")
		setHmoCoveredAmount(0)
		setHmoPercentage("")
		setReference("")
	}

	const handleHmoPercentageChange = (pct: string) => {
		const n = parseFloat(pct)
		if (!Number.isNaN(n) && n >= 0 && n <= 100) {
			setHmoPercentage(n)
			setHmoCoveredAmount(Math.round(((grossTotal * n) / 100) * 100) / 100)
		} else if (pct === "") {
			setHmoPercentage("")
			setHmoCoveredAmount(0)
		}
	}

	const handleSubmit = useCallback(() => {
		if (!invoice) return
		const payAmount = isCash ? amountTendered : patientResponsibility
		recordPayment(
			{
				facilityId,
				invoiceId: invoice.id,
				amount: payAmount,
				paymentMethod: method,
				referenceNumber: reference || undefined,
				paymentDate: new Date().toISOString().split("T")[0]!,
				...(isHmo && {
					hmoProvider: hmoProvider || undefined,
					hmoClaimNumber: hmoClaimNumber || undefined,
					hmoPercentageCovered: hmoPercentage !== "" ? String(hmoPercentage) : undefined,
				}),
			},
			{
				onSuccess: () => {
					router.push(`/billing/encounters/${encounterId}/invoice/receipt`)
				},
			}
		)
	}, [
		invoice,
		facilityId,
		method,
		amountTendered,
		patientResponsibility,
		reference,
		hmoProvider,
		hmoClaimNumber,
		hmoPercentage,
		isHmo,
		isCash,
		recordPayment,
		encounterId,
		router,
	])

	return (
		<div className="space-y-4">
			<EncounterContextBar />

			<div className="max-w-lg space-y-4 px-4">
				<h1 className="text-lg font-semibold">Record Payment</h1>

				{invoice && (
					<Card>
						<CardContent className="space-y-1.5 pt-4">
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Gross Total</span>
								<span className="tabular-nums">
									₱{grossTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
								</span>
							</div>
							{isHmo && hmoDeduction > 0 && (
								<div className="flex justify-between text-sm text-green-700">
									<span>HMO Coverage</span>
									<span className="tabular-nums">
										-₱{hmoDeduction.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
									</span>
								</div>
							)}
							<Separator />
							<div className="flex justify-between text-sm font-semibold">
								<span>Patient Responsibility</span>
								<span className="tabular-nums">
									₱{patientResponsibility.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
								</span>
							</div>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Payment Method</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Select value={method} onValueChange={v => handleMethodChange(v as PaymentMethod)}>
							<SelectTrigger aria-label="Payment method">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PAYMENT_METHODS.map(m => (
									<SelectItem key={m} value={m}>
										{paymentMethodLabel(m)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{isCash && (
							<div className="space-y-2">
								<Label htmlFor="tendered">Amount Tendered</Label>
								<MoneyInput
									id="tendered"
									value={amountTendered}
									onChange={setAmountTendered}
									aria-label="Amount tendered"
								/>
								{amountTendered > 0 && (
									<p className="text-muted-foreground text-sm">
										Change: ₱{change.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
									</p>
								)}
								{amountTendered > 0 && amountTendered < patientResponsibility && (
									<Alert variant="destructive">
										<AlertDescription>Amount tendered is less than the total due.</AlertDescription>
									</Alert>
								)}
							</div>
						)}

						{isHmo && (
							<div className="bg-muted/30 space-y-3 rounded-md border p-3">
								<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									HMO Details
								</p>

								<div className="space-y-1.5">
									<Label htmlFor="hmo-provider">
										Provider Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id="hmo-provider"
										value={hmoProvider}
										onChange={e => setHmoProvider(e.target.value)}
										placeholder="e.g. Maxicare, PhilCare, MedCard"
										aria-label="HMO provider name"
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="hmo-claim">Claim / Approval Number</Label>
									<Input
										id="hmo-claim"
										value={hmoClaimNumber}
										onChange={e => setHmoClaimNumber(e.target.value)}
										placeholder="LOA or approval code"
										aria-label="HMO claim number"
									/>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-1.5">
										<Label htmlFor="hmo-pct">Coverage %</Label>
										<Input
											id="hmo-pct"
											type="number"
											min={0}
											max={100}
											step={0.01}
											value={hmoPercentage}
											onChange={e => handleHmoPercentageChange(e.target.value)}
											placeholder="e.g. 80"
											aria-label="HMO coverage percentage"
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="hmo-covered">Covered Amount (₱)</Label>
										<MoneyInput
											id="hmo-covered"
											value={hmoCoveredAmount}
											onChange={setHmoCoveredAmount}
											aria-label="HMO covered amount"
										/>
									</div>
								</div>
							</div>
						)}

						{!isCash && !isHmo && (
							<div className="space-y-2">
								<Label htmlFor="ref">Reference Number</Label>
								<Input
									id="ref"
									value={reference}
									onChange={e => setReference(e.target.value)}
									placeholder="Auth code, claim number, etc."
									aria-label="Reference number"
								/>
							</div>
						)}
					</CardContent>
				</Card>

				<Button
					onClick={handleSubmit}
					disabled={!canPay || isPending || !invoice}
					className="w-full"
				>
					{isPending ? "Processing..." : "Confirm Payment"}
				</Button>
			</div>
		</div>
	)
}
