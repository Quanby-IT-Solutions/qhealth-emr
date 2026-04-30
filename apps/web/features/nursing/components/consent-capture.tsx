"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { AlertCircle, CheckCircle, RotateCcw } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"

// ============================================================================
// Consent Types
// ============================================================================

export type ConsentType =
	| "dpa_disclosure"
	| "procedure_consent"
	| "photography_video"
	| "telemedicine"
	| "nbs_parental"
	| "blood_transfusion"
	| "surgery_anesthesia"
	| "data_sharing_philhealth"

export const CONSENT_TEMPLATES: Record<
	ConsentType,
	{ title: string; text: string; requiresWitness: boolean }
> = {
	dpa_disclosure: {
		title: "Data Privacy Disclosure (RA 10173)",
		text: `I acknowledge that this facility will collect, process, and store my personal and sensitive health information in accordance with the Data Privacy Act of 2012 (Republic Act 10173). I understand that my data will be used solely for my medical care and for legally mandated health reporting. I have the right to access, correct, and (where applicable) object to the processing of my personal data.`,
		requiresWitness: true,
	},
	procedure_consent: {
		title: "Informed Consent for Procedure",
		text: `I voluntarily consent to the proposed medical procedure or intervention as explained to me by my attending physician. The nature, purpose, risks, benefits, and alternatives have been discussed with me in a language I understand. I have had the opportunity to ask questions and all my questions have been answered to my satisfaction.`,
		requiresWitness: true,
	},
	photography_video: {
		title: "Photography / Video Recording Consent",
		text: `I consent to photography, video recording, or illustration of my medical condition for the purposes of medical documentation, education, or publication. I understand that my identity may be concealed at my request. I may withdraw this consent at any time without affecting my medical care.`,
		requiresWitness: false,
	},
	telemedicine: {
		title: "Telemedicine Consultation Consent",
		text: `I consent to receive medical consultation and services through telemedicine (electronic communications). I understand the limitations of telemedicine, including the inability to perform physical examination, and that an in-person visit may be required. I agree that my health information may be transmitted electronically during the consultation.`,
		requiresWitness: false,
	},
	nbs_parental: {
		title: "Newborn Screening Parental Consent",
		text: `I consent to the collection of a blood specimen from my newborn child for the purpose of Universal Newborn Screening as mandated by Republic Act 9288 (Newborn Screening Act of 2004). I understand the conditions tested and the importance of early detection and treatment. I have been given the opportunity to ask questions about the procedure.`,
		requiresWitness: true,
	},
	blood_transfusion: {
		title: "Blood Transfusion Consent",
		text: `I consent to the administration of blood or blood products as recommended by my physician. The risks (including transfusion reactions and rare infectious complications), benefits, and alternatives have been explained to me. I understand that blood products used are screened and tested in accordance with safety standards.`,
		requiresWitness: true,
	},
	surgery_anesthesia: {
		title: "Surgery and Anesthesia Consent",
		text: `I consent to the surgical procedure and administration of anesthesia as recommended by my surgeon and anesthesiologist. The nature of the procedure, associated risks, potential complications, expected benefits, and alternative treatments have been fully explained to me. I acknowledge that no guarantees have been made regarding the outcome.`,
		requiresWitness: true,
	},
	data_sharing_philhealth: {
		title: "PhilHealth Data Sharing Consent",
		text: `I authorize this healthcare facility to share my relevant medical information and claims data with the Philippine Health Insurance Corporation (PhilHealth) for the purposes of benefit processing, eligibility verification, and compliance with national health insurance program requirements under R.A. 11223.`,
		requiresWitness: false,
	},
}

// ============================================================================
// Signature Canvas (reusable)
// ============================================================================

export interface SignatureCanvasProps {
	label?: string
	onCapture: (dataUrl: string) => void
	onClear: () => void
	disabled?: boolean
}

export function SignatureCanvas({ label, onCapture, onClear, disabled }: SignatureCanvasProps) {
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
		if (disabled) return
		e.preventDefault()
		isDrawingRef.current = true
		lastPosRef.current = getPos(e)
	}

	const draw = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		if (disabled) return
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
	}, [])

	return (
		<div className="space-y-1">
			{label && <Label className="text-xs">{label}</Label>}
			<div className="relative rounded-md border bg-gray-50 dark:bg-gray-900">
				<canvas
					ref={canvasRef}
					width={600}
					height={120}
					className={`w-full touch-none rounded-md ${disabled ? "cursor-not-allowed opacity-50" : "cursor-crosshair"}`}
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={stopDrawing}
					onMouseLeave={stopDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={stopDrawing}
				/>
				{!disabled && (
					<button
						type="button"
						className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted"
						onClick={clearCanvas}
						aria-label="Clear signature"
					>
						<RotateCcw className="size-3.5" />
					</button>
				)}
			</div>
			<p className="text-xs text-muted-foreground">Sign above using mouse or touch</p>
		</div>
	)
}

// ============================================================================
// Main Consent Capture Component
// ============================================================================

interface ConsentCaptureResult {
	consentType: ConsentType
	patientSignatureDataUrl: string
	witnessSignatureDataUrl: string | null
	capturedAt: string
}

interface ConsentCaptureProps {
	consentType: ConsentType
	patientName?: string
	onComplete?: (result: ConsentCaptureResult) => void
	onCancel?: () => void
}

export function ConsentCapture({
	consentType,
	patientName,
	onComplete,
	onCancel,
}: ConsentCaptureProps) {
	const template = CONSENT_TEMPLATES[consentType]
	const [patientSig, setPatientSig] = useState("")
	const [witnessSig, setWitnessSig] = useState("")
	const [saved, setSaved] = useState(false)

	const canSave = patientSig !== "" && (!template.requiresWitness || witnessSig !== "")

	function handleSave() {
		const result: ConsentCaptureResult = {
			consentType,
			patientSignatureDataUrl: patientSig,
			witnessSignatureDataUrl: template.requiresWitness ? witnessSig : null,
			capturedAt: new Date().toISOString(),
		}
		setSaved(true)
		onComplete?.(result)
	}

	if (saved) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-10 text-center">
					<CheckCircle className="size-12 text-green-500 mb-3" />
					<p className="font-semibold">Consent Captured</p>
					<p className="text-sm text-muted-foreground mt-1">
						{template.title} has been signed and archived.
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-5">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="font-semibold">{template.title}</h3>
					{patientName && (
						<p className="text-sm text-muted-foreground">Patient: {patientName}</p>
					)}
				</div>
				{template.requiresWitness && (
					<Badge variant="secondary">Witness Required</Badge>
				)}
			</div>

			{/* Consent Text */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
						Consent Statement
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm leading-relaxed">{template.text}</p>
					<p className="text-xs text-muted-foreground mt-4">
						Date &amp; Time: {new Date().toLocaleString("en-PH")}
					</p>
				</CardContent>
			</Card>

			{/* Signatures */}
			<div className="space-y-4">
				<SignatureCanvas
					label={`Patient / Authorized Proxy Signature${patientName ? ` (${patientName})` : ""}`}
					onCapture={setPatientSig}
					onClear={() => setPatientSig("")}
				/>

				{template.requiresWitness && (
					<SignatureCanvas
						label="Nurse / Witness Signature"
						onCapture={setWitnessSig}
						onClear={() => setWitnessSig("")}
					/>
				)}
			</div>

			{/* Validation */}
			{!canSave && (patientSig !== "" || witnessSig !== "") && (
				<div className="flex items-center gap-2 text-sm text-amber-600">
					<AlertCircle className="size-4" />
					{template.requiresWitness
						? "Both patient and witness signatures are required."
						: "Patient signature is required."}
				</div>
			)}

			{/* Actions */}
			<div className="flex justify-end gap-2">
				{onCancel && (
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<Button onClick={handleSave} disabled={!canSave}>
					Save &amp; Archive Consent
				</Button>
			</div>
		</div>
	)
}
