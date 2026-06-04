"use client"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"

interface GatePass {
	id: string
	encounterId: string
	patientName: string
	wardName: string
	bedNumber: string
	admissionDatetime: string
	dischargeDatetime: string
	lengthOfStayDays: number
	disposition: "home" | "transfer" | "deceased" | "ama"
	deathClassification: "gross" | "net" | null
	qrCodePayload: string
	issuedAt: string
}

const DISPOSITION_LABELS: Record<string, string> = {
	home: "Discharged to Home",
	transfer: "Transferred",
	deceased: "Deceased",
	ama: "Against Medical Advice",
}

function formatDatetime(value: string) {
	return new Date(value).toLocaleString("en-PH", {
		month: "long",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export function GatePassCard({ gatePass }: { gatePass: GatePass }) {
	const admitMs = new Date(gatePass.admissionDatetime).getTime()
	const dischargeMs = new Date(gatePass.dischargeDatetime).getTime()
	const losMs = dischargeMs - admitMs
	const losDays = Math.floor(losMs / 86_400_000)
	const losHours = Math.floor((losMs % 86_400_000) / 3_600_000)
	const losLabel =
		losDays > 0
			? losHours > 0
				? `${losDays} day${losDays !== 1 ? "s" : ""}, ${losHours} hour${losHours !== 1 ? "s" : ""}`
				: `${losDays} day${losDays !== 1 ? "s" : ""}`
			: `${losHours} hour${losHours !== 1 ? "s" : ""}`

	return (
		<div className="space-y-4">
			<Card className="gate-pass-print max-w-lg">
				<CardHeader className="space-y-1">
					<CardTitle className="text-center text-lg">GATE PASS</CardTitle>
					<p className="text-muted-foreground text-center text-xs">
						Patient Discharge Authorization
					</p>
				</CardHeader>

				<CardContent className="space-y-4">
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Patient Name</span>
							<span className="font-semibold">{gatePass.patientName}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Ward</span>
							<span className="font-medium">{gatePass.wardName}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Bed</span>
							<span className="font-medium">{gatePass.bedNumber}</span>
						</div>
					</div>

					<Separator />

					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Admission</span>
							<span>{formatDatetime(gatePass.admissionDatetime)}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Discharge</span>
							<span>{formatDatetime(gatePass.dischargeDatetime)}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Length of Stay</span>
							<span className="font-medium">{losLabel}</span>
						</div>
					</div>

					<Separator />

					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Disposition</span>
						<Badge variant={gatePass.disposition === "deceased" ? "destructive" : "default"}>
							{DISPOSITION_LABELS[gatePass.disposition] ?? gatePass.disposition}
						</Badge>
					</div>

					{gatePass.deathClassification && (
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Death Classification</span>
							<Badge variant="destructive">
								{gatePass.deathClassification === "gross"
									? "Gross Death Rate (≤48h)"
									: "Net Death Rate (>48h)"}
							</Badge>
						</div>
					)}

					<Separator />

					{/* QR code placeholder — encodes qrCodePayload */}
					<div className="flex flex-col items-center gap-2 py-2">
						<div className="border-muted flex size-32 items-center justify-center rounded border-2 border-dashed">
							<p className="text-muted-foreground px-2 text-center text-xs">
								QR: {gatePass.id.slice(0, 8)}…
							</p>
						</div>
						<p className="text-muted-foreground text-xs">
							Issued: {formatDatetime(gatePass.issuedAt)}
						</p>
					</div>
				</CardContent>

				<CardFooter className="no-print">
					<Button variant="outline" className="w-full" onClick={() => window.print()}>
						Print Gate Pass
					</Button>
				</CardFooter>
			</Card>

			<style
				dangerouslySetInnerHTML={{
					__html: `@media print{body>*:not(.gate-pass-print){display:none!important}.no-print{display:none!important}.gate-pass-print{box-shadow:none;border:1px solid #ccc}}`,
				}}
			/>
		</div>
	)
}
