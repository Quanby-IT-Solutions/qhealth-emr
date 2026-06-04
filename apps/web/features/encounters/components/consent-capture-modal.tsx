"use client"

import { useEffect, useState } from "react"
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import { SignatureCanvas } from "@/features/nursing/components/consent-capture"

type ConsentRelationship = "self" | "parent" | "guardian" | "spouse" | "other"

export interface ConsentCapturePayload {
	rightsAcknowledged: true
	relationship: ConsentRelationship
	signatureData: {
		capturedAt: string
		dataUrl: string
	}
	signedByName: string
}

interface ConsentCaptureModalProps {
	onCancel: () => void
	onConsented: (payload: ConsentCapturePayload) => void
	open: boolean
	patientName: string
	submitting?: boolean
	error?: string | null
}

export function ConsentCaptureModal({
	onCancel,
	onConsented,
	open,
	patientName,
	submitting = false,
	error,
}: ConsentCaptureModalProps) {
	const [signedByName, setSignedByName] = useState("")
	const [relationship, setRelationship] = useState<ConsentRelationship>("self")
	const [rightsAcknowledged, setRightsAcknowledged] = useState(false)
	const [signatureDataUrl, setSignatureDataUrl] = useState("")

	useEffect(() => {
		if (open) {
			return
		}

		setSignedByName("")
		setRelationship("self")
		setRightsAcknowledged(false)
		setSignatureDataUrl("")
	}, [open])

	const isValid =
		signedByName.trim().length > 0 && rightsAcknowledged && signatureDataUrl.length > 0

	function handleSubmit() {
		if (!isValid) {
			return
		}

		onConsented({
			rightsAcknowledged: true,
			relationship,
			signatureData: {
				capturedAt: new Date().toISOString(),
				dataUrl: signatureDataUrl,
			},
			signedByName: signedByName.trim(),
		})
	}

	return (
		<Dialog
			open={open}
			onOpenChange={nextOpen => {
				if (!nextOpen) onCancel()
			}}
		>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<ShieldCheck className="size-5 text-blue-600" />
						<DialogTitle>Data Privacy Act (DPA) Consent</DialogTitle>
					</div>
					<DialogDescription>
						Capture the patient or representative acknowledgment before we continue with encounter
						creation for {patientName}.
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[60vh] pr-2">
					<div className="space-y-5 py-2">
						<div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
							<p className="font-semibold">Privacy Notice</p>
							<p className="mt-1">
								This facility collects and processes personal and sensitive health information in
								compliance with RA 10173 (Data Privacy Act of 2012). Information captured here is
								used for care delivery, facility operations, and legally required reporting.
							</p>
						</div>

						<div className="space-y-2">
							<Label className="font-semibold">Rights of the Data Subject</Label>
							<ul className="text-muted-foreground ml-4 list-disc space-y-1 text-sm">
								<li>Right to be informed of how personal data will be used</li>
								<li>Right to access the personal data held by this facility</li>
								<li>Right to correct incomplete or inaccurate data</li>
								<li>Right to object to processing in certain circumstances</li>
								<li>Right to withdraw consent subject to legal and clinical limits</li>
								<li>Right to file a complaint with the National Privacy Commission</li>
							</ul>
						</div>

						<Separator />

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="encounter-consent-signed-by">
									Signed By (Full Name) <span className="text-red-500">*</span>
								</Label>
								<Input
									id="encounter-consent-signed-by"
									placeholder="Full name of the patient or representative"
									value={signedByName}
									onChange={event => setSignedByName(event.target.value)}
								/>
							</div>

							<div className="space-y-1.5">
								<Label>Relationship to Patient</Label>
								<Select
									value={relationship}
									onValueChange={value => setRelationship(value as ConsentRelationship)}
								>
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

						<div className="flex items-start gap-2">
							<Checkbox
								id="encounter-consent-rights-ack"
								checked={rightsAcknowledged}
								onCheckedChange={checked => setRightsAcknowledged(checked === true)}
							/>
							<label
								htmlFor="encounter-consent-rights-ack"
								className="cursor-pointer text-sm leading-snug"
							>
								I have read and understood the privacy notice and my rights as a data subject under
								RA 10173. I voluntarily allow the facility to process the patient&apos;s personal
								and health information for care delivery and related operations.
							</label>
						</div>

						<div className="space-y-1.5">
							<Label>
								Digital Signature <span className="text-red-500">*</span>
							</Label>
							<SignatureCanvas
								label="Sign using a mouse or touchscreen"
								onCapture={dataUrl => setSignatureDataUrl(dataUrl)}
								onClear={() => setSignatureDataUrl("")}
								disabled={submitting}
							/>
						</div>
					</div>
				</ScrollArea>

				<DialogFooter className="flex-col gap-2 sm:flex-col">
					{error ? <p className="text-destructive w-full text-sm">{error}</p> : null}
					<div className="flex w-full justify-end gap-2">
						<Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
							Cancel
						</Button>
						<Button type="button" onClick={handleSubmit} disabled={!isValid || submitting}>
							{submitting ? "Saving Consent..." : "Capture Consent & Continue"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
