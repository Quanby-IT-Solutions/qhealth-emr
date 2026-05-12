"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Badge } from "@/core/components/ui/badge"

const FHIR_RESOURCES = [
	"Patient", "Encounter", "Observation", "Condition", "AllergyIntolerance",
	"MedicationRequest", "MedicationAdministration", "DiagnosticReport",
	"ServiceRequest", "NutritionOrder", "ImagingStudy", "Practitioner", "Location",
]

interface EndpointConfig {
	url: string
	authMethod: "none" | "bearer" | "basic" | "client_credentials"
	credentials: string
	selectedResources: string[]
	cronSchedule: string
}

export function FhirEndpointConfigForm() {
	const [config, setConfig] = useState<EndpointConfig>({
		url: "",
		authMethod: "none",
		credentials: "",
		selectedResources: [],
		cronSchedule: "0 2 * * *",
	})
	const [openSections, setOpenSections] = useState<Record<string, boolean>>({
		endpoint: true,
		authentication: true,
		resources: true,
		schedule: true,
	})
	const [showCredentials, setShowCredentials] = useState(false)

	function toggleSection(key: string) {
		setOpenSections(s => ({ ...s, [key]: !s[key] }))
	}
	const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
	const [testLatency, setTestLatency] = useState<number | null>(null)
	const [testError, setTestError] = useState("")
	const [resourceSearch, setResourceSearch] = useState("")

	function toggleResource(resource: string) {
		setConfig(c => ({
			...c,
			selectedResources: c.selectedResources.includes(resource)
				? c.selectedResources.filter(r => r !== resource)
				: [...c.selectedResources, resource],
		}))
	}

	function selectAll() {
		setConfig(c => ({ ...c, selectedResources: FHIR_RESOURCES }))
	}

	async function testConnection() {
		if (!config.url) return
		setTestStatus("testing")
		setTestError("")
		const start = Date.now()
		try {
			// Stub: actual implementation wires to fhir endpoints backend (ADM-BE-07)
			await new Promise(r => setTimeout(r, 600))
			setTestLatency(Date.now() - start)
			setTestStatus("success")
		} catch {
			setTestStatus("error")
			setTestError("Connection failed. Check URL and credentials.")
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		// Will wire to upsert endpoint when ADM-BE-07 is implemented
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<Card>
				<CardHeader className="pb-2 flex flex-row items-center justify-between">
					<CardTitle className="text-sm">Endpoint</CardTitle>
					<button type="button" onClick={() => toggleSection("endpoint")} className="text-muted-foreground hover:text-foreground">
						{openSections.endpoint ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
					</button>
				</CardHeader>
				{openSections.endpoint && (
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<Label htmlFor="url">FHIR Server URL</Label>
							<Input
								id="url"
								type="url"
								placeholder="https://fhir.example.com/R4"
								value={config.url}
								onChange={e => setConfig(c => ({ ...c, url: e.target.value }))}
							/>
						</div>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={testConnection}
								disabled={!config.url || testStatus === "testing"}
							>
								{testStatus === "testing" ? "Testing..." : "Test Connection"}
							</Button>
							{testStatus === "success" && testLatency !== null && (
								<span className="text-xs text-emerald-600 self-center">Connected · {testLatency}ms</span>
							)}
							{testStatus === "error" && (
								<span className="text-xs text-destructive self-center">{testError}</span>
							)}
						</div>
					</CardContent>
				)}
			</Card>

			<Card>
				<CardHeader className="pb-2 flex flex-row items-center justify-between">
					<CardTitle className="text-sm">Authentication</CardTitle>
					<button type="button" onClick={() => toggleSection("authentication")} className="text-muted-foreground hover:text-foreground">
						{openSections.authentication ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
					</button>
				</CardHeader>
				{openSections.authentication && (
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<Label>Auth Method</Label>
							<Select
								value={config.authMethod}
								onValueChange={v => setConfig(c => ({ ...c, authMethod: (v ?? "none") as EndpointConfig["authMethod"] }))}
							>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									<SelectItem value="bearer">Bearer Token</SelectItem>
									<SelectItem value="basic">Basic Auth</SelectItem>
									<SelectItem value="client_credentials">Client Credentials</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{config.authMethod !== "none" && (
							<div className="space-y-1">
								<Label htmlFor="credentials">Credentials</Label>
								<div className="flex gap-2">
									<Input
										id="credentials"
										type={showCredentials ? "text" : "password"}
										value={config.credentials}
										onChange={e => setConfig(c => ({ ...c, credentials: e.target.value }))}
										className="font-mono"
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setShowCredentials(v => !v)}
									>
										{showCredentials ? "Hide" : "Reveal"}
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				)}
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">Resources</CardTitle>
						<div className="flex items-center gap-2">
							{config.selectedResources.length > 0 && (
								<Badge variant="secondary" className="text-xs">
									{config.selectedResources.length} selected
								</Badge>
							)}
							<Button type="button" variant="ghost" size="sm" onClick={selectAll}>Select all</Button>
							<button type="button" onClick={() => toggleSection("resources")} className="text-muted-foreground hover:text-foreground">
								{openSections.resources ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
							</button>
						</div>
					</div>
				</CardHeader>
				{openSections.resources && (
					<CardContent className="space-y-3">
						<Input
							placeholder="Search resources..."
							value={resourceSearch}
							onChange={e => setResourceSearch(e.target.value)}
							className="h-8 text-sm"
						/>
						<div className="flex flex-wrap gap-2">
							{FHIR_RESOURCES.filter(r =>
								!resourceSearch || r.toLowerCase().includes(resourceSearch.toLowerCase())
							).map(r => (
								<button
									key={r}
									type="button"
									onClick={() => toggleResource(r)}
									className={`rounded-full px-3 py-0.5 text-xs border transition-colors ${
										config.selectedResources.includes(r)
											? "bg-primary text-primary-foreground border-primary"
											: "bg-background text-foreground border-border hover:bg-muted"
									}`}
								>
									{r}
								</button>
							))}
						</div>
					</CardContent>
				)}
			</Card>

			<Card>
				<CardHeader className="pb-2 flex flex-row items-center justify-between">
					<CardTitle className="text-sm">Schedule</CardTitle>
					<button type="button" onClick={() => toggleSection("schedule")} className="text-muted-foreground hover:text-foreground">
						{openSections.schedule ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
					</button>
				</CardHeader>
				{openSections.schedule && (
					<CardContent className="space-y-1">
						<Label htmlFor="cron">Cron Expression</Label>
						<Input
							id="cron"
							value={config.cronSchedule}
							onChange={e => setConfig(c => ({ ...c, cronSchedule: e.target.value }))}
							className="font-mono"
						/>
						<p className="text-xs text-muted-foreground">e.g. 0 2 * * * = daily at 2:00 AM</p>
					</CardContent>
				)}
			</Card>

			<Button type="submit">Save Configuration</Button>
		</form>
	)
}
