"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { canAccessRoleGatedModule, NURSE_ROLE_NAMES } from "@/features/app-shell/lib/navigation"
import {
	useBedsideVerifyMutation,
	useCrossMatchListQuery,
	type BedsideVerifyResult,
} from "@/features/lab/api/lab.hooks"

function useAccessContext() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return {
		permSet: new Set(
			permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
		),
		roleName: profile?.activeRole?.name,
	}
}

type VerificationFieldProps = {
	id: string
	label: string
	value: string
	placeholder: string
	onChange: (value: string) => void
	error?: string
	maxLength?: number
	readOnly?: boolean
	verified?: boolean | null
}

function VerificationField({
	id,
	label,
	value,
	placeholder,
	onChange,
	error,
	maxLength,
	readOnly,
	verified,
}: VerificationFieldProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id} className="text-sm font-medium">
				{label}
				<span className="text-destructive">*</span>
			</Label>
			<div className="relative">
				<Input
					id={id}
					value={value}
					placeholder={placeholder}
					maxLength={maxLength}
					readOnly={readOnly}
					onChange={e => onChange(e.target.value)}
					className={cn(
						"pr-8 font-mono",
						readOnly && "bg-muted/50 text-muted-foreground",
						error && "border-destructive focus-visible:ring-destructive",
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
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	)
}

function ReadinessBadge({ ready }: { ready: boolean }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
				ready
					? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
					: "bg-muted text-muted-foreground"
			)}
		>
			{ready ? "Ready" : "Missing"}
		</span>
	)
}

function RecordStatusRow({ label, ready }: { label: string; ready: boolean }) {
	return (
		<div className="flex min-w-0 items-center justify-between gap-3">
			<span className="text-muted-foreground min-w-0 truncate">{label}</span>
			<ReadinessBadge ready={ready} />
		</div>
	)
}

function VerificationResult({ result }: { result: BedsideVerifyResult }) {
	return (
		<div
			className={cn(
				"rounded-md border p-4 text-sm",
				result.verified
					? "border-green-500 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
					: "border-destructive bg-destructive/10 text-destructive dark:bg-destructive/20"
			)}
		>
			<div className="flex items-center gap-2 font-semibold">
				{result.verified ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
				{result.verified ? "Verification successful" : "Verification failed"}
			</div>
			<div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
				<div className="flex items-center gap-2">
					{result.patientMatch ? (
						<CheckCircle2 className="size-4 text-green-600" />
					) : (
						<XCircle className="text-destructive size-4" />
					)}
					Patient wristband {result.patientMatch ? "matched" : "mismatched"}
				</div>
				<div className="flex items-center gap-2">
					{result.unitMatch ? (
						<CheckCircle2 className="size-4 text-green-600" />
					) : (
						<XCircle className="text-destructive size-4" />
					)}
					Blood unit {result.unitMatch ? "matched" : "mismatched"}
				</div>
			</div>
			<p className="mt-3 text-xs font-medium">{result.message}</p>
		</div>
	)
}

export default function TransfusionPage() {
	const { permSet, roleName } = useAccessContext()
	const facilityId = useActiveFacilityId()
	const verifyMutation = useBedsideVerifyMutation()
	const [patientMrn, setPatientMrn] = useState("")
	const [unitBarcode, setUnitBarcode] = useState("")
	const [patientWristbandBarcode, setPatientWristbandBarcode] = useState("")
	const [showErrors, setShowErrors] = useState(false)
	const [verifyResult, setVerifyResult] = useState<BedsideVerifyResult | null>(null)

	const hasViewPermission = canAccessRoleGatedModule(
		roleName,
		NURSE_ROLE_NAMES,
		permSet,
		"nursing",
		"view"
	)
	const hasVerifyPermission = canAccessRoleGatedModule(
		roleName,
		NURSE_ROLE_NAMES,
		permSet,
		"nursing",
		"edit"
	)
	const trimmedPatientMrn = patientMrn.trim()
	const crossMatchesQuery = useCrossMatchListQuery({
		facilityId: hasViewPermission && trimmedPatientMrn ? (facilityId ?? "") : "",
		patientMrn: trimmedPatientMrn || undefined,
		limit: 10,
	})
	const crossMatches = useMemo(
		() => crossMatchesQuery.data?.data ?? [],
		[crossMatchesQuery.data?.data]
	)
	const selectedCrossMatch = useMemo(() => {
		if (!trimmedPatientMrn) return null

		return (
			crossMatches.find(request => request.status === "issued" || request.status === "approved") ??
			crossMatches[0] ??
			null
		)
	}, [crossMatches, trimmedPatientMrn])
	const crossMatchId = selectedCrossMatch?.id ?? ""
	const crossMatchLookupError =
		!trimmedPatientMrn || crossMatchesQuery.isFetching
			? ""
			: !facilityId
				? "Active facility is required to find cross-match requests."
				: crossMatchesQuery.isError
					? "Unable to find cross-match requests for this MRN."
					: !selectedCrossMatch
						? "No cross-match request was found for this MRN."
						: ""
	const errors = {
		patientMrn: !trimmedPatientMrn ? "Patient MRN is required." : "",
		crossMatchId: !crossMatchId.trim() ? "Cross-match request ID is required." : "",
		unitBarcode: !unitBarcode.trim() ? "Blood unit barcode is required." : "",
		patientWristbandBarcode: !patientWristbandBarcode.trim()
			? "Patient wristband barcode is required."
			: "",
	}
	const hasErrors = Object.values(errors).some(Boolean)
	const canSubmit = hasVerifyPermission && !hasErrors && !verifyMutation.isPending

	function clearResult() {
		setVerifyResult(null)
		verifyMutation.reset()
	}

	function handleVerify() {
		setShowErrors(true)
		if (hasErrors) {
			toast.error("Please complete all required verification fields.")
			return
		}

		if (!hasVerifyPermission) {
			toast.error("You do not have permission to verify transfusions.")
			return
		}

		clearResult()
		verifyMutation.mutate(
			{
				crossMatchId: crossMatchId.trim(),
				unitBarcode: unitBarcode.trim(),
				patientWristbandBarcode: patientWristbandBarcode.trim(),
			},
			{
				onSuccess: data => {
					setVerifyResult(data)
					if (data.verified) {
						toast.success("Transfusion verification recorded successfully.")
					} else {
						toast.error(data.message)
					}
				},
				onError: error => {
					toast.error(error instanceof Error ? error.message : "Failed to verify transfusion.")
				},
			}
		)
	}

	function handleReset() {
		setPatientMrn("")
		setUnitBarcode("")
		setPatientWristbandBarcode("")
		setShowErrors(false)
		clearResult()
	}

	if (!hasViewPermission) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access transfusion verification.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Bedside Transfusion Verification</h1>
				<p className="text-muted-foreground text-sm">
					Verify the cross-match request, patient wristband, and blood unit before transfusion.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Verification details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<VerificationField
							id="patient-mrn"
							label="Patient MRN"
							value={patientMrn}
							placeholder="Enter patient MRN"
							onChange={value => {
								setPatientMrn(value)
								clearResult()
							}}
							error={showErrors ? errors.patientMrn : ""}
						/>

						<VerificationField
							id="cross-match-request-id"
							label="Cross-match request ID"
							value={crossMatchId}
							placeholder={
								crossMatchesQuery.isFetching
									? "Looking up cross-match request..."
									: "Auto-filled from patient MRN"
							}
							onChange={() => undefined}
							error={
								showErrors ? crossMatchLookupError || errors.crossMatchId : crossMatchLookupError
							}
							readOnly
						/>
						{selectedCrossMatch && (
							<div className="bg-muted/40 text-muted-foreground rounded-md border p-3 text-xs">
								<p>
									<span className="text-foreground font-medium">Matched request:</span>{" "}
									{selectedCrossMatch.patientName}
								</p>
								<p className="mt-1">
									Status {selectedCrossMatch.status} · Requested{" "}
									{new Date(selectedCrossMatch.requestedAt).toLocaleString()}
								</p>
							</div>
						)}

						<div className="grid gap-4 md:grid-cols-2">
							<VerificationField
								id="patient-wristband-barcode"
								label="Patient wristband barcode"
								value={patientWristbandBarcode}
								placeholder="Scan or type wristband barcode"
								maxLength={50}
								onChange={value => {
									setPatientWristbandBarcode(value)
									clearResult()
								}}
								error={showErrors ? errors.patientWristbandBarcode : ""}
								verified={verifyResult ? verifyResult.patientMatch : null}
							/>
							<VerificationField
								id="blood-unit-barcode"
								label="Blood unit barcode"
								value={unitBarcode}
								placeholder="Scan or type blood unit barcode"
								maxLength={50}
								onChange={value => {
									setUnitBarcode(value)
									clearResult()
								}}
								error={showErrors ? errors.unitBarcode : ""}
								verified={verifyResult ? verifyResult.unitMatch : null}
							/>
						</div>

						{verifyMutation.isPending && (
							<div className="text-muted-foreground flex justify-center py-2 text-sm">
								Verifying transfusion match...
							</div>
						)}

						{verifyResult && <VerificationResult result={verifyResult} />}

						<div className="flex flex-wrap gap-2 pt-2">
							<Button
								className="h-10 w-full min-w-36 sm:w-auto"
								onClick={handleVerify}
								disabled={!canSubmit}
							>
								{verifyMutation.isPending ? "Verifying..." : "Verify match"}
							</Button>
							<Button
								className="h-10 w-full sm:w-auto"
								variant="outline"
								onClick={handleReset}
								disabled={verifyMutation.isPending}
							>
								Reset
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Verification record</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<RecordStatusRow label="Cross-match request ID" ready={Boolean(crossMatchId.trim())} />
						<RecordStatusRow
							label="Patient wristband barcode"
							ready={Boolean(patientWristbandBarcode.trim())}
						/>
						<RecordStatusRow label="Blood unit barcode" ready={Boolean(unitBarcode.trim())} />
						<div className="bg-muted/40 text-muted-foreground rounded-md border p-3 text-xs">
							Patient, blood unit, staff, match flags, message, and timestamps are resolved by the
							bedside verification service when the match is submitted.
						</div>
						{!hasVerifyPermission && (
							<div className="border-destructive bg-destructive/10 text-destructive rounded-md border p-3 text-xs">
								You can view this page, but nursing edit permission is required to submit a
								transfusion verification.
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
