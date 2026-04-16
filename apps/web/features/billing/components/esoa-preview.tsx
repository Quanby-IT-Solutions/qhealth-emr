"use client"

import { Loader2, Printer, Receipt, FileCheck } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"

import {
	useFinalizeSoaMutation,
	useGenerateSoaMutation,
	useSoaQuery,
} from "../api/billing.hooks"

interface EsoaPreviewProps {
	encounterId: string
	facilityId: string
	patientId: string
}

const CATEGORY_LABELS: Record<string, string> = {
	room_board: "Room & Board",
	medication: "Medications",
	laboratory: "Laboratory",
	imaging: "Imaging / Radiology",
	procedure: "Procedures",
	professional_fee: "Professional Fee",
	anesthesia: "Anesthesia",
	supplies: "Supplies & Consumables",
	other: "Other Charges",
}

function formatPeso(value: number): string {
	return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function EsoaPreview({ encounterId, facilityId, patientId }: EsoaPreviewProps) {
	const { data: soa, isLoading } = useSoaQuery(encounterId)
	const generateSoa = useGenerateSoaMutation()
	const finalizeSoa = useFinalizeSoaMutation()

	function handlePrint() {
		window.print()
	}

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex h-32 items-center justify-center">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
				</CardContent>
			</Card>
		)
	}

	if (!soa) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Receipt className="size-5" />
							Electronic Statement of Account (eSOA)
						</CardTitle>
						<p className="text-muted-foreground mt-1 text-sm">
							Generate a consolidated statement of account for the encounter.
						</p>
					</div>
					<Button
						onClick={() => generateSoa.mutate({ facilityId, encounterId, patientId })}
						disabled={generateSoa.isPending}
					>
						{generateSoa.isPending ? (
							<Loader2 className="mr-1.5 size-4 animate-spin" />
						) : (
							<Receipt className="mr-1.5 size-4" />
						)}
						Generate eSOA
					</Button>
				</CardHeader>
			</Card>
		)
	}

	// Group lines by category
	const grouped = soa.lines.reduce<Record<string, typeof soa.lines>>((acc, line) => {
		const cat = line.category
		if (!acc[cat]) acc[cat] = []
		acc[cat]!.push(line)
		return acc
	}, {})

	return (
		<Card className="print:shadow-none">
			<CardHeader className="flex flex-row items-center justify-between print:hidden">
				<div className="flex items-center gap-2">
					<CardTitle>eSOA — {soa.soaNumber}</CardTitle>
					<Badge variant={soa.status === "final" ? "default" : "secondary"}>
						{soa.status}
					</Badge>
				</div>
				<div className="flex gap-2">
					{soa.status === "draft" && (
						<Button
							variant="outline"
							onClick={() => finalizeSoa.mutate(soa.id)}
							disabled={finalizeSoa.isPending}
						>
							{finalizeSoa.isPending ? (
								<Loader2 className="mr-1.5 size-4 animate-spin" />
							) : (
								<FileCheck className="mr-1.5 size-4" />
							)}
							Finalize SOA
						</Button>
					)}
					<Button variant="outline" onClick={handlePrint}>
						<Printer className="mr-1.5 size-4" />
						Print
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-5">
				{/* Patient header */}
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div>
						<p className="text-muted-foreground">Patient</p>
						<p className="font-semibold">{soa.patientName}</p>
					</div>
					<div>
						<p className="text-muted-foreground">MRN</p>
						<p className="font-semibold">{soa.patientMrn}</p>
					</div>
					<div>
						<p className="text-muted-foreground">SOA Number</p>
						<p className="font-mono font-medium">{soa.soaNumber}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Generated</p>
						<p>{new Date(soa.generatedAt).toLocaleString("en-PH")}</p>
					</div>
				</div>

				<Separator />

				{/* Charges by category */}
				{Object.entries(grouped).map(([category, lines]) => (
					<div key={category}>
						<p className="mb-2 text-sm font-medium">
							{CATEGORY_LABELS[category] ?? category}
						</p>
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
								{lines.map((line) => (
									<TableRow key={line.id}>
										<TableCell className="text-sm">{line.description}</TableCell>
										<TableCell className="text-right text-sm">{line.quantity}</TableCell>
										<TableCell className="text-right text-sm">
											{formatPeso(line.unitPrice)}
										</TableCell>
										<TableCell className="text-right text-sm font-medium">
											{formatPeso(line.totalAmount)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				))}

				<Separator />

				{/* Totals breakdown */}
				<div className="ml-auto w-full max-w-xs space-y-2 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Subtotal</span>
						<span>{formatPeso(soa.subtotal)}</span>
					</div>
					{soa.philhealthDeduction > 0 && (
						<div className="flex justify-between text-green-700">
							<span>PhilHealth Deduction</span>
							<span>−{formatPeso(soa.philhealthDeduction)}</span>
						</div>
					)}
					{soa.seniorPwdDiscount > 0 && (
						<div className="flex justify-between text-green-700">
							<span>Senior / PWD Discount (20%)</span>
							<span>−{formatPeso(soa.seniorPwdDiscount)}</span>
						</div>
					)}
					{soa.malasakitDeduction > 0 && (
						<div className="flex justify-between text-green-700">
							<span>Malasakit Assistance</span>
							<span>−{formatPeso(soa.malasakitDeduction)}</span>
						</div>
					)}
					{soa.otherDeductions > 0 && (
						<div className="flex justify-between text-green-700">
							<span>Other Deductions</span>
							<span>−{formatPeso(soa.otherDeductions)}</span>
						</div>
					)}
					<Separator />
					<div className="flex justify-between text-base font-semibold">
						<span>Net Amount Due</span>
						<span>{formatPeso(soa.netAmount)}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
