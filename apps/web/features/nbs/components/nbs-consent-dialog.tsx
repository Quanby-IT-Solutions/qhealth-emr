"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { AlertCircle, CheckCircle, RotateCcw } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"

import {
	type CreateNbsConsentInput,
	type NbsConsentType,
	useCreateNbsConsentMutation,
	useNbsConsentQuery,
} from "@/features/nbs/api/nbs.hooks"

// ============================================================================
// Signature Canvas (reusable internally)
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
			if (!touch) return { x: 0, y: 0 }
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

	const stopDrawing = useCallback(() => {
		if (!isDrawingRef.current) return
		isDrawingRef.current = false
		lastPosRef.current = null
		if (hasStrokesRef.current && canvasRef.current) {
			onCapture(canvasRef.current.toDataURL("image/png"))
		}
	}, [onCapture])

	const clearCanvas = useCallback(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		ctx?.clearRect(0, 0, canvas.width, canvas.height)
		hasStrokesRef.current = false
		onClear()
	}, [onClear])

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		if (!ctx) return
		ctx.fillStyle = "#f9fafb"
		ctx.fillRect(0, 0, canvas.width, canvas.height)
		ctx.strokeStyle = "#d1d5db"
		ctx.lineWidth = 1
		ctx.setLineDash([4, 4])
		ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)
		ctx.setLineDash([])
	}, [])

	return (
		<div className="space-y-1.5">
			<canvas
				ref={canvasRef}
				width={560}
				height={150}
				className="w-full touch-none rounded border border-border cursor-crosshair"
				style={{ aspectRatio: "560/150" }}
				onMouseDown={startDrawing}
				onMouseMove={draw}
				onMouseUp={stopDrawing}
				onMouseLeave={stopDrawing}
				onTouchStart={startDrawing}
				onTouchMove={draw}
				onTouchEnd={stopDrawing}
			/>
			<div className="flex justify-end">
				<Button type="button" variant="ghost" size="sm" className="gap-1" onClick={clearCanvas}>
					<RotateCcw className="size-3.5" />
					Clear signature
				</Button>
			</div>
		</div>
	)
}

// ============================================================================
// Dialog
// ============================================================================

interface NbsConsentDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	nbsId: string
	encounterId: string
	patientId: string
	patientName?: string
}

export function NbsConsentDialog({
	open,
	onOpenChange,
	nbsId,
	encounterId,
	patientId,
	patientName,
}: NbsConsentDialogProps) {
	const { data: existing } = useNbsConsentQuery(nbsId)
	const createMutation = useCreateNbsConsentMutation()

	const [consentType, setConsentType] = useState<NbsConsentType>("consent")
	const [parentName, setParentName] = useState("")
	const [relationship, setRelationship] = useState("")
	const [waiverReason, setWaiverReason] = useState("")
	const [witnessName, setWitnessName] = useState("")
	const [signatureDataUrl, setSignatureDataUrl] = useState("")

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const input: CreateNbsConsentInput = {
			nbsId,
			encounterId,
			patientId,
			consentType,
			parentName: parentName.trim(),
			relationship: relationship.trim(),
			waiverReason: consentType === "waiver" ? waiverReason.trim() : undefined,
			signatureDataUrl: signatureDataUrl || undefined,
			witnessName: witnessName.trim() || undefined,
		}
		createMutation.mutate(input, { onSuccess: () => onOpenChange(false) })
	}

	// Read-only if already captured
	if (existing) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>NBS Consent / Waiver</DialogTitle>
						<DialogDescription>Consent already captured for this screening.</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 text-sm">
						<div>
							<p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
								Type
							</p>
							<p className="capitalize">{existing.consentType}</p>
						</div>
						<div>
							<p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
								Parent / Guardian
							</p>
							<p>
								{existing.parentName} ({existing.relationship})
							</p>
						</div>
						{existing.waiversReason && (
							<div>
								<p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
									Waiver Reason
								</p>
								<p>{existing.waiversReason}</p>
							</div>
						)}
						{existing.signatureDataUrl && (
							<div>
								<p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
									Signature
								</p>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={existing.signatureDataUrl}
									alt="Parent signature"
									className="max-h-24 rounded border border-border bg-muted/20"
								/>
							</div>
						)}
						<p className="text-muted-foreground text-xs">
							Signed {new Date(existing.signedAt).toLocaleString()} by{" "}
							<span className="font-medium">{existing.performedByName}</span>
						</p>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>NBS Consent / Waiver</DialogTitle>
					<DialogDescription>
						{patientName
							? `Capture parental consent or waiver for ${patientName}'s newborn screening.`
							: "Capture parental consent or waiver for this newborn screening."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="consentType">Decision</Label>
						<Select
							value={consentType}
							onValueChange={(v) => setConsentType(v as NbsConsentType)}
						>
							<SelectTrigger id="consentType">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="consent">Consent — parent agrees to screening</SelectItem>
								<SelectItem value="waiver">
									Waiver — parent declines screening
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="parentName">
								Parent / Guardian Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id="parentName"
								placeholder="Full name"
								value={parentName}
								onChange={(e) => setParentName(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="relationship">
								Relationship <span className="text-destructive">*</span>
							</Label>
							<Input
								id="relationship"
								placeholder="e.g. Mother, Father, Guardian"
								value={relationship}
								onChange={(e) => setRelationship(e.target.value)}
								required
							/>
						</div>
					</div>

					{consentType === "waiver" && (
						<div className="space-y-1.5">
							<Label htmlFor="waiverReason">
								Reason for Waiver <span className="text-destructive">*</span>
							</Label>
							<Textarea
								id="waiverReason"
								rows={2}
								placeholder="State the reason for declining NBS…"
								value={waiverReason}
								onChange={(e) => setWaiverReason(e.target.value)}
								required={consentType === "waiver"}
							/>
						</div>
					)}

					<div className="space-y-1.5">
						<Label>Parent / Guardian Signature</Label>
						<SignatureCanvas
							onCapture={setSignatureDataUrl}
							onClear={() => setSignatureDataUrl("")}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="witnessName">Witness Name (optional)</Label>
						<Input
							id="witnessName"
							placeholder="Witness full name"
							value={witnessName}
							onChange={(e) => setWitnessName(e.target.value)}
						/>
					</div>

					{createMutation.isError && (
						<div className="flex items-center gap-2 text-sm text-destructive">
							<AlertCircle className="size-4 shrink-0" />
							<span>Failed to save consent. Please try again.</span>
						</div>
					)}
					{createMutation.isSuccess && (
						<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
							<CheckCircle className="size-4 shrink-0" />
							<span>Consent captured successfully.</span>
						</div>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? "Saving…" : "Save Consent"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
