"use client"

import { useState } from "react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { EncounterContextBar } from "@/features/billing/components/encounter-context-bar"
import { useGenerateEsoaMutation, useSoaQuery } from "../api/esoa.hooks"

type EsoaFormat = "pdf" | "xml"

interface StatementPreviewPageProps {
	encounterId: string
	facilityId: string
	patientId: string
}

export function StatementPreviewPage({ encounterId, facilityId: _facilityId, patientId: _patientId }: StatementPreviewPageProps) {
	const [format, setFormat] = useState<EsoaFormat>("pdf")
	const { data: soa, isLoading: soaLoading, isError: soaError } = useSoaQuery(encounterId)
	const { mutate: generateEsoa, isPending, data: esoaData } = useGenerateEsoaMutation()

	function handleGenerate() {
		generateEsoa({ encounterId, format })
	}

	return (
		<div className="space-y-4">
			<EncounterContextBar />

			<div className="px-4 space-y-4 max-w-2xl">
				<h1 className="text-lg font-semibold print:hidden">Statement Preview</h1>

				{soaLoading && (
					<div className="space-y-2">
						<Skeleton className="h-6 w-1/2" />
						<Skeleton className="h-32 w-full" />
					</div>
				)}

				{!soaLoading && soaError && (
					<Alert variant="destructive">
						<AlertDescription>Failed to load Statement of Account. Please refresh the page.</AlertDescription>
					</Alert>
				)}

				{!soaLoading && !soaError && !soa && (
					<Alert>
						<AlertDescription>No Statement of Account generated yet. Generate an SOA from the eSOA page first.</AlertDescription>
					</Alert>
				)}

				{/* A4 print layout */}
				{soa && (
					<div className="print:block" style={{ pageBreakInside: "avoid" }}>
						<style>{`
							@media print {
								@page { size: A4; margin: 1cm; }
								body > *:not(.print-area) { display: none !important; }
								.no-print { display: none !important; }
							}
						`}</style>
						<Card className="print:border-0 print:shadow-none">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm">SOA #{soa.soaNumber}</CardTitle>
							</CardHeader>
							<CardContent className="text-sm space-y-1">
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
									<span className="tabular-nums">₱{soa.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
								</div>
								<div className="flex justify-between text-muted-foreground">
									<span>PhilHealth Deduction</span>
									<span className="tabular-nums">- ₱{soa.philhealthDeduction.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
								</div>
								<div className="flex justify-between font-semibold border-t pt-1">
									<span>Net Amount Due</span>
									<span className="tabular-nums">₱{soa.netAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				<div className="space-y-2 no-print">
					<p className="text-sm font-medium">Format</p>
					<div className="flex gap-2">
						<Button
							variant={format === "pdf" ? "default" : "outline"}
							size="sm"
							onClick={() => setFormat("pdf")}
						>
							PDF
						</Button>
						<Button
							variant={format === "xml" ? "default" : "outline"}
							size="sm"
							onClick={() => setFormat("xml")}
						>
							XML
						</Button>
					</div>
				</div>

				<Button onClick={handleGenerate} disabled={isPending}>
					{isPending ? "Generating..." : "Generate Preview"}
				</Button>

				{esoaData && (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Download</CardTitle>
						</CardHeader>
						<CardContent className="flex gap-3">
							<a
								href={`data:${esoaData.contentType};base64,${esoaData.data}`}
								download={esoaData.fileName}
								className="text-sm underline text-primary"
							>
								Download {esoaData.format.toUpperCase()}
							</a>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	)
}
