"use client"

import { useState } from "react"

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
import { useCreateConsentMutation } from "@/features/clinical-docs/api/clinical-docs.hooks"

const CONSENT_TYPES = [
	{ value: "general", label: "General Consent" },
	{ value: "procedure", label: "Procedure Consent" },
	{ value: "research", label: "Research Consent" },
	{ value: "blood_transfusion", label: "Blood Transfusion" },
	{ value: "surgery", label: "Surgery Consent" },
] as const

const RELATIONSHIPS = [
	{ value: "self", label: "Self" },
	{ value: "parent", label: "Parent" },
	{ value: "guardian", label: "Guardian" },
	{ value: "spouse", label: "Spouse" },
	{ value: "other", label: "Other" },
] as const

interface CreateConsentDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	facilityId: string
	patientId: string
}

export function CreateConsentDialog({
	open,
	onOpenChange,
	encounterId,
	facilityId,
	patientId,
}: CreateConsentDialogProps) {
	const [consentType, setConsentType] = useState<string>("")
	const [signedByName, setSignedByName] = useState("")
	const [relationship, setRelationship] = useState<string>("self")
	const [content, setContent] = useState("")

	const createConsent = useCreateConsentMutation()

	function resetForm() {
		setConsentType("")
		setSignedByName("")
		setRelationship("self")
		setContent("")
	}

	function handleSubmit() {
		if (!consentType || !signedByName.trim()) return
		createConsent.mutate(
			{
				facilityId,
				encounterId,
				patientId,
				consentType: consentType as
					"general" | "procedure" | "research" | "blood_transfusion" | "surgery",
				signedByName: signedByName.trim(),
				relationship: relationship as "self" | "parent" | "guardian" | "spouse" | "other",
				content: content || undefined,
			},
			{
				onSuccess: () => {
					resetForm()
					onOpenChange(false)
				},
			}
		)
	}

	const isValid = !!consentType && !!signedByName.trim()

	return (
		<Dialog
			open={open}
			onOpenChange={v => {
				if (!v) resetForm()
				onOpenChange(v)
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Capture Consent</DialogTitle>
					<DialogDescription>
						Record the patient or representative's consent for the selected procedure or treatment.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label>Consent Type *</Label>
						<Select value={consentType} onValueChange={v => setConsentType(v ?? "")}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CONSENT_TYPES.map(t => (
									<SelectItem key={t.value} value={t.value}>
										{t.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>Signed By (Full Name) *</Label>
						<Input
							placeholder="Full name of signer…"
							value={signedByName}
							onChange={e => setSignedByName(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label>Relationship to Patient</Label>
						<Select value={relationship} onValueChange={v => setRelationship(v ?? "self")}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{RELATIONSHIPS.map(r => (
									<SelectItem key={r.value} value={r.value}>
										{r.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>Consent Details (optional)</Label>
						<Textarea
							rows={4}
							placeholder="Additional consent information or procedure description…"
							value={content}
							onChange={e => setContent(e.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => {
							resetForm()
							onOpenChange(false)
						}}
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!isValid || createConsent.isPending}>
						{createConsent.isPending ? "Recording…" : "Record Consent"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
