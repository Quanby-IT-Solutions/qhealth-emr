"use client"

import { useState } from "react"

import { AlertTriangle, CheckCircle2, FileCheck, Loader2, Send } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import { Separator } from "@/core/components/ui/separator"

import {
	useGenerateCf4Mutation,
	useFinalizeCf4Mutation,
} from "../api/billing.hooks"

interface Cf4PreviewProps {
	encounterId: string
	facilityId: string
	patientId: string
}

interface ExtractedData {
	chiefComplaint: string | null
	briefHistory: string | null
	vitalSigns: Record<string, unknown> | null
	diagnoses: { code: string; displayName: string }[]
	procedures: { rvsCode: string | null; description: string }[]
	managementPlan: string | null
}

interface Cf4PreviewState {
	cf4: { id: string; status: string }
	extractedData: ExtractedData
	missingFields: string[]
}

export function Cf4Preview({ encounterId, facilityId, patientId }: Cf4PreviewProps) {
	const [preview, setPreview] = useState<Cf4PreviewState | null>(null)

	// Editable overrides
	const [chiefComplaint, setChiefComplaint] = useState("")
	const [briefHistory, setBriefHistory] = useState("")
	const [managementPlan, setManagementPlan] = useState("")

	const generateCf4 = useGenerateCf4Mutation()
	const finalizeCf4 = useFinalizeCf4Mutation()

	function handleGenerate() {
		generateCf4.mutate(
			{ facilityId, encounterId, patientId },
			{
				onSuccess: (data) => {
					setPreview(data)
					setChiefComplaint(data.extractedData.chiefComplaint ?? "")
					setBriefHistory(data.extractedData.briefHistory ?? "")
					setManagementPlan(data.extractedData.managementPlan ?? "")
				},
			}
		)
	}

	function handleFinalize() {
		if (!preview) return
		finalizeCf4.mutate(
			{
				id: preview.cf4.id,
				submissionData: {
					chiefComplaint: chiefComplaint || preview.extractedData.chiefComplaint,
					briefHistory: briefHistory || preview.extractedData.briefHistory,
					managementPlan: managementPlan || preview.extractedData.managementPlan,
					diagnoses: preview.extractedData.diagnoses,
					procedures: preview.extractedData.procedures,
					vitalSigns: preview.extractedData.vitalSigns,
				},
			},
			{ onSuccess: () => setPreview(null) }
		)
	}

	function handleExportEclaims() {
		// Pending integration with PhilHealth eClaims gateway
		alert("Export pending — eClaims gateway integration not yet connected.")
	}

	if (!preview) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>PhilHealth Claim Form 4 (CF4)</CardTitle>
						<p className="text-muted-foreground mt-1 text-sm">
							Auto-extracts clinical data from the encounter for the PhilHealth outpatient claim.
						</p>
					</div>
					<Button onClick={handleGenerate} disabled={generateCf4.isPending}>
						{generateCf4.isPending ? (
							<Loader2 className="mr-1.5 size-4 animate-spin" />
						) : (
							<FileCheck className="mr-1.5 size-4" />
						)}
						Generate CF4
					</Button>
				</CardHeader>
			</Card>
		)
	}

	const hasMissing = preview.missingFields.length > 0

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div className="flex items-center gap-2">
					<CardTitle>CF4 Preview</CardTitle>
					{hasMissing ? (
						<Badge variant="destructive">
							<AlertTriangle className="mr-1 size-3" />
							{preview.missingFields.length} Missing
						</Badge>
					) : (
						<Badge variant="default">
							<CheckCircle2 className="mr-1 size-3" />
							Complete
						</Badge>
					)}
				</div>
				<div className="flex gap-2">
					<Button
						onClick={handleFinalize}
						disabled={finalizeCf4.isPending}
					>
						{finalizeCf4.isPending ? (
							<Loader2 className="mr-1.5 size-4 animate-spin" />
						) : (
							<CheckCircle2 className="mr-1.5 size-4" />
						)}
						Approve & Finalize
					</Button>
					<Button variant="outline" onClick={handleExportEclaims}>
						<Send className="mr-1.5 size-4" />
						Submit to eClaims
					</Button>
					<Button variant="ghost" onClick={() => setPreview(null)}>
						Reset
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-5">
				{hasMissing && (
					<div className="rounded-md border border-red-200 bg-red-50 p-3">
						<p className="text-sm font-medium text-red-800">
							<AlertTriangle className="mr-1.5 inline size-4" />
							Missing required fields:
						</p>
						<ul className="mt-1 list-inside list-disc text-sm text-red-700">
							{preview.missingFields.map((f) => (
								<li key={f}>{f}</li>
							))}
						</ul>
					</div>
				)}

				{/* Editable clinical fields */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-1">
						<Label
							htmlFor="cf4-cc"
							className={!chiefComplaint ? "text-red-600" : ""}
						>
							Chief Complaint *
						</Label>
						<Textarea
							id="cf4-cc"
							rows={2}
							value={chiefComplaint}
							onChange={(e) => setChiefComplaint(e.target.value)}
							placeholder="Enter or edit chief complaint…"
						/>
					</div>
					<div className="space-y-1">
						<Label
							htmlFor="cf4-bh"
							className={!briefHistory ? "text-red-600" : ""}
						>
							Brief History *
						</Label>
						<Textarea
							id="cf4-bh"
							rows={2}
							value={briefHistory}
							onChange={(e) => setBriefHistory(e.target.value)}
							placeholder="Enter or edit brief history…"
						/>
					</div>
					<div className="space-y-1 md:col-span-2">
						<Label
							htmlFor="cf4-mp"
							className={!managementPlan ? "text-red-600" : ""}
						>
							Management Plan *
						</Label>
						<Textarea
							id="cf4-mp"
							rows={2}
							value={managementPlan}
							onChange={(e) => setManagementPlan(e.target.value)}
							placeholder="Enter or edit management plan…"
						/>
					</div>
				</div>

				<Separator />

				{/* Vital signs (read-only from EHR) */}
				<div>
					<p className="mb-2 text-sm font-medium text-muted-foreground">
						Vital Signs (auto-extracted)
					</p>
					{preview.extractedData.vitalSigns ? (
						<div className="flex flex-wrap gap-3">
							{Object.entries(preview.extractedData.vitalSigns).map(([k, v]) => (
								<div key={k} className="text-sm">
									<span className="font-medium">{k}:</span> {String(v ?? "—")}
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-red-600">No vital signs recorded</p>
					)}
				</div>

				<Separator />

				{/* Diagnoses (read-only) */}
				<div>
					<p className="mb-2 text-sm font-medium text-muted-foreground">
						Diagnoses / ICD-10 Codes (auto-extracted)
					</p>
					{preview.extractedData.diagnoses.length > 0 ? (
						<ul className="space-y-1 text-sm">
							{preview.extractedData.diagnoses.map((d, i) => (
								<li key={i} className="flex items-center gap-2">
									<Badge variant="outline" className="font-mono">
										{d.code}
									</Badge>
									{d.displayName}
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-red-600">No diagnoses recorded</p>
					)}
				</div>

				<Separator />

				{/* Procedures (read-only) */}
				<div>
					<p className="mb-2 text-sm font-medium text-muted-foreground">
						Procedures / RVS Codes (auto-extracted)
					</p>
					{preview.extractedData.procedures.length > 0 ? (
						<ul className="space-y-1 text-sm">
							{preview.extractedData.procedures.map((p, i) => (
								<li key={i} className="flex items-center gap-2">
									{p.rvsCode && (
										<Badge variant="secondary" className="font-mono">
											{p.rvsCode}
										</Badge>
									)}
									{p.description}
								</li>
							))}
						</ul>
					) : (
						<p className="text-muted-foreground text-sm">No procedures recorded</p>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
