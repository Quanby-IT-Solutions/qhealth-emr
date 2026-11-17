"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
	AlertCircle,
	CheckCircle2,
	Copy,
	ExternalLink,
	Loader2,
	QrCode,
	RefreshCw,
} from "lucide-react"
import { toDataURL } from "qrcode"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { cn } from "@/core/lib/utils"
import { FaceScanResults } from "@/features/face-scan/components/face-scan-results"
import {
	createFaceScanPhoneSession,
	getFaceScanPhoneUrl,
	useFaceScanPhoneSessionQuery,
	type FaceScanPhoneSessionResponse,
} from "@/features/face-scan/hooks/face-scan.hooks"
import type { FaceScanVitals } from "@/features/face-scan/lib/face-scan-vitals"

interface FaceScanPhoneQrDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	age?: number
	gender?: "male" | "female"
	smoking?: boolean
	facilityId?: string
	encounterId?: string
	patientId?: string
	onComplete: (vitals: FaceScanVitals) => void
}

function formatExpiry(expiresAt?: string) {
	if (!expiresAt) return "10 minutes"
	return new Date(expiresAt).toLocaleTimeString("en-PH", {
		hour: "2-digit",
		minute: "2-digit",
	})
}

function statusLabel(status?: FaceScanPhoneSessionResponse["status"]) {
	switch (status) {
		case "complete":
			return "Complete"
		case "expired":
			return "Expired"
		default:
			return "Waiting"
	}
}

function statusVariant(
	status?: FaceScanPhoneSessionResponse["status"]
): "default" | "secondary" | "outline" | "destructive" {
	switch (status) {
		case "complete":
			return "secondary"
		case "expired":
			return "destructive"
		default:
			return "outline"
	}
}

export function FaceScanPhoneQrDialog({
	open,
	onOpenChange,
	age,
	gender,
	smoking,
	facilityId,
	encounterId,
	patientId,
	onComplete,
}: FaceScanPhoneQrDialogProps) {
	const [session, setSession] = useState<FaceScanPhoneSessionResponse | null>(null)
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
	const [createError, setCreateError] = useState<string | null>(null)
	const [copied, setCopied] = useState(false)
	const [isCreating, setIsCreating] = useState(false)
	const appliedRef = useRef(false)
	const didCreateForOpenRef = useRef(false)
	const isCreatingRef = useRef(false)
	const createRequestIdRef = useRef(0)
	const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const polledSessionQuery = useFaceScanPhoneSessionQuery(session?.id, {
		enabled: open && Boolean(session?.id),
		refetchInterval: open && session?.status === "pending" ? 2000 : false,
	})
	const polledSession = session
	const phoneUrl = session?.token ? getFaceScanPhoneUrl(session.token) : null

	const resetState = useCallback(() => {
		setSession(null)
		setQrDataUrl(null)
		setCreateError(null)
		setCopied(false)
		setIsCreating(false)
		appliedRef.current = false
		didCreateForOpenRef.current = false
		isCreatingRef.current = false
		createRequestIdRef.current += 1
		if (copyTimerRef.current) {
			clearTimeout(copyTimerRef.current)
			copyTimerRef.current = null
		}
	}, [])

	const createSession = useCallback(async () => {
		if (isCreatingRef.current) return

		isCreatingRef.current = true
		didCreateForOpenRef.current = true
		const requestId = createRequestIdRef.current + 1
		createRequestIdRef.current = requestId
		setIsCreating(true)
		setCreateError(null)
		setQrDataUrl(null)
		appliedRef.current = false

		try {
			const next = await createFaceScanPhoneSession({
				...(facilityId ? { facilityId } : {}),
				...(encounterId ? { encounterId } : {}),
				...(patientId ? { patientId } : {}),
				...(age !== undefined ? { age } : {}),
				...(gender !== undefined ? { gender } : {}),
				...(smoking !== undefined ? { smoking } : {}),
			})
			if (createRequestIdRef.current !== requestId) return
			setSession(next)
		} catch (error) {
			if (createRequestIdRef.current !== requestId) return
			const message = error instanceof Error ? error.message : String(error)
			setCreateError(message)
			setSession(null)
		} finally {
			if (createRequestIdRef.current === requestId) {
				isCreatingRef.current = false
				setIsCreating(false)
			}
		}
	}, [age, encounterId, facilityId, gender, patientId, smoking])

	useEffect(() => {
		if (!polledSessionQuery.data) return
		setSession(prev =>
			prev ? { ...polledSessionQuery.data, token: prev.token } : polledSessionQuery.data
		)
	}, [polledSessionQuery.data])

	useEffect(() => {
		if (!open) {
			resetState()
			return
		}
		if (didCreateForOpenRef.current || session) return
		void createSession()
	}, [createSession, open, resetState, session])

	useEffect(() => {
		if (!phoneUrl) return

		let cancelled = false
		void toDataURL(phoneUrl, {
			errorCorrectionLevel: "M",
			margin: 2,
			width: 240,
		})
			.then(url => {
				if (!cancelled) setQrDataUrl(url)
			})
			.catch(error => {
				if (!cancelled) {
					const message = error instanceof Error ? error.message : String(error)
					setCreateError(message)
				}
			})

		return () => {
			cancelled = true
		}
	}, [phoneUrl])

	useEffect(() => {
		if (
			!open ||
			!polledSession ||
			polledSession.status !== "complete" ||
			!polledSession.vitals ||
			appliedRef.current
		) {
			return
		}

		appliedRef.current = true
		onComplete(polledSession.vitals)
	}, [open, onComplete, polledSession])

	async function handleCopyLink() {
		if (!phoneUrl) return
		try {
			await navigator.clipboard.writeText(phoneUrl)
			setCopied(true)
			if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
			copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
		} catch {
			setCreateError("Could not copy the phone scan link.")
		}
	}

	const isPending = polledSession?.status === "pending"
	const isComplete = polledSession?.status === "complete" && polledSession.vitals
	const isExpired = polledSession?.status === "expired"

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				size="lg"
				elevated
				className="max-h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto sm:max-w-[min(720px,calc(100vw-2rem))]"
			>
				<DialogHeader>
					<div className="flex min-w-0 items-start gap-3 pr-8">
						<div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
							<QrCode className="size-5" />
						</div>
						<div className="min-w-0 space-y-1">
							<div className="flex flex-wrap items-center gap-2">
								<DialogTitle>Scan with your phone</DialogTitle>
								<Badge variant={statusVariant(polledSession?.status)}>
									{statusLabel(polledSession?.status)}
								</Badge>
							</div>
							<DialogDescription>
								Open the link on a mobile device. Results return here for review before saving.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
					<div className="border-border bg-muted/20 flex min-h-[220px] min-w-0 items-center justify-center rounded-lg border p-3">
						{isCreating || (!qrDataUrl && !createError) ? (
							<div className="text-muted-foreground flex flex-col items-center gap-3 text-sm">
								<Loader2 className="text-primary size-8 animate-spin" />
								Preparing QR code
							</div>
						) : qrDataUrl ? (
							<Image
								src={qrDataUrl}
								alt="Phone face scan QR code"
								width={208}
								height={208}
								unoptimized
								className="size-52 max-w-full rounded-md"
							/>
						) : (
							<QrCode className="text-muted-foreground size-16" />
						)}
					</div>

					<div className="min-w-0 space-y-4">
						{createError && (
							<Alert variant="destructive">
								<AlertCircle className="size-4" />
								<AlertTitle>Could not prepare phone scan</AlertTitle>
								<AlertDescription>{createError}</AlertDescription>
							</Alert>
						)}

						{isPending && (
							<div className="space-y-3">
								<div className="flex items-center gap-2 text-sm">
									{polledSessionQuery.isFetching ? (
										<Loader2 className="text-primary size-4 animate-spin" />
									) : (
										<RefreshCw className="text-muted-foreground size-4" />
									)}
									<span>Waiting for the phone scan to finish.</span>
								</div>
								<p className="text-muted-foreground text-sm">
									This QR link expires at {formatExpiry(polledSession?.expiresAt)}.
								</p>
							</div>
						)}

						{isExpired && (
							<Alert variant="destructive">
								<AlertCircle className="size-4" />
								<AlertTitle>QR code expired</AlertTitle>
								<AlertDescription>
									Create a new phone scan QR code and ask the patient to scan it again.
								</AlertDescription>
							</Alert>
						)}

						{isComplete && polledSession.vitals && (
							<div className="space-y-3">
								<div className="text-success flex items-center gap-2 text-sm font-medium">
									<CheckCircle2 className="size-4" />
									Values were applied to the vitals form.
								</div>
								<FaceScanResults vitals={polledSession.vitals} />
							</div>
						)}

						{phoneUrl && (
							<div className="bg-muted/30 border-border min-w-0 rounded-lg border p-3">
								<p className="text-muted-foreground mb-2 text-xs font-medium">Fallback link</p>
								<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
									<p className="min-w-0 truncate text-sm">{phoneUrl}</p>
									<Button
										type="button"
										variant="outline"
										size="icon"
										className={cn("shrink-0", copied && "text-success")}
										aria-label="Copy phone scan link"
										onClick={() => void handleCopyLink()}
									>
										{copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
									</Button>
									<Button type="button" variant="outline" size="icon" asChild>
										<a
											href={phoneUrl}
											target="_blank"
											rel="noreferrer"
											aria-label="Open phone scan link"
										>
											<ExternalLink className="size-4" />
										</a>
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>

				<DialogFooter className="gap-2">
					{(createError || isExpired) && (
						<Button type="button" variant="outline" onClick={() => void createSession()}>
							<RefreshCw className="size-4" />
							New QR code
						</Button>
					)}
					<Button type="button" onClick={() => onOpenChange(false)}>
						{isComplete ? "Back to vitals form" : "Close"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
