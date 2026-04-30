"use client"

import { useState } from "react"

import { Shield } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"

import {
	type ConsentType,
	CONSENT_TEMPLATES,
	ConsentCapture,
} from "./consent-capture"

// ============================================================================
// Consent Library
// ============================================================================

interface ConsentLibraryProps {
	patientName?: string
	onConsentSaved?: (type: ConsentType) => void
}

const CONSENT_GROUPS: Array<{
	label: string
	types: ConsentType[]
}> = [
	{
		label: "Administrative & Privacy",
		types: ["dpa_disclosure", "data_sharing_philhealth"],
	},
	{
		label: "Clinical Procedures",
		types: [
			"procedure_consent",
			"surgery_anesthesia",
			"blood_transfusion",
		],
	},
	{
		label: "Specialized",
		types: ["photography_video", "telemedicine", "nbs_parental"],
	},
]

export function ConsentLibrary({ patientName, onConsentSaved }: ConsentLibraryProps) {
	const [selected, setSelected] = useState<ConsentType | null>(null)
	const [completed, setCompleted] = useState<ConsentType[]>([])

	if (selected) {
		return (
			<div className="space-y-4">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setSelected(null)}
					className="text-muted-foreground"
				>
					← Back to Consent Library
				</Button>
				<ConsentCapture
					consentType={selected}
					patientName={patientName}
					onComplete={() => {
						setCompleted((prev) => [...new Set([...prev, selected])])
						onConsentSaved?.(selected)
						setSelected(null)
					}}
					onCancel={() => setSelected(null)}
				/>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="font-semibold flex items-center gap-2">
					<Shield className="size-4" />
					Consent Library
				</h3>
				<p className="text-sm text-muted-foreground mt-0.5">
					Select a consent form to capture the patient's or proxy's electronic signature.
				</p>
			</div>

			{CONSENT_GROUPS.map((group) => (
				<div key={group.label}>
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
						{group.label}
					</p>
					<div className="space-y-2">
						{group.types.map((type) => {
							const template = CONSENT_TEMPLATES[type]
							const isDone = completed.includes(type)
							return (
								<Card
									key={type}
									className={`cursor-pointer transition-colors hover:bg-muted/50 ${isDone ? "opacity-60" : ""}`}
									onClick={() => setSelected(type)}
								>
									<CardContent className="flex items-center justify-between py-3 px-4">
										<div>
											<p className="text-sm font-medium">{template.title}</p>
											{template.requiresWitness && (
												<p className="text-xs text-muted-foreground">
													Witness signature required
												</p>
											)}
										</div>
										{isDone ? (
											<Badge className="bg-green-600 text-white">Signed</Badge>
										) : (
											<Badge variant="outline">Pending</Badge>
										)}
									</CardContent>
								</Card>
							)
						})}
					</div>
				</div>
			))}
		</div>
	)
}
