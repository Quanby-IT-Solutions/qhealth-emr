"use client"

import { useMemo, useRef, useState, type ChangeEvent } from "react"
import { useSearchParams } from "next/navigation"
import {
	ExternalLink,
	ImageOff,
	Maximize2,
	MonitorPlay,
	Paperclip,
	Trash2,
	Upload,
	ZoomIn,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Textarea } from "@/core/components/ui/textarea"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useImagingOrderDetailQuery,
	useUpdateImagingOrderMutation,
	type ImagingOrder,
} from "@/features/orders/api/orders.hooks"

type ReportStatus = "draft" | "signed"

interface ReportAttachment {
	id: string
	name: string
	size: number
	type: string
	uploadedAt: string
	dataUrl: string
}

interface StructuredReport {
	findings?: string
	impression?: string
	pacsUrl?: string
	radiologistName?: string
	reportedAt?: string
	draftedAt?: string
	reportStatus?: ReportStatus
	attachments?: ReportAttachment[]
}

interface RadiologyReportEditorProps {
	orderId: string
	order: ImagingOrder | undefined
	radiologistName: string | undefined
	hasEditPermission: boolean
}

const DEFAULT_FINDINGS =
	"Bilateral pulmonary nodules, largest 1.4 cm in right upper lobe\nNo pleural effusion. Heart size normal.\nMediastinal lymph node enlargement, station 4R measuring 1.8 cm.\nNo bony lesions."

const DEFAULT_IMPRESSION =
	"1. Multiple pulmonary nodules suspicious for metastatic disease.\n2. Mediastinal adenopathy. Recommend PET-CT correlation."

const DEFAULT_CLINICAL_HISTORY =
	"67F with persistent dry cough x 6 weeks, weight loss, history of breast carcinoma. Rule out metastatic disease."

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024

function can(
	permissions: Array<{ module: string; action: string }>,
	module: string,
	action: string
) {
	return permissions.some(
		permission => permission.module === module && permission.action === action
	)
}

function parseStructuredResults(raw: unknown): StructuredReport {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
	return raw as StructuredReport
}

function isReportAttachment(value: unknown): value is ReportAttachment {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false
	const attachment = value as Partial<ReportAttachment>
	return (
		typeof attachment.id === "string" &&
		typeof attachment.name === "string" &&
		typeof attachment.size === "number" &&
		typeof attachment.type === "string" &&
		typeof attachment.uploadedAt === "string" &&
		typeof attachment.dataUrl === "string"
	)
}

function formatFileSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function createAttachmentId() {
	return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readFileAsDataUrl(file: File) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result ?? ""))
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})
}

async function fileToAttachment(file: File): Promise<ReportAttachment> {
	return {
		id: createAttachmentId(),
		name: file.name,
		size: file.size,
		type: file.type || "application/octet-stream",
		uploadedAt: new Date().toISOString(),
		dataUrl: await readFileAsDataUrl(file),
	}
}

function composeReport(findings: string, impression: string) {
	return [`Findings:\n${findings.trim()}`, `Impression:\n${impression.trim()}`].join("\n\n")
}

export default function RadiologyPage() {
	const searchParams = useSearchParams()
	const orderId = searchParams.get("orderId") ?? searchParams.get("imagingOrderId") ?? ""
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const hasViewPermission = can(permissions, "radiology", "view")
	const hasEditPermission = can(permissions, "radiology", "edit")
	const imagingOrderQuery = useImagingOrderDetailQuery(orderId)

	if (!hasViewPermission) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access radiology services.
			</div>
		)
	}

	if (orderId && imagingOrderQuery.isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Radiology Report</h1>
					<p className="text-muted-foreground text-sm">Loading imaging order...</p>
				</div>
				<Card>
					<CardContent className="text-muted-foreground flex min-h-40 items-center justify-center text-sm">
						Loading imaging order...
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<RadiologyReportEditor
			key={(imagingOrderQuery.data?.updatedAt ?? orderId) || "demo-radiology-report"}
			orderId={orderId}
			order={imagingOrderQuery.data}
			radiologistName={profile?.user?.name}
			hasEditPermission={hasEditPermission}
		/>
	)
}

function RadiologyReportEditor({
	orderId,
	order,
	radiologistName,
	hasEditPermission,
}: RadiologyReportEditorProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const updateImagingOrder = useUpdateImagingOrderMutation()
	const structured = useMemo(() => parseStructuredResults(order?.structuredResults), [order])
	const initialAttachments = useMemo(
		() => (structured.attachments ?? []).filter(isReportAttachment),
		[structured.attachments]
	)

	const [findings, setFindings] = useState(structured.findings ?? order?.report ?? DEFAULT_FINDINGS)
	const [impression, setImpression] = useState(structured.impression ?? DEFAULT_IMPRESSION)
	const [pacsUrl, setPacsUrl] = useState(structured.pacsUrl ?? "")
	const [attachments, setAttachments] = useState<ReportAttachment[]>(initialAttachments)
	const [reportStatus, setReportStatus] = useState<ReportStatus>(
		structured.reportStatus ?? (order?.report ? "signed" : "draft")
	)

	const trimmedPacsUrl = pacsUrl.trim()
	const pacsConnected = trimmedPacsUrl.length > 0
	const studyTitle = order
		? `${order.modality.toUpperCase()} ${order.bodyPart}`
		: "Chest CT - Mei Lin Chen - Acct# R-8842-1109"
	const clinicalHistory = order?.clinicalIndication ?? DEFAULT_CLINICAL_HISTORY
	const isSaving = updateImagingOrder.isPending

	function buildStructuredReport(status: ReportStatus): StructuredReport {
		const now = new Date().toISOString()

		return {
			...structured,
			findings: findings.trim(),
			impression: impression.trim(),
			pacsUrl: trimmedPacsUrl || undefined,
			attachments,
			reportStatus: status,
			draftedAt: status === "draft" ? now : structured.draftedAt,
			reportedAt: status === "signed" ? now : structured.reportedAt,
			radiologistName: radiologistName ?? structured.radiologistName,
		}
	}

	function ensureCanEdit() {
		if (hasEditPermission) return true
		toast.error("Radiology edit permission is required to save this report.")
		return false
	}

	function handleSaveDraft() {
		if (!ensureCanEdit()) return

		if (!orderId) {
			setReportStatus("draft")
			toast.success("Draft saved locally. Select an imaging order to persist it.")
			return
		}

		updateImagingOrder.mutate(
			{
				id: orderId,
				structuredResults: buildStructuredReport("draft"),
			},
			{
				onSuccess: () => {
					setReportStatus("draft")
					toast.success("Radiology report draft saved.")
				},
				onError: () => {
					toast.error("Unable to save radiology draft.")
				},
			}
		)
	}

	function handleSignAndRelease() {
		if (!ensureCanEdit()) return
		if (!findings.trim() || !impression.trim()) {
			toast.error("Findings and impression are required before release.")
			return
		}

		if (!orderId) {
			setReportStatus("signed")
			toast.success("Report signed locally. Select an imaging order to persist it.")
			return
		}

		updateImagingOrder.mutate(
			{
				id: orderId,
				status: "completed",
				completedDatetime: new Date().toISOString(),
				report: composeReport(findings, impression),
				structuredResults: buildStructuredReport("signed"),
			},
			{
				onSuccess: () => {
					setReportStatus("signed")
					toast.success("Radiology report signed and released.")
				},
				onError: () => {
					toast.error("Unable to sign and release radiology report.")
				},
			}
		)
	}

	async function handleAttachFiles(event: ChangeEvent<HTMLInputElement>) {
		const selectedFiles = Array.from(event.target.files ?? [])
		event.currentTarget.value = ""
		if (selectedFiles.length === 0) return

		const oversizedFiles = selectedFiles.filter(file => file.size > MAX_ATTACHMENT_BYTES)
		if (oversizedFiles.length > 0) {
			toast.error("Each attachment must be 8 MB or smaller.")
		}

		const filesToAttach = selectedFiles.filter(file => file.size <= MAX_ATTACHMENT_BYTES)
		if (filesToAttach.length === 0) return

		try {
			const newAttachments = await Promise.all(filesToAttach.map(fileToAttachment))
			setAttachments(current => [...current, ...newAttachments])
			toast.success(
				`${newAttachments.length} attachment${newAttachments.length === 1 ? "" : "s"} added.`
			)
		} catch {
			toast.error("Unable to attach one or more files.")
		}
	}

	function handleOpenAttachment(attachment: ReportAttachment) {
		window.open(attachment.dataUrl, "_blank", "noopener,noreferrer")
	}

	function handleOpenExternalPacs() {
		if (!trimmedPacsUrl) {
			toast.error("Enter a PACS URL before opening the external viewer.")
			return
		}
		window.open(trimmedPacsUrl, "_blank", "noopener,noreferrer")
	}

	function handleOpenEmbeddedPacs() {
		if (orderId) {
			window.open(`/radiology/pacs-viewer?orderId=${encodeURIComponent(orderId)}`, "_blank")
			return
		}
		handleOpenExternalPacs()
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Radiology Report</h1>
					<p className="text-muted-foreground text-sm">{studyTitle}</p>
				</div>
				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						onClick={handleSaveDraft}
						disabled={isSaving || !hasEditPermission}
					>
						{isSaving && reportStatus === "draft" ? "Saving..." : "Save draft"}
					</Button>
					<Button onClick={handleSignAndRelease} disabled={isSaving || !hasEditPermission}>
						{isSaving && reportStatus === "signed" ? "Saving..." : "Sign & release"}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div className="md:col-span-2">
					<Card className="overflow-hidden">
						<div className="bg-background flex items-center justify-between border-b px-4 py-2.5">
							<div className="flex items-center gap-2.5">
								<MonitorPlay className="text-muted-foreground h-4 w-4" />
								<span className="text-sm font-medium">PACS Viewer - Embedded</span>
								<span
									className={
										pacsConnected
											? "inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs text-green-500"
											: "inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500"
									}
								>
									<span
										className={
											pacsConnected
												? "inline-block h-1.5 w-1.5 rounded-full bg-green-500"
												: "inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
										}
									/>
									{pacsConnected ? "Connected" : "Not linked"}
								</span>
							</div>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									disabled={!pacsConnected}
									onClick={handleOpenEmbeddedPacs}
								>
									<ZoomIn className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									disabled={!pacsConnected && !orderId}
									onClick={handleOpenEmbeddedPacs}
								>
									<Maximize2 className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="gap-1.5 text-xs"
									onClick={handleOpenExternalPacs}
									disabled={!pacsConnected}
								>
									<ExternalLink className="h-3.5 w-3.5" />
									Open external
								</Button>
							</div>
						</div>

						<div className="bg-black">
							{pacsConnected ? (
								<iframe
									title="Embedded PACS viewer"
									src={trimmedPacsUrl}
									className="h-[548px] w-full border-0 bg-black"
									referrerPolicy="no-referrer"
									sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
								/>
							) : (
								<>
									<div className="grid grid-cols-2 divide-x divide-zinc-800">
										<div className="relative flex h-64 items-center justify-center border-b border-zinc-800">
											<div className="absolute top-2 left-3 font-mono text-[10px] tracking-widest text-zinc-500">
												SLICE 8
											</div>
											<EmptySlice />
										</div>
										<div className="relative flex h-64 items-center justify-center border-b border-zinc-800">
											<div className="absolute top-2 left-3 font-mono text-[10px] tracking-widest text-zinc-500">
												SLICE 16
											</div>
											<EmptySlice />
										</div>
										<div className="relative flex h-64 items-center justify-center">
											<div className="absolute top-2 left-3 font-mono text-[10px] tracking-widest text-zinc-500">
												SLICE 24
											</div>
											<EmptySlice />
											<div className="absolute bottom-2 left-3 font-mono text-[10px] text-zinc-400">
												{order
													? `${order.modality.toUpperCase()} ${order.bodyPart}`
													: "CHEN, MEI LIN - 67F - CT CHEST W/CONTRAST"}
											</div>
										</div>
										<div className="relative flex h-64 items-center justify-center">
											<div className="absolute top-2 left-3 font-mono text-[10px] tracking-widest text-zinc-500">
												SLICE 32
											</div>
											<EmptySlice />
										</div>
									</div>

									<div className="flex items-center justify-between border-t border-zinc-800 px-3 py-2">
										<span className="font-mono text-[11px] text-zinc-500">
											4 series - 248 images - Acquired 09:02
										</span>
										<span className="font-mono text-[11px] text-zinc-500">
											Study UID: 1.2.840.113619.2.5.1762583153.4421
										</span>
									</div>
								</>
							)}
						</div>
					</Card>
				</div>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Clinical History</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-muted-foreground text-sm">{clinicalHistory}</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm">PACS Link</CardTitle>
						</CardHeader>
						<CardContent>
							<Input
								value={pacsUrl}
								onChange={event => setPacsUrl(event.target.value)}
								placeholder="https://pacs.example.com/viewer/study"
								disabled={!hasEditPermission}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Findings</CardTitle>
						</CardHeader>
						<CardContent>
							<Textarea
								className="h-32"
								value={findings}
								onChange={event => setFindings(event.target.value)}
								disabled={!hasEditPermission}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Impression</CardTitle>
						</CardHeader>
						<CardContent>
							<Textarea
								className="h-24"
								value={impression}
								onChange={event => setImpression(event.target.value)}
								disabled={!hasEditPermission}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Attachments</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<input
									ref={fileInputRef}
									type="file"
									accept=".pdf,image/*,.doc,.docx"
									multiple
									className="hidden"
									onChange={handleAttachFiles}
								/>
								{attachments.length === 0 ? (
									<div className="text-muted-foreground rounded border px-3 py-2 text-sm">
										No files attached.
									</div>
								) : (
									attachments.map(attachment => (
										<div
											key={attachment.id}
											className="bg-background flex items-center justify-between gap-3 rounded px-3 py-2"
										>
											<div className="flex min-w-0 items-center gap-2">
												<Paperclip className="text-muted-foreground size-3.5 shrink-0" />
												<div className="min-w-0">
													<div className="truncate text-sm">{attachment.name}</div>
													<div className="text-muted-foreground text-xs">
														{formatFileSize(attachment.size)}
													</div>
												</div>
											</div>
											<div className="flex shrink-0 items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleOpenAttachment(attachment)}
												>
													Open
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="size-8"
													disabled={!hasEditPermission}
													onClick={() =>
														setAttachments(current =>
															current.filter(item => item.id !== attachment.id)
														)
													}
												>
													<Trash2 className="size-3.5" />
												</Button>
											</div>
										</div>
									))
								)}
								<button
									type="button"
									disabled={!hasEditPermission}
									onClick={() => fileInputRef.current?.click()}
									className="border-border text-muted-foreground hover:border-muted-foreground/40 mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded border-2 border-dashed p-3 text-center text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
								>
									<Upload className="size-4" />
									Attach file
								</button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}

function EmptySlice() {
	return (
		<div className="flex flex-col items-center justify-center gap-2 select-none">
			<ImageOff className="h-6 w-6 text-zinc-700" />
			<span className="font-mono text-[11px] tracking-wide text-zinc-600">NO IMAGE LOADED</span>
		</div>
	)
}
