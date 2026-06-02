"use client"

import { useState } from "react"

import { useRouter } from "next/navigation"

import { Save } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useCreateIntegrationMutation,
	useCredentialRefsQuery,
} from "@/features/integration-registry/api/integration-registry.hooks"

const KIND_LABELS: Record<string, string> = {
	fhir: "FHIR",
	hai: "HAI",
	philhealth: "PhilHealth",
	erp: "ERP",
	lis: "LIS",
	pacs: "PACS",
	telemedicine: "Telemedicine",
	nhdr: "NHDR",
	pidsr: "PIDSR",
	custom: "Custom",
}

export function IntegrationCreate() {
	const router = useRouter()
	const { data: credentialRefs = [] } = useCredentialRefsQuery()
	const createMutation = useCreateIntegrationMutation()

	const [name, setName] = useState("")
	const [kind, setKind] = useState<string>("")
	const [endpointUrl, setEndpointUrl] = useState("")
	const [webhookUrl, setWebhookUrl] = useState("")
	const [credentialsRef, setCredentialsRef] = useState<string>("")
	const [notes, setNotes] = useState("")
	const [errors, setErrors] = useState<Record<string, string>>({})

	function validate(): boolean {
		const errs: Record<string, string> = {}
		if (!name.trim()) errs.name = "Name is required"
		if (!kind) errs.kind = "Kind is required"
		if (!endpointUrl.trim()) errs.endpointUrl = "Endpoint URL is required"
		try {
			new URL(endpointUrl.trim())
		} catch {
			if (!errs.endpointUrl) errs.endpointUrl = "Must be a valid URL"
		}
		setErrors(errs)
		return Object.keys(errs).length === 0
	}

	async function handleCreate() {
		if (!validate()) return

		const created = await createMutation.mutateAsync({
			name: name.trim(),
			kind: kind as "fhir" | "hai" | "philhealth" | "erp" | "lis" | "pacs" | "telemedicine" | "nhdr" | "pidsr" | "custom",
			endpointUrl: endpointUrl.trim(),
			webhookUrl: webhookUrl.trim() || null,
			credentialsRef: credentialsRef || null,
			enabled: false,
			notes: notes.trim() || null,
		})

		router.push(`/admin/integration-registry/${created.id}`)
	}

	return (
		<Card className="max-w-2xl">
			<CardHeader>
				<CardTitle className="text-sm font-semibold">New integration</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-1.5">
					<Label htmlFor="name">Name</Label>
					<Input
						id="name"
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="e.g. NHDR FHIR"
					/>
					{errors.name && (
						<p className="text-destructive text-xs">{errors.name}</p>
					)}
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="kind">Kind</Label>
					<Select value={kind} onValueChange={v => setKind(v ?? "")}>
						<SelectTrigger id="kind">
							<SelectValue placeholder="Select kind…" />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(KIND_LABELS).map(([value, label]) => (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.kind && <p className="text-destructive text-xs">{errors.kind}</p>}
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="endpointUrl">Endpoint URL</Label>
					<Input
						id="endpointUrl"
						value={endpointUrl}
						onChange={e => setEndpointUrl(e.target.value)}
						placeholder="https://api.example.gov.ph/fhir"
					/>
					{errors.endpointUrl && (
						<p className="text-destructive text-xs">{errors.endpointUrl}</p>
					)}
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="webhookUrl">Webhook URL <span className="text-muted-foreground">(optional)</span></Label>
					<Input
						id="webhookUrl"
						value={webhookUrl}
						onChange={e => setWebhookUrl(e.target.value)}
						placeholder="https://your-system.example.ph/webhook"
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="credentialsRef">Credential reference</Label>
					<Select
						value={credentialsRef || "__none__"}
						onValueChange={v => setCredentialsRef(v === "__none__" ? "" : (v ?? ""))}
					>
						<SelectTrigger id="credentialsRef">
							<SelectValue placeholder="No credential" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__none__">No credential</SelectItem>
							{credentialRefs.map(ref => (
								<SelectItem key={ref} value={ref}>
									{ref}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="notes">Notes</Label>
					<Textarea
						id="notes"
						value={notes}
						onChange={e => setNotes(e.target.value)}
						placeholder="Optional notes…"
						rows={3}
					/>
				</div>

				<div className="flex justify-end gap-2">
					<Button
						variant="outline"
						onClick={() => router.push("/admin/integration-registry")}
					>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={createMutation.isPending}>
						<Save className="mr-1.5 size-4" />
						{createMutation.isPending ? "Creating…" : "Create integration"}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
