"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { ShieldCheck } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
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
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Separator } from "@/core/components/ui/separator"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { useCreateConsentMutation } from "@/features/clinical-docs/api/clinical-docs.hooks"

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

	const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		e.preventDefault()
		isDrawingRef.current = true
		lastPosRef.current = getPos(e)
	}

	const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		e.preventDefault()
		if (!isDrawingRef.current || !canvasRef.current) return
		const ctx = canvasRef.current.getContext("2d")!
		const pos = getPos(e)
		ctx.beginPath()
		ctx.moveTo(lastPosRef.current!.x, lastPosRef.current!.y)
		ctx.lineTo(pos.x, pos.y)
		ctx.strokeStyle = "#1e293b"
		ctx.lineWidth = 2
		ctx.lineCap = "round"
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

	const handleClear = () => {
		if (!canvasRef.current) return
		const ctx = canvasRef.current.getContext("2d")!
		ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
		hasStrokesRef.current = false
		onClear()
	}

	return (
		<div className="space-y-1">
			<div className="relative rounded-md border bg-white">
				<canvas
					ref={canvasRef}
					width={540}
					height={130}
					className="w-full cursor-crosshair touch-none rounded-md"
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={stopDrawing}
					onMouseLeave={stopDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={stopDrawing}
				/>
			</div>
			<div className="flex justify-end">
				<Button type="button" variant="ghost" size="sm" onClick={handleClear}>
					Clear
				</Button>
			</div>
		</div>
	)
}

// ============================================================================
// DPA Consent Modal
// ============================================================================

const DPA_PURPOSES = [
	{ value: "treatment", label: "Medical Treatment" },
	{ value: "billing", label: "Billing & Claims Processing" },
	{ value: "research", label: "Clinical Research" },
	{ value: "quality_improvement", label: "Quality Improvement" },
	{ value: "referral", label: "Referral to Other Providers" },
	{ value: "public_health", label: "Public Health Reporting" },
] as const

type DpaPurpose = (typeof DPA_PURPOSES)[number]["value"]

interface DpaConsentModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	facilityId: string
	patientId: string
	patientName?: string
}

export function DpaConsentModal({
	open,
	onOpenChange,
	encounterId,
	facilityId,
	patientId,
	patientName,
}: DpaConsentModalProps) {
	const [signedByName, setSignedByName] = useState("")
	const [relationship, setRelationship] = useState<string>("self")
	const [selectedPurposes, setSelectedPurposes] = useState<DpaPurpose[]>(["treatment"])
	const [rightsAcknowledged, setRightsAcknowledged] = useState(false)
	const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)

	const createConsent = useCreateConsentMutation()

	function resetForm() {
		setSignedByName("")
		setRelationship("self")
		setSelectedPurposes(["treatment"])
		setRightsAcknowledged(false)
		setSignatureDataUrl(null)
	}

	useEffect(() => {
		if (!open) resetForm()
	}, [open])

	function togglePurpose(purpose: DpaPurpose) {
		setSelectedPurposes(prev =>
			prev.includes(purpose) ? prev.filter(p => p !== purpose) : [...prev, purpose]
		)
	}

	const isValid =
		!!signedByName.trim() &&
		selectedPurposes.length > 0 &&
		rightsAcknowledged &&
		!!signatureDataUrl

	function handleSubmit() {
		if (!isValid) return

		const content = JSON.stringify({
			purposes: selectedPurposes,
			relationship,
			rightsAcknowledged,
		})

		createConsent.mutate(
			{
				facilityId,
				encounterId,
				patientId,
				// DPA is an extended type — cast to satisfy existing contract
				consentType: "dpa" as "general",
				signedByName: signedByName.trim(),
				relationship: relationship as "self" | "parent" | "guardian" | "spouse" | "other",
				content,
				signatureData: signatureDataUrl,
			},
			{
				onSuccess: () => {
					resetForm()
					onOpenChange(false)
				},
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<ShieldCheck className="size-5 text-blue-600" />
						<DialogTitle>Data Privacy Act (DPA) Consent</DialogTitle>
					</div>
					<DialogDescription>
						Capture informed consent for the collection, use, and processing of{" "}
						{patientName ? `${patientName}'s` : "the patient's"} personal health information under
						Republic Act 10173.
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[60vh] pr-2">
					<div className="space-y-5 py-2">
						{/* Notice */}
						<div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
							<p className="font-semibold">Privacy Notice</p>
							<p className="mt-1">
								This facility collects and processes personal and sensitive health information in
								compliance with RA 10173 (Data Privacy Act of 2012). Your information will be used
								only for the purposes you consent to below and will not be shared with third parties
								without your explicit consent unless required by law.
							</p>
						</div>

						{/* Purpose of Processing */}
						<div className="space-y-3">
							<Label className="font-semibold">
								Purpose of Data Processing <span className="text-red-500">*</span>
							</Label>
							<div className="grid grid-cols-2 gap-2">
								{DPA_PURPOSES.map(({ value, label }) => (
									<div key={value} className="flex items-center gap-2">
										<Checkbox
											id={`purpose-${value}`}
											checked={selectedPurposes.includes(value)}
											onCheckedChange={() => togglePurpose(value)}
										/>
										<label htmlFor={`purpose-${value}`} className="cursor-pointer text-sm">
											{label}
										</label>
									</div>
								))}
							</div>
						</div>

						<Separator />

						{/* Data Subject Rights */}
						<div className="space-y-2">
							<Label className="font-semibold">Rights of the Data Subject</Label>
							<ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
								<li>Right to be informed of how your data will be used</li>
								<li>Right to access your personal data held by this facility</li>
								<li>Right to correct inaccurate data</li>
								<li>Right to object to processing in certain circumstances</li>
								<li>Right to withdraw consent at any time</li>
								<li>Right to data portability upon reasonable request</li>
								<li>Right to file a complaint with the National Privacy Commission</li>
							</ul>
						</div>

						<Separator />

						{/* Signer Info */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label>
									Signed By (Full Name) <span className="text-red-500">*</span>
								</Label>
								<Input
									placeholder="Full name of data subject or representative…"
									value={signedByName}
									onChange={e => setSignedByName(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Relationship to Patient</Label>
								<Select value={relationship} onValueChange={v => setRelationship(v ?? "self")}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="self">Self (Patient)</SelectItem>
										<SelectItem value="parent">Parent</SelectItem>
										<SelectItem value="guardian">Legal Guardian</SelectItem>
										<SelectItem value="spouse">Spouse</SelectItem>
										<SelectItem value="other">Other Authorized Representative</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Rights Acknowledgment */}
						<div className="flex items-start gap-2">
							<Checkbox
								id="rights-ack"
								checked={rightsAcknowledged}
								onCheckedChange={v => setRightsAcknowledged(!!v)}
							/>
							<label htmlFor="rights-ack" className="cursor-pointer text-sm leading-snug">
								I have read and understood the Privacy Notice and my rights as a data subject under RA
								10173. I freely and voluntarily give my consent to the collection and processing of my
								personal health information for the purposes selected above.
							</label>
						</div>

						{/* Signature */}
						<div className="space-y-1.5">
							<Label>
								Digital Signature <span className="text-red-500">*</span>
							</Label>
							<p className="text-xs text-muted-foreground">
								Sign in the box below using your mouse or touchscreen.
							</p>
							<SignatureCanvas
								onCapture={dataUrl => setSignatureDataUrl(dataUrl)}
								onClear={() => setSignatureDataUrl(null)}
							/>
							{signatureDataUrl && (
								<p className="text-xs text-green-600">✓ Signature captured</p>
							)}
						</div>
					</div>
				</ScrollArea>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={createConsent.isPending}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!isValid || createConsent.isPending}>
						{createConsent.isPending ? "Recording…" : "Record DPA Consent"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
