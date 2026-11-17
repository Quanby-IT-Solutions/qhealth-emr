"use client"

import React, { useMemo, useState } from "react"
import { CheckCircle2, Circle, Play, Save, Scan, Square } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
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
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useAncillaryProcedureClearanceByMrnQuery,
	useAncillaryProcedureLogQuery,
	useAncillaryProcedureScanMutation,
	useSaveAncillaryProcedureClearanceMutation,
} from "@/features/msw/ancillary-clearance/api/clearance.hooks"

const SLA_TARGET_MINUTES = 120
type ScanType = "start" | "end"
type ProcedureStatus = "not_started" | "in_progress" | "completed"
type ProcedureLogRowForScan = {
	id: string
	patientMrn: string | null
	startAt: Date | string | null
	endAt: Date | string | null
}

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

function formatTimestamp(value: Date | string | null | undefined) {
	if (!value) return "-"
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return "-"

	return date
		.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		})
		.concat(`.${String(date.getMilliseconds()).padStart(3, "0")}`)
}

function formatDuration(durationMinutes: number | null | undefined, hasStarted = true) {
	if (!hasStarted) return "not started"
	if (durationMinutes === null || durationMinutes === undefined) return "in progress"
	if (durationMinutes < 1) return "<1m"

	const hours = Math.floor(durationMinutes / 60)
	const minutes = durationMinutes % 60
	if (hours === 0) return `${minutes}m`
	if (minutes === 0) return `${hours}h`

	return `${hours}h ${minutes}m`
}

function formatShortId(value: string) {
	return value.slice(0, 8)
}

function formatCompactId(value: string) {
	if (value.length <= 19) return value
	return `${value.slice(0, 8)}...${value.slice(-8)}`
}

function isToday(value: Date | string | null | undefined) {
	if (!value) return false
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return false

	const today = new Date()
	return (
		date.getFullYear() === today.getFullYear() &&
		date.getMonth() === today.getMonth() &&
		date.getDate() === today.getDate()
	)
}

function scanTypeLabel(scanType: ScanType) {
	return scanType === "start" ? "input" : "END"
}

function procedureStatusLabel(status: ProcedureStatus) {
	if (status === "not_started") return "Not started"
	if (status === "in_progress") return "Started"
	return "Ended"
}

function procedureStatusBadgeVariant(status: ProcedureStatus) {
	if (status === "completed") return "default"
	if (status === "in_progress") return "secondary"
	return "outline"
}

function scanTypeForProcedureStatus(status: ProcedureStatus): ScanType {
	return status === "in_progress" || status === "completed" ? "end" : "start"
}

function isProcedureStatusEligibleForScan(status: ProcedureStatus, nextScanType: ScanType) {
	return nextScanType === "start" ? status === "not_started" : status === "in_progress"
}

function getProcedureStatusFromTimes(
	startAt: Date | string | null | undefined,
	endAt: Date | string | null | undefined
): ProcedureStatus {
	if (!startAt) return "not_started"
	return endAt ? "completed" : "in_progress"
}

function normalizeScanValue(value: string | null | undefined) {
	return value?.trim().toUpperCase() ?? ""
}

function isProcedureRowEligibleForScan(row: ProcedureLogRowForScan, nextScanType: ScanType) {
	return nextScanType === "start" ? !row.startAt : Boolean(row.startAt) && !row.endAt
}

function generateDraftClearanceId() {
	if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

	const bytes = new Uint8Array(16)
	if (globalThis.crypto?.getRandomValues) {
		globalThis.crypto.getRandomValues(bytes)
	} else {
		for (let index = 0; index < bytes.length; index += 1) {
			bytes[index] = Math.floor(Math.random() * 256)
		}
	}
	bytes[6] = (bytes[6]! & 0x0f) | 0x40
	bytes[8] = (bytes[8]! & 0x3f) | 0x80

	return Array.from(bytes, byte => byte.toString(16).padStart(2, "0"))
		.join("")
		.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5")
}

function ScanAuditMark({
	label,
	matched,
	staffId,
}: {
	label: string
	matched: boolean
	staffId: string | null
}) {
	return (
		<div className="flex items-center gap-1.5" title={staffId ? `${label} by ${staffId}` : label}>
			{matched ? (
				<CheckCircle2 className="size-4 text-green-600" />
			) : (
				<Circle className="text-muted-foreground size-4" />
			)}
			<span className="text-xs">{label}</span>
		</div>
	)
}

export default function ProcedureLoggingPage() {
	const permSet = usePermissionSet()
	const facilityId = useActiveFacilityId()
	const procedureScanMutation = useAncillaryProcedureScanMutation()
	const saveProcedureClearanceMutation = useSaveAncillaryProcedureClearanceMutation()
	const hasViewPermission = can(permSet, "laboratory", "view") || can(permSet, "radiology", "view")
	const hasScanPermission = can(permSet, "laboratory", "edit") || can(permSet, "radiology", "edit")
	const [scanModalOpen, setScanModalOpen] = useState(false)
	const [scanIdentifier, setScanIdentifier] = useState("")
	const [patientBarcode, setPatientBarcode] = useState("")
	const [patientBarcodeReadOnly, setPatientBarcodeReadOnly] = useState(false)
	const [scanType, setScanType] = useState<ScanType>("start")
	const trimmedPatientBarcode = patientBarcode.trim()
	const procedureLogQuery = useAncillaryProcedureLogQuery({
		facilityId,
		enabled: hasViewPermission,
		limit: 50,
	})
	const procedureClearanceByMrnQuery = useAncillaryProcedureClearanceByMrnQuery({
		facilityId,
		patientMrn: trimmedPatientBarcode,
		scanType,
		enabled: hasScanPermission && Boolean(trimmedPatientBarcode) && !patientBarcodeReadOnly,
	})
	const rows = procedureLogQuery.data ?? []
	const normalizedPatientBarcode = normalizeScanValue(patientBarcode)
	const matchingProcedureRow = normalizedPatientBarcode
		? (rows.find(
				row =>
					normalizeScanValue(row.patientMrn) === normalizedPatientBarcode &&
					isProcedureRowEligibleForScan(row, scanType)
			) ??
			rows.find(row => normalizeScanValue(row.patientMrn) === normalizedPatientBarcode) ??
			null)
		: null
	const resolvedProcedureClearance = procedureClearanceByMrnQuery.data?.clearance ?? null
	const resolvedPatient = procedureClearanceByMrnQuery.data?.patient ?? null
	const savedMatchedClearanceId = resolvedProcedureClearance?.id ?? matchingProcedureRow?.id ?? ""
	const shouldPrepareDraftClearanceId = Boolean(
		trimmedPatientBarcode &&
		normalizedPatientBarcode &&
		resolvedPatient &&
		!savedMatchedClearanceId &&
		!patientBarcodeReadOnly
	)
	const draftClearanceSeed = shouldPrepareDraftClearanceId ? normalizedPatientBarcode : ""
	const draftClearanceId = useMemo(
		() => (draftClearanceSeed ? generateDraftClearanceId() : ""),
		[draftClearanceSeed]
	)
	const matchedClearanceId = savedMatchedClearanceId || draftClearanceId
	const actionSelectedClearanceId = scanIdentifier.trim()
	const selectedClearanceId =
		actionSelectedClearanceId || (trimmedPatientBarcode ? matchedClearanceId : "")
	const procedureStatusDetail = resolvedProcedureClearance
		? {
				status: resolvedProcedureClearance.procedureStatus,
				startAt: resolvedProcedureClearance.startAt,
				endAt: resolvedProcedureClearance.endAt,
				scanEligible: resolvedProcedureClearance.scanEligible,
			}
		: matchingProcedureRow
			? {
					status: getProcedureStatusFromTimes(
						matchingProcedureRow.startAt,
						matchingProcedureRow.endAt
					),
					startAt: matchingProcedureRow.startAt,
					endAt: matchingProcedureRow.endAt,
					scanEligible: isProcedureRowEligibleForScan(matchingProcedureRow, scanType),
				}
			: actionSelectedClearanceId
				? {
						status: "not_started" as ProcedureStatus,
						startAt: null,
						endAt: null,
						scanEligible: true,
					}
				: null
	const clearanceIdentifierPlaceholder = trimmedPatientBarcode
		? procedureClearanceByMrnQuery.isFetching
			? "Looking up clearance ID"
			: "No matching clearance record"
		: "Auto-filled from patient MRN"
	const showManualClearanceMatch = Boolean(trimmedPatientBarcode && !actionSelectedClearanceId)
	const isSelectedClearanceSaved = Boolean(actionSelectedClearanceId || savedMatchedClearanceId)
	const shouldLockScanType =
		isSelectedClearanceSaved &&
		Boolean(procedureStatusDetail) &&
		procedureStatusDetail?.status !== "not_started"
	const autoScanType =
		shouldLockScanType && procedureStatusDetail
			? scanTypeForProcedureStatus(procedureStatusDetail.status)
			: null
	const selectedScanType = autoScanType ?? scanType
	const selectedClearanceScanEligible = procedureStatusDetail
		? isProcedureStatusEligibleForScan(procedureStatusDetail.status, selectedScanType)
		: false
	const patientDetail = resolvedPatient
		? { name: resolvedPatient.name, mrn: resolvedPatient.mrn }
		: matchingProcedureRow
			? { name: matchingProcedureRow.patientName, mrn: matchingProcedureRow.patientMrn }
			: null
	const canSaveClearanceRecord =
		hasScanPermission &&
		Boolean(trimmedPatientBarcode) &&
		Boolean(resolvedPatient) &&
		Boolean(draftClearanceId) &&
		!isSelectedClearanceSaved &&
		!procedureClearanceByMrnQuery.isFetching &&
		!saveProcedureClearanceMutation.isPending
	const completedRows = rows.filter(row => row.durationMinutes !== null)
	const inProgressCount = rows.filter(row => row.procedureStatus === "in_progress").length
	const completedTodayCount = rows.filter(row => isToday(row.endAt)).length
	const breachCount = rows.filter(row => row.slaStatus === "breach").length
	const avgDurationMinutes =
		completedRows.length > 0
			? Math.round(
					completedRows.reduce((total, row) => total + (row.durationMinutes ?? 0), 0) /
						completedRows.length
				)
			: null

	const canSubmitScan =
		hasScanPermission &&
		Boolean(selectedClearanceId.trim()) &&
		Boolean(trimmedPatientBarcode) &&
		isSelectedClearanceSaved &&
		selectedClearanceScanEligible &&
		!saveProcedureClearanceMutation.isPending &&
		!procedureScanMutation.isPending

	function handlePatientBarcodeChange(event: React.ChangeEvent<HTMLInputElement>) {
		setPatientBarcode(event.target.value)
		if (!patientBarcodeReadOnly) {
			setScanIdentifier("")
			saveProcedureClearanceMutation.reset()
		}
	}

	function getManualClearanceLookupMessage() {
		if (procedureClearanceByMrnQuery.isFetching) return "Looking up patient MRN..."
		if (actionSelectedClearanceId || resolvedProcedureClearance?.created) {
			return "Clearance ID saved from patients.mrn."
		}
		if (savedMatchedClearanceId) return "Clearance ID matched from patients.mrn."
		if (draftClearanceId) return "Clearance ID prepared. Click Save Record to save it."
		if (resolvedPatient) return "Patient found. Click Save Record to create a clearance record."
		if (procedureClearanceByMrnQuery.isFetched) return "No patient found for this MRN."
		return "Enter an MRN from the patients table."
	}

	function handleSaveClearanceRecord() {
		if (!canSaveClearanceRecord) return

		saveProcedureClearanceMutation.mutate(
			{
				...(facilityId ? { facilityId } : {}),
				patientMrn: trimmedPatientBarcode,
				scanType: selectedScanType,
				clearanceId: draftClearanceId,
			},
			{
				onSuccess: data => {
					const savedClearanceId = data.clearance?.id
					if (savedClearanceId) setScanIdentifier(savedClearanceId)
					toast.success("Procedure clearance record saved.")
				},
				onError: error => {
					toast.error(
						error instanceof Error ? error.message : "Unable to save procedure clearance record."
					)
				},
			}
		)
	}

	function openScanModal(
		identifier = "",
		nextScanType: ScanType = "start",
		patientMrn: string | null = null
	) {
		setScanIdentifier(identifier)
		setPatientBarcode(patientMrn ?? "")
		setPatientBarcodeReadOnly(Boolean(identifier && patientMrn?.trim()))
		setScanType(nextScanType)
		procedureScanMutation.reset()
		saveProcedureClearanceMutation.reset()
		setScanModalOpen(true)
	}

	function handleScanSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()

		if (!hasScanPermission) {
			toast.error("You do not have permission to record procedure scans.")
			return
		}

		if (!selectedClearanceId.trim() || !trimmedPatientBarcode) {
			toast.error("Scan a patient MRN with a matching ancillary clearance record.")
			return
		}
		if (!selectedClearanceScanEligible) {
			toast.error(`This record is not eligible for a ${scanTypeLabel(selectedScanType)} scan.`)
			return
		}

		procedureScanMutation.mutate(
			{
				identifier: selectedClearanceId.trim(),
				scanType: selectedScanType,
				patientBarcode: trimmedPatientBarcode,
			},
			{
				onSuccess: data => {
					toast.success(data.message)
					setPatientBarcode("")
					setScanIdentifier("")
					setScanModalOpen(false)
				},
				onError: error => {
					toast.error(error instanceof Error ? error.message : "Unable to record procedure scan.")
				},
			}
		)
	}

	if (!hasViewPermission) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access procedure logging.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
				<div>
					<h1 className="text-2xl font-semibold">Ancillary Procedure Logging</h1>
					<p className="text-muted-foreground text-sm">
						Barcode start/end scans on ancillary clearance records drive ARTA Flow 3 procedure
						tracking.
					</p>
				</div>
				<div className="flex w-full items-center gap-3 sm:w-auto">
					<Button
						className="h-10 w-full sm:w-auto"
						variant="outline"
						onClick={() => openScanModal()}
					>
						<Scan className="mr-2 size-4" />
						Open scan modal
					</Button>
					<Dialog open={scanModalOpen} onOpenChange={setScanModalOpen}>
						<DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto sm:max-w-lg">
							<DialogHeader>
								<DialogTitle>Patient Barcode Scan</DialogTitle>
							</DialogHeader>

							<form className="space-y-4 p-1" onSubmit={handleScanSubmit}>
								<div className="border-border mb-4 min-h-36 rounded-md border-2 border-dashed p-4">
									{patientDetail ? (
										<div className="space-y-3">
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<div className="text-muted-foreground text-xs">Patient</div>
													<div className="truncate font-medium">
														{patientDetail.name ?? "Unknown patient"}
													</div>
													<div className="text-muted-foreground font-mono text-xs">
														MRN {patientDetail.mrn ?? trimmedPatientBarcode}
													</div>
												</div>
												{procedureStatusDetail ? (
													<Badge
														variant={procedureStatusBadgeVariant(procedureStatusDetail.status)}
													>
														{procedureStatusLabel(procedureStatusDetail.status)}
													</Badge>
												) : (
													<Badge variant="outline">Not Recorded</Badge>
												)}
											</div>
											<div className="grid gap-3 text-xs sm:grid-cols-2">
												<div>
													<div className="text-muted-foreground">Clearance ID</div>
													<div className="truncate font-mono">
														{selectedClearanceId
															? formatCompactId(selectedClearanceId)
															: "Pending save"}
													</div>
												</div>
												<div>
													<div className="text-muted-foreground">Next scan</div>
													<div className="font-medium">{scanTypeLabel(selectedScanType)}</div>
												</div>
												<div>
													<div className="text-muted-foreground">Start</div>
													<div>{formatTimestamp(procedureStatusDetail?.startAt)}</div>
												</div>
												<div>
													<div className="text-muted-foreground">End</div>
													<div>{formatTimestamp(procedureStatusDetail?.endAt)}</div>
												</div>
											</div>
										</div>
									) : (
										<div className="flex h-28 items-center justify-center">
											<div className="flex flex-col items-center gap-2 text-sm">
												<Scan className="text-muted-foreground size-6" />
												<span className="text-muted-foreground">
													Awaiting {scanTypeLabel(selectedScanType)} MRN...
												</span>
											</div>
										</div>
									)}
								</div>

								<div className="space-y-2">
									<Label htmlFor="clearance-identifier">Clearance ID</Label>
									<Input
										id="clearance-identifier"
										value={selectedClearanceId ? formatCompactId(selectedClearanceId) : ""}
										placeholder={clearanceIdentifierPlaceholder}
										readOnly
										aria-readonly="true"
										tabIndex={-1}
										onFocus={event => event.currentTarget.blur()}
										onMouseDown={event => event.preventDefault()}
										title={selectedClearanceId || clearanceIdentifierPlaceholder}
										className="bg-muted/40 focus-visible:border-input cursor-default font-mono focus-visible:ring-0"
									/>
									{showManualClearanceMatch && (
										<p
											className={cn(
												"text-xs",
												matchedClearanceId ? "text-muted-foreground" : "text-destructive"
											)}
										>
											{getManualClearanceLookupMessage()}
										</p>
									)}
								</div>

								<div className="space-y-2">
									<Label htmlFor="patient-barcode">Patient MRN / barcode</Label>
									<Input
										id="patient-barcode"
										value={patientBarcode}
										onChange={handlePatientBarcodeChange}
										placeholder={
											patientBarcodeReadOnly
												? "Patient MRN unavailable"
												: "Scan or type MRN / wristband barcode"
										}
										readOnly={patientBarcodeReadOnly}
										aria-readonly={patientBarcodeReadOnly}
										className={cn("font-mono", patientBarcodeReadOnly && "bg-muted/40")}
										autoFocus={!patientBarcodeReadOnly}
									/>
								</div>

								{showManualClearanceMatch && !isSelectedClearanceSaved && (
									<Button
										type="button"
										variant="outline"
										className="w-full justify-center"
										disabled={!canSaveClearanceRecord}
										onClick={handleSaveClearanceRecord}
									>
										<Save className="mr-2 size-4" />
										{saveProcedureClearanceMutation.isPending ? "Saving..." : "Save Record"}
									</Button>
								)}

								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex items-center gap-2">
										<Checkbox
											id="mark-end"
											checked={selectedScanType === "end"}
											disabled={shouldLockScanType}
											onCheckedChange={checked => setScanType(checked === true ? "end" : "start")}
										/>
										<label htmlFor="mark-end" className="text-muted-foreground text-sm">
											Mark END
										</label>
									</div>
									<Button
										className="h-10 w-full min-w-32 bg-green-600 text-white hover:bg-green-500 sm:w-auto"
										size="sm"
										type="submit"
										disabled={!canSubmitScan}
									>
										{selectedScanType === "start" ? (
											<Play className="mr-2 size-4" />
										) : (
											<Square className="mr-2 size-4" />
										)}
										{procedureScanMutation.isPending
											? "Saving..."
											: `Mark ${scanTypeLabel(selectedScanType)}`}
									</Button>
								</div>

								<div className="text-muted-foreground text-xs">
									Timestamp will be logged with millisecond precision and operator ID.
								</div>

								{!hasScanPermission && (
									<div className="border-destructive bg-destructive/10 text-destructive rounded-md border p-3 text-xs">
										Laboratory or radiology edit permission is required to record scans.
									</div>
								)}

								<DialogFooter>
									<DialogClose render={<Button variant="outline">Close</Button>} />
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Card>
					<CardContent>
						<div className="text-muted-foreground text-xs">IN PROGRESS</div>
						<div className="mt-2 text-2xl font-semibold">{inProgressCount}</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="text-muted-foreground text-xs">COMPLETED TODAY</div>
						<div className="mt-2 text-2xl font-semibold">{completedTodayCount}</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="text-muted-foreground text-xs">AVG TAT</div>
						<div className="mt-2 text-2xl font-semibold">
							{avgDurationMinutes === null ? "-" : formatDuration(avgDurationMinutes)}
						</div>
						<div className="text-muted-foreground text-xs">Target &lt;= {SLA_TARGET_MINUTES}m</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="text-muted-foreground text-xs">SLA BREACHES</div>
						<div className="text-destructive mt-2 text-2xl font-semibold">{breachCount}</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Procedure log</CardTitle>
				</CardHeader>
				<CardContent>
					<Table className="min-w-[920px]">
						<TableHeader>
							<TableRow>
								<TableHead>Clearance ID</TableHead>
								<TableHead>Patient</TableHead>
								<TableHead>Procedure</TableHead>
								<TableHead>Start</TableHead>
								<TableHead>End</TableHead>
								<TableHead>Duration</TableHead>
								<TableHead>Barcode</TableHead>
								<TableHead>SLA</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{procedureLogQuery.isLoading && (
								<TableRow>
									<TableCell colSpan={9} className="text-muted-foreground py-6 text-center">
										Loading procedure log...
									</TableCell>
								</TableRow>
							)}
							{procedureLogQuery.isError && (
								<TableRow>
									<TableCell colSpan={9} className="text-destructive py-6 text-center">
										Failed to load procedure log.
									</TableCell>
								</TableRow>
							)}
							{!procedureLogQuery.isLoading && !procedureLogQuery.isError && rows.length === 0 && (
								<TableRow>
									<TableCell colSpan={9} className="text-muted-foreground py-6 text-center">
										No ancillary clearance records found.
									</TableCell>
								</TableRow>
							)}
							{rows.map(row => (
								<TableRow key={row.id}>
									<TableCell className="font-mono" title={row.id}>
										{formatShortId(row.id)}
									</TableCell>
									<TableCell>
										<div className="font-medium">{row.patientName ?? "Unknown patient"}</div>
										{row.patientMrn && (
											<div className="text-muted-foreground text-xs">MRN {row.patientMrn}</div>
										)}
									</TableCell>
									<TableCell>
										<div>{row.procedureName ?? "Ancillary order"}</div>
										<div className="text-muted-foreground text-xs">{row.ancillaryType}</div>
									</TableCell>
									<TableCell>{formatTimestamp(row.startAt)}</TableCell>
									<TableCell>{formatTimestamp(row.endAt)}</TableCell>
									<TableCell>{formatDuration(row.durationMinutes, Boolean(row.startAt))}</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1">
											<ScanAuditMark
												label="Start"
												matched={row.procedureStartBarcodeMatched}
												staffId={row.procedureStartedByStaffId}
											/>
											<ScanAuditMark
												label="End"
												matched={row.procedureEndBarcodeMatched}
												staffId={row.procedureEndedByStaffId}
											/>
										</div>
									</TableCell>
									<TableCell>
										{row.slaStatus === "ok" && <Badge>OK</Badge>}
										{row.slaStatus === "breach" && <Badge variant="destructive">Breach</Badge>}
										{row.slaStatus === "in_progress" && (
											<Badge variant="secondary">In progress</Badge>
										)}
										{row.slaStatus === "not_started" && (
											<Badge variant="outline">Not started</Badge>
										)}
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() => openScanModal(row.id, "start", row.patientMrn)}
												disabled={!hasScanPermission || Boolean(row.startAt)}
											>
												<Play className="mr-1 size-3.5" />
												Start
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() => openScanModal(row.id, "end", row.patientMrn)}
												disabled={!hasScanPermission || !row.startAt || Boolean(row.endAt)}
											>
												<Square className="mr-1 size-3.5" />
												End
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}
