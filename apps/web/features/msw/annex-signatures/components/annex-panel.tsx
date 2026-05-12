"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle } from "lucide-react"

import { Button } from "@/core/components/ui/button"

import { useAnnexSignatureListQuery, useCaptureAnnexSignatureMutation } from "../api/annex.hooks"
import { SignatureCanvas } from "./signature-canvas"

// ============================================================================
// Annex consent text
// ============================================================================

type AnnexType = "a" | "b"

const ANNEX_TEXT: Record<AnnexType, { title: string; body: string }> = {
	a: {
		title: "Annex A — PhilHealth Informed Consent",
		body: `INFORMED CONSENT FORM (ANNEX A)

I, the undersigned patient or authorized representative, hereby consent to the use of PhilHealth benefits for the medical services to be rendered.

I understand that:
1. My PhilHealth benefits will be used to cover eligible medical services.
2. The hospital is authorized to file claims on my behalf.
3. Any amount not covered by PhilHealth shall be my responsibility.
4. My personal and medical information may be shared with PhilHealth for claims processing.
5. I have the right to withdraw consent at any time before the procedure.

I confirm that I have read and understood the above information, and I voluntarily give my consent.

Patient's Rights and Responsibilities:
• Right to receive quality health care regardless of membership category.
• Right to be informed of the benefits, limitations, and exclusions of PhilHealth coverage.
• Right to receive itemized billing statements.
• Responsibility to present valid PhilHealth ID or MDR at the time of admission.
• Responsibility to cooperate with the facility's billing procedures.

Data Privacy Notice:
Your personal data will be collected and processed solely for the purposes of PhilHealth claims processing and benefit availment. Your data is protected under the Data Privacy Act of 2012 (RA 10173).`,
	},
	b: {
		title: "Annex B — Member Empowerment Form",
		body: `MEMBER EMPOWERMENT FORM (ANNEX B)

I, the undersigned PhilHealth member, acknowledge the following:

1. I have been informed of my PhilHealth benefits and the No-Balance Billing (NBB) policy.
2. I understand that under NBB, I should not be charged for services covered by PhilHealth.
3. I have the right to receive itemized billing and to question any charges.
4. I authorize the hospital to submit claims to PhilHealth on my behalf.
5. I have been informed of my rights as a PhilHealth member.
6. I may report any violations to PhilHealth hotlines or the nearest PhilHealth office.

No-Balance Billing (NBB) Coverage:
• All services included in the Case Rate shall be covered at no additional cost.
• Room and board up to the prescribed rate shall be provided at no extra charge.
• Professional fees within the NBB rate shall not be charged separately.

Reporting Violations:
• PhilHealth Action Center: 8441-7444
• Text: 0917-898-7442
• Email: actioncenter@philhealth.gov.ph
• Walk-in: nearest PhilHealth office

I have voluntarily signed this form after being fully informed of my rights as a PhilHealth member.`,
	},
}

// ============================================================================
// AnnexPanel
// ============================================================================

interface AnnexPanelProps {
	annexType: AnnexType
	encounterId: string
}

export function AnnexPanel({ annexType, encounterId }: AnnexPanelProps) {
	const [canSign, setCanSign] = useState(false)
	const [patientSignature, setPatientSignature] = useState<string | null>(null)
	const [witnessSignature, setWitnessSignature] = useState<string | null>(null)
	const [submitted, setSubmitted] = useState(false)

	const apiType = annexType.toUpperCase() as "A" | "B"

	const { data } = useAnnexSignatureListQuery({ encounterId, annexType: apiType })
	const captureMutation = useCaptureAnnexSignatureMutation()

	const existingSignature = data?.find(s => s.annexType === apiType) ?? null
	const meta = ANNEX_TEXT[annexType]

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const el = e.currentTarget
		if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) {
			setCanSign(true)
		}
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!patientSignature) return

		captureMutation.mutate(
			{
				encounterId,
				annexType: apiType,
				patientSignaturePngBase64: patientSignature,
				witnessSignaturePngBase64: witnessSignature ?? undefined,
			},
			{
				onSuccess: () => setSubmitted(true),
			}
		)
	}

	if (submitted || existingSignature) {
		const sig = existingSignature
		return (
			<div className="flex flex-col items-center gap-4 py-10 text-center">
				<CheckCircle className="size-10 text-green-500" />
				<div>
					<p className="font-medium">
						Annex {annexType.toUpperCase()} signed and archived.
					</p>
					{sig && (
						<p className="mt-1 text-xs text-muted-foreground">
							Signed{" "}
							{new Date(sig.signedAt).toLocaleDateString(undefined, {
								day: "numeric",
								month: "long",
								year: "numeric",
							})}
						</p>
					)}
				</div>
				{sig?.patientSignatureUri && (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={sig.patientSignatureUri}
						alt="Patient signature"
						className="max-h-20 rounded border bg-white p-2"
					/>
				)}
				<Link href="/msw/signed-forms">
					<Button variant="outline" size="sm">
						View Signed Forms Archive
					</Button>
				</Link>
			</div>
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Scrollable consent text */}
			<div
				onScroll={handleScroll}
				className="h-52 overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed"
			>
				<pre className="whitespace-pre-wrap font-sans">{meta.body}</pre>
			</div>

			{!canSign && (
				<p className="text-xs text-muted-foreground">
					↓ Scroll to the bottom to enable signing
				</p>
			)}

			{canSign && (
				<div className="space-y-4">
					<SignatureCanvas
						label="Patient Signature"
						onChange={setPatientSignature}
					/>
					<SignatureCanvas
						label="Witness Signature (Social Worker)"
						onChange={setWitnessSignature}
					/>

					<p className="text-xs text-muted-foreground">
						Sign in the boxes above using mouse or touch. Witness signature is optional.
					</p>

					{captureMutation.isError && (
						<div className="flex items-center gap-2 text-sm text-destructive">
							<AlertCircle className="size-4 shrink-0" />
							<span>Failed to save signature. Please try again.</span>
						</div>
					)}

					<Button
						type="submit"
						disabled={captureMutation.isPending || !patientSignature}
						className="w-full sm:w-auto"
					>
						{captureMutation.isPending
							? "Saving…"
							: `Submit Annex ${annexType.toUpperCase()} & Archive`}
					</Button>
				</div>
			)}
		</form>
	)
}
