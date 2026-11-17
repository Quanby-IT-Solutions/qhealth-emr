"use client"

import { useState } from "react"
import { CheckCircle2, Scan, XCircle } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useBedsideVerifyMutation, type BedsideVerifyResult } from "@/features/lab/api/lab.hooks"

// ============================================================================
// Barcode Input Field (simulates barcode scanner)
// ============================================================================

function BarcodeInput({
	label,
	value,
	onChange,
	placeholder,
	verified,
}: {
	label: string
	value: string
	onChange: (v: string) => void
	placeholder: string
	verified?: boolean | null
}) {
	return (
		<div className="space-y-2">
			<Label className="flex items-center gap-1">
				<Scan className="size-3.5" />
				{label}
			</Label>
			<div className="relative">
				<Input
					value={value}
					onChange={e => onChange(e.target.value)}
					placeholder={placeholder}
					className={cn(
						"pr-8",
						verified === true &&
							"border-green-500 ring-1 ring-green-500 focus-visible:ring-green-500",
						verified === false &&
							"border-destructive ring-destructive focus-visible:ring-destructive ring-1"
					)}
				/>
				{verified === true && (
					<CheckCircle2 className="absolute top-2.5 right-2 size-4 text-green-600" />
				)}
				{verified === false && (
					<XCircle className="text-destructive absolute top-2.5 right-2 size-4" />
				)}
			</div>
		</div>
	)
}

// ============================================================================
// Verification Result Display
// ============================================================================

function VerificationResult({ result }: { result: BedsideVerifyResult }) {
	const allVerified = result.verified

	return (
		<div
			className={cn(
				"rounded-md border p-4 text-sm",
				allVerified
					? "border-green-500 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
					: "border-destructive bg-destructive/10 text-destructive dark:bg-destructive/20"
			)}
		>
			<div className="flex items-center gap-2 font-semibold">
				{allVerified ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
				{allVerified
					? "Verification Successful — Safe to Transfuse"
					: "Verification Failed — DO NOT Transfuse"}
			</div>

			<ul className="mt-2 space-y-1 pl-7 text-xs">
				<li className="flex items-center gap-1.5">
					{result.patientMatch ? (
						<CheckCircle2 className="size-3.5 text-green-600" />
					) : (
						<XCircle className="text-destructive size-3.5" />
					)}
					Patient wristband match: {result.patientMatch ? "✓" : "✗ MISMATCH"}
				</li>
				<li className="flex items-center gap-1.5">
					{result.unitMatch ? (
						<CheckCircle2 className="size-3.5 text-green-600" />
					) : (
						<XCircle className="text-destructive size-3.5" />
					)}
					Blood unit barcode match: {result.unitMatch ? "✓" : "✗ MISMATCH"}
				</li>
			</ul>

			{!allVerified && <p className="mt-2 font-medium">{result.message}</p>}
		</div>
	)
}

// ============================================================================
// Bedside Matching Component
// ============================================================================

interface BedsideMatchingProps {
	crossMatchId?: string
}

export function BedsideMatching({ crossMatchId: initialCrossMatchId }: BedsideMatchingProps) {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const hasLabEditPerm = permissions.some(
		(p: { module: string; action: string }) => p.module === "laboratory" && p.action === "edit"
	)
	const [crossMatchId, setCrossMatchId] = useState(initialCrossMatchId ?? "")
	const [unitBarcode, setUnitBarcode] = useState("")
	const [patientWristband, setPatientWristband] = useState("")
	const [verifyResult, setVerifyResult] = useState<BedsideVerifyResult | null>(null)

	const verifyMutation = useBedsideVerifyMutation()

	function handleVerify() {
		if (!crossMatchId.trim() || !unitBarcode.trim() || !patientWristband.trim()) return
		setVerifyResult(null)
		verifyMutation.mutate(
			{
				crossMatchId: crossMatchId.trim(),
				unitBarcode: unitBarcode.trim(),
				patientWristbandBarcode: patientWristband.trim(),
			},
			{
				onSuccess: data => setVerifyResult(data),
			}
		)
	}

	function handleReset() {
		setUnitBarcode("")
		setPatientWristband("")
		setVerifyResult(null)
		verifyMutation.reset()
	}

	const canVerify =
		hasLabEditPerm &&
		crossMatchId.trim() &&
		unitBarcode.trim() &&
		patientWristband.trim() &&
		!verifyMutation.isPending

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Bedside Barcode Matching</h1>
				<p className="text-muted-foreground text-sm">
					Scan patient wristband and blood unit barcode to verify before transfusion
				</p>
			</div>

			<div className="mx-auto max-w-2xl">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Scan className="size-4" />
							Two-Point Barcode Verification
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Step 1: Cross-match request ID */}
						<div className="space-y-2">
							<Label>
								Cross-Match Request ID <span className="text-destructive">*</span>
							</Label>
							<Input
								value={crossMatchId}
								onChange={e => {
									setCrossMatchId(e.target.value)
									setVerifyResult(null)
								}}
								placeholder="e.g., XM-2026-00123"
								disabled={!!initialCrossMatchId}
							/>
						</div>

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t" />
							</div>
							<div className="relative flex justify-center">
								<span className="bg-background text-muted-foreground px-2 text-xs">
									SCAN BARCODES
								</span>
							</div>
						</div>

						{/* Step 2: Patient wristband */}
						<BarcodeInput
							label="Patient Wristband Barcode"
							value={patientWristband}
							onChange={v => {
								setPatientWristband(v)
								setVerifyResult(null)
							}}
							placeholder="Scan or type wristband barcode"
							verified={verifyResult ? verifyResult.patientMatch : null}
						/>

						{/* Step 3: Blood unit */}
						<BarcodeInput
							label="Blood Unit Barcode"
							value={unitBarcode}
							onChange={v => {
								setUnitBarcode(v)
								setVerifyResult(null)
							}}
							placeholder="Scan or type blood unit barcode"
							verified={verifyResult ? verifyResult.unitMatch : null}
						/>

						{/* Verification status badge */}
						{verifyMutation.isPending && (
							<div className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-sm">
								<span className="animate-pulse">Verifying…</span>
							</div>
						)}

						{/* Result */}
						{verifyResult && <VerificationResult result={verifyResult} />}

						{/* Actions */}
						<div className="flex flex-col gap-2 pt-2 sm:flex-row">
							<Button
								variant="outline"
								className="h-10 flex-1"
								onClick={handleReset}
								disabled={verifyMutation.isPending}
							>
								Reset
							</Button>
							<Button className="h-10 flex-1" disabled={!canVerify} onClick={handleVerify}>
								<Scan className="mr-1 size-4" />
								{verifyMutation.isPending ? "Verifying…" : "Verify Match"}
							</Button>
						</div>

						{/* Transfusion confirm — only show when fully verified */}
						{verifyResult?.verified && (
							<div className="rounded-md border border-green-500 bg-green-50 p-3 dark:bg-green-950/30">
								<p className="mb-2 text-sm font-medium text-green-800 dark:text-green-300">
									Both barcodes verified. Safe to proceed with transfusion.
								</p>
								<Badge variant="default" className="bg-green-600 text-white hover:bg-green-700">
									Verified — Proceed
								</Badge>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
