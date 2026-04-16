"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { AlertCircle, CheckCircle, RotateCcw } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

import type { AnnexType } from "@/features/msw/api/msw.hooks"
import {
	useAnnexSignaturesQuery,
	useCreateAnnexSignatureMutation,
} from "@/features/msw/api/msw.hooks"

// ============================================================================
// Signature Canvas
// ============================================================================

interface SignatureCanvasProps {
	onCapture: (dataUrl: string) => void
	onClear: () => void
}

function SignatureCanvas({ onCapture, onClear }: SignatureCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const isDrawingRef = useRef(false)
	const lastPosRef = useRef<{ x: number; y: number } | null>(null)
	const hasStrokesRef = useRef(false)

	const getPos = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	): { x: number; y: number } => {
		const canvas = canvasRef.current!
		const rect = canvas.getBoundingClientRect()
		const scaleX = canvas.width / rect.width
		const scaleY = canvas.height / rect.height

		if ("touches" in e) {
			const touch = e.touches[0]
			return {
				x: (touch.clientX - rect.left) * scaleX,
				y: (touch.clientY - rect.top) * scaleY,
			}
		}
		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY,
		}
	}

	const startDrawing = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		e.preventDefault()
		isDrawingRef.current = true
		lastPosRef.current = getPos(e)
	}

	const draw = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		e.preventDefault()
		if (!isDrawingRef.current) return
		const canvas = canvasRef.current
		const ctx = canvas?.getContext("2d")
		if (!canvas || !ctx || !lastPosRef.current) return

		const pos = getPos(e)
		ctx.beginPath()
		ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
		ctx.lineTo(pos.x, pos.y)
		ctx.strokeStyle = "#111827"
		ctx.lineWidth = 2
		ctx.lineCap = "round"
		ctx.lineJoin = "round"
		ctx.stroke()
		lastPosRef.current = pos
		hasStrokesRef.current = true
	}

	const stopDrawing = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		e.preventDefault()
		if (!isDrawingRef.current) return
		isDrawingRef.current = false
		lastPosRef.current = null

		if (hasStrokesRef.current && canvasRef.current) {
			onCapture(canvasRef.current.toDataURL("image/png"))
		}
	}

	const handleClear = useCallback(() => {
		const canvas = canvasRef.current
		const ctx = canvas?.getContext("2d")
		if (!canvas || !ctx) return
		ctx.clearRect(0, 0, canvas.width, canvas.height)
		hasStrokesRef.current = false
		onClear()
	}, [onClear])

	// Set canvas background to white on mount
	useEffect(() => {
		const canvas = canvasRef.current
		const ctx = canvas?.getContext("2d")
		if (!canvas || !ctx) return
		ctx.fillStyle = "#ffffff"
		ctx.fillRect(0, 0, canvas.width, canvas.height)
	}, [])

	return (
		<div className="space-y-2">
			<div className="relative overflow-hidden rounded-md border bg-white">
				<canvas
					ref={canvasRef}
					width={600}
					height={180}
					className="block w-full cursor-crosshair touch-none"
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={stopDrawing}
					onMouseLeave={stopDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={stopDrawing}
				/>
				<div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center">
					<div className="h-px w-3/4 border-b border-dashed border-gray-300" />
				</div>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="gap-1.5"
				onClick={handleClear}
			>
				<RotateCcw className="size-3.5" />
				Clear
			</Button>
		</div>
	)
}

// ============================================================================
// Single Annex Panel
// ============================================================================

const ANNEX_META: Record<AnnexType, { title: string; description: string }> = {
	a: {
		title: "Annex A — PhilHealth Informed Consent",
		description:
			"Patient consent for PhilHealth data processing, use of benefits, and sharing of medical information for claim adjudication.",
	},
	b: {
		title: "Annex B — Member Empowerment Form",
		description:
			"Authorizes the attending physician and facility to file PhilHealth claims on behalf of the member.",
	},
}

interface AnnexPanelProps {
	annexType: AnnexType
	encounterId: string
	patientId: string
	existingSignature: import("@/features/msw/api/msw.hooks").AnnexSignature | null
}

function AnnexPanel({ annexType, encounterId, patientId, existingSignature }: AnnexPanelProps) {
	const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
	const [signedBy, setSignedBy] = useState("")
	const [witnessName, setWitnessName] = useState("")
	const createMutation = useCreateAnnexSignatureMutation()

	const meta = ANNEX_META[annexType]

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!signatureDataUrl) return

		createMutation.mutate(
			{
				encounterId,
				patientId,
				annexType,
				signatureDataUrl,
				signedBy: signedBy.trim(),
				witnessName: witnessName.trim() || undefined,
			},
			{
				onSuccess: () => {
					setSignatureDataUrl(null)
					setSignedBy("")
					setWitnessName("")
				},
			}
		)
	}

	// Already signed
	if (existingSignature) {
		return (
			<div className="space-y-3">
				<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
					<CheckCircle className="size-4 shrink-0" />
					<span>
						Signed by <span className="font-medium">{existingSignature.signedBy}</span>{" "}
						on{" "}
						{new Date(existingSignature.signedAt).toLocaleDateString(undefined, {
							day: "numeric",
							month: "long",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
						{existingSignature.witnessName && (
							<> · Witness: {existingSignature.witnessName}</>
						)}
					</span>
				</div>
				{existingSignature.signatureDataUrl && (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={existingSignature.signatureDataUrl}
						alt="Patient signature"
						className="max-h-24 rounded border bg-white p-2"
					/>
				)}
			</div>
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<p className="text-sm text-muted-foreground">{meta.description}</p>

			{/* Patient info */}
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor={`signedBy-${annexType}`}>Patient / Signatory Name</Label>
					<Input
						id={`signedBy-${annexType}`}
						value={signedBy}
						onChange={(e) => setSignedBy(e.target.value)}
						placeholder="Full name as signed"
						required
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor={`witness-${annexType}`}>Witness Name (optional)</Label>
					<Input
						id={`witness-${annexType}`}
						value={witnessName}
						onChange={(e) => setWitnessName(e.target.value)}
						placeholder="MSW staff or authorized witness"
					/>
				</div>
			</div>

			{/* Signature pad */}
			<div className="space-y-1.5">
				<Label>Signature</Label>
				<SignatureCanvas
					onCapture={(url) => setSignatureDataUrl(url)}
					onClear={() => setSignatureDataUrl(null)}
				/>
				<p className="text-xs text-muted-foreground">
					Sign in the box above using mouse or touch.
				</p>
			</div>

			{createMutation.isError && (
				<div className="flex items-center gap-2 text-sm text-destructive">
					<AlertCircle className="size-4 shrink-0" />
					<span>Failed to save signature. Please try again.</span>
				</div>
			)}

			<Button
				type="submit"
				disabled={createMutation.isPending || !signatureDataUrl || !signedBy.trim()}
			>
				{createMutation.isPending ? "Saving…" : `Capture ${annexType.toUpperCase()} Signature`}
			</Button>
		</form>
	)
}

// ============================================================================
// Main Component
// ============================================================================

interface AnnexSignatureCaptureProps {
	encounterId: string
	patientId: string
}

export function AnnexSignatureCapture({ encounterId, patientId }: AnnexSignatureCaptureProps) {
	const { data, isLoading } = useAnnexSignaturesQuery(encounterId)

	const annexA = data?.signatures.find((s) => s.annexType === "a") ?? null
	const annexB = data?.signatures.find((s) => s.annexType === "b") ?? null

	if (isLoading) {
		return (
			<Card>
				<CardContent className="py-6 text-center text-sm text-muted-foreground">
					Loading consent signatures…
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-4">
			{(["a", "b"] as AnnexType[]).map((annexType) => (
				<Card key={annexType}>
					<CardHeader>
						<CardTitle className="text-base">{ANNEX_META[annexType].title}</CardTitle>
					</CardHeader>
					<CardContent>
						<AnnexPanel
							annexType={annexType}
							encounterId={encounterId}
							patientId={patientId}
							existingSignature={annexType === "a" ? annexA : annexB}
						/>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
