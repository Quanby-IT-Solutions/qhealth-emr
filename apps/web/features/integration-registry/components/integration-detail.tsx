"use client"

import { useEffect, useState } from "react"

import { useRouter } from "next/navigation"

import { useQueryClient } from "@tanstack/react-query"
import { Info, Save, Trash2, Wifi, X } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
import { Skeleton } from "@/core/components/ui/skeleton"
import { Switch } from "@/core/components/ui/switch"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useCredentialRefsQuery,
	useDeleteIntegrationMutation,
	useIntegrationDetailQuery,
	useTestConnectivityMutation,
	useUpdateIntegrationMutation,
} from "@/features/integration-registry/api/integration-registry.hooks"
import { orpc } from "@/services/orpc/client"

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

/** Fields whose change requires disabling the integration before saving. */
const CONNECTION_CRITICAL_FIELDS: Array<keyof DraftState> = ["endpointUrl", "credentialsRef", "kind"]

const CREDENTIAL_STATUS_VARIANT: Record<
	string,
	{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
	ok: { label: "Credential OK", variant: "default" },
	missing_in_env: { label: "Missing in env", variant: "destructive" },
	not_in_whitelist: { label: "Not whitelisted", variant: "destructive" },
	unset: { label: "No credential", variant: "outline" },
}

interface DraftState {
	name: string
	kind: string
	endpointUrl: string
	webhookUrl: string
	credentialsRef: string
	enabled: boolean
	notes: string
}

type IntegrationData = {
	id: string
	facilityId: string
	kind: string
	name: string
	endpointUrl: string
	webhookUrl: string | null
	credentialsRef: string | null
	enabled: boolean
	notes: string | null
	lastSyncAt: Date | null
	lastSyncStatus: "ok" | "error" | null
	lastTestedAt: Date | null
	lastTestStatus: "ok" | "error" | null
	lastTestReadinessLevel: "activation" | "transport" | "none" | null
	credentialStatus: "ok" | "missing_in_env" | "not_in_whitelist" | "unset"
	createdAt: Date
	updatedAt: Date
}

function toDraft(i: IntegrationData): DraftState {
	return {
		name: i.name,
		kind: i.kind,
		endpointUrl: i.endpointUrl,
		webhookUrl: i.webhookUrl ?? "",
		credentialsRef: i.credentialsRef ?? "",
		enabled: i.enabled,
		notes: i.notes ?? "",
	}
}

interface IntegrationDetailProps {
	integrationId: string
}

export function IntegrationDetail({ integrationId }: IntegrationDetailProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { data: integration, isLoading, error } = useIntegrationDetailQuery(integrationId)
	const { data: credentialRefs = [] } = useCredentialRefsQuery()
	const updateMutation = useUpdateIntegrationMutation()
	const deleteMutation = useDeleteIntegrationMutation()
	const testMutation = useTestConnectivityMutation()

	const [draft, setDraft] = useState<DraftState | null>(null)
	const [isDirty, setIsDirty] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [connectivityResult, setConnectivityResult] = useState<{
		status: "ok" | "error"
		readinessLevel: "activation" | "transport" | "none"
		latencyMs: number | null
		detail: string
		credentialProbed: boolean
		checks: Array<{ name: string; status: "pass" | "fail" | "skipped"; detail: string }>
	} | null>(null)

	useEffect(() => {
		if (integration && !isDirty) {
			setDraft(toDraft(integration as IntegrationData))
		}
	}, [integration, isDirty])

	if (isLoading || !draft) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-48 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="text-destructive text-sm">
				Integration not found or failed to load.
			</div>
		)
	}

	const currentDraft = toDraft(integration as IntegrationData)
	const changedFields = (Object.keys(draft) as Array<keyof DraftState>).filter(
		k => draft[k] !== currentDraft[k]
	)
	const hasChanges = changedFields.length > 0

	// If any connection-critical field changes on an enabled integration, the backend will
	// reject the save. Detect this early to show a clear UX warning.
	const connectionCriticalChanged = CONNECTION_CRITICAL_FIELDS.some(f => changedFields.includes(f))
	const blockedByConnectionChange = connectionCriticalChanged && !!(integration as IntegrationData)?.enabled

	function patch<K extends keyof DraftState>(field: K, value: DraftState[K]) {
		setDraft(prev => (prev ? { ...prev, [field]: value } : prev))
		setIsDirty(true)
	}

	function handleDiscard() {
		if (integration) {
			setDraft(toDraft(integration as IntegrationData))
			setIsDirty(false)
		}
	}

	async function handleSave() {
		if (!draft || !integration) return

		const payload: Record<string, unknown> = { id: integrationId }
		for (const field of changedFields) {
			if (field === "credentialsRef" || field === "webhookUrl") {
				payload[field] = draft[field] || null
			} else {
				payload[field] = draft[field]
			}
		}

		await updateMutation.mutateAsync(
			payload as Parameters<typeof updateMutation.mutateAsync>[0]
		)
		setIsDirty(false)
	}

	async function handleDelete() {
		await deleteMutation.mutateAsync({ id: integrationId })
		router.push("/admin/integration-registry")
	}

	async function handleTestConnectivity() {
		const result = await testMutation.mutateAsync({ id: integrationId })
		setConnectivityResult(result)
		// Refresh integration data so readiness gate reflects the new test outcome
		queryClient.invalidateQueries({ queryKey: orpc.integrationRegistry.key() })
	}

	const credBadge =
		CREDENTIAL_STATUS_VARIANT[integration?.credentialStatus ?? "unset"] ??
		CREDENTIAL_STATUS_VARIANT.unset!
	const syncStatus = integration?.lastSyncStatus

	return (
		<div className="space-y-4">
			{/* FHIR / NHDR ownership notice */}
			{(draft.kind === "fhir" || draft.kind === "nhdr") && (
				<div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-800 dark:bg-blue-950">
					<Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
					<div className="space-y-1">
						<p className="font-medium text-blue-900 dark:text-blue-100">
							FHIR / NHDR connectivity record
						</p>
						<p className="text-blue-700 dark:text-blue-300">
							This entry stores the connection endpoint and credential reference for{" "}
							{draft.kind === "nhdr" ? "NHDR" : "FHIR"} only. For FHIR R4 bundle exports,
							patient consent tracking, and NHDR submission management, go to{" "}
							<a href="/admin/fhir" className="font-medium underline">
								Admin → FHIR / NHDR
							</a>
							.
						</p>
					</div>
				</div>
			)}

			{/* Unsaved changes banner */}
			{hasChanges && (
				<div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-700 dark:bg-amber-950">
					<div className="flex flex-col gap-0.5">
						<span className="text-amber-800 dark:text-amber-200">
							{changedFields.length} unsaved{" "}
							{changedFields.length === 1 ? "change" : "changes"}
						</span>
						{blockedByConnectionChange && (
							<span className="text-destructive text-xs">
								Endpoint, credential, or kind cannot change on a live integration — disable it first, then re-test.
							</span>
						)}
					</div>
					<div className="flex gap-2">
						<Button variant="ghost" size="sm" onClick={handleDiscard}>
							<X className="mr-1.5 size-4" />
							Discard
						</Button>
						<Button
							size="sm"
							onClick={handleSave}
							disabled={updateMutation.isPending || blockedByConnectionChange}
						>
							<Save className="mr-1.5 size-4" />
							{updateMutation.isPending ? "Saving…" : "Save changes"}
						</Button>
					</div>
				</div>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				{/* Left column — main fields */}
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">Integration details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									value={draft.name}
									onChange={e => patch("name", e.target.value)}
									placeholder="e.g. NHDR FHIR"
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="kind">Kind</Label>
								<Select
									value={draft.kind}
									onValueChange={v => patch("kind", v)}
								>
									<SelectTrigger id="kind">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(KIND_LABELS).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="endpointUrl">Endpoint URL</Label>
								<Input
									id="endpointUrl"
									value={draft.endpointUrl}
									onChange={e => patch("endpointUrl", e.target.value)}
									placeholder="https://api.example.gov.ph/fhir"
								/>
							</div>

						<div className="space-y-1.5">
							<Label htmlFor="webhookUrl">Webhook URL <span className="text-muted-foreground">(optional)</span></Label>
							<Input
								id="webhookUrl"
								value={draft.webhookUrl}
								onChange={e => patch("webhookUrl", e.target.value)}
								placeholder="https://your-system.example.ph/webhook"
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="credentialsRef">Credential reference</Label>
							<Select
								value={draft.credentialsRef || "__none__"}
								onValueChange={v =>
									patch("credentialsRef", v === "__none__" ? "" : v)
								}
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
							<div className="flex items-center gap-2 mt-1">
								<Badge variant={credBadge.variant} className="text-xs">
									{credBadge.label}
								</Badge>
							</div>
						</div>

							<div className="space-y-1.5">
								<div className="flex items-center gap-3">
									<Switch
										id="enabled"
										checked={draft.enabled}
										onCheckedChange={v => patch("enabled", v)}
									/>
									<Label htmlFor="enabled" className="cursor-pointer">
										{draft.enabled ? "Enabled" : "Disabled"}
									</Label>
								</div>
								{draft.enabled && !integration?.enabled && (() => {
									const WINDOW_MS = 10 * 60 * 1000
									const testedAt = integration?.lastTestedAt ? new Date(integration.lastTestedAt) : null
									const intKind = (integration as IntegrationData).kind
									const kindRequiresActivation = intKind === "fhir" || intKind === "nhdr"
									const isRecentOk =
										integration?.lastTestStatus === "ok" &&
										testedAt !== null &&
										Date.now() - testedAt.getTime() < WINDOW_MS
									const isActivationReady = isRecentOk && (integration as IntegrationData).lastTestReadinessLevel === "activation"
									const isTransportReady = isRecentOk && (integration as IntegrationData).lastTestReadinessLevel === "transport"
									const canEnable = kindRequiresActivation ? isActivationReady : (isActivationReady || isTransportReady)
									if (!canEnable) {
										const hint = kindRequiresActivation
											? "An activation-grade connectivity test is required before enabling. Run the test from the connectivity panel on the right."
											: (isTransportReady
												? null // transport-ready: no blocking message — save will succeed
												: "A successful connectivity test is required before enabling. Run the test from the connectivity panel on the right.")
										return hint ? (
											<p className="text-destructive text-xs">{hint}</p>
										) : null
									}
									return null
								})()}
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="notes">Notes</Label>
								<Textarea
									id="notes"
									value={draft.notes}
									onChange={e => patch("notes", e.target.value)}
									placeholder="Optional notes about this integration…"
									rows={3}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Danger zone */}
					<Card className="border-destructive/30">
						<CardHeader>
							<CardTitle className="text-destructive text-sm font-semibold">
								Danger zone
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Button
								variant="destructive"
								size="sm"
								onClick={() => setShowDeleteDialog(true)}
							>
								<Trash2 className="mr-1.5 size-4" />
								Delete integration
							</Button>
						</CardContent>
					</Card>
				</div>

				{/* Right column — status and history */}
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">Sync status</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground text-xs">Last sync:</span>
								<span className="text-xs">
									{integration?.lastSyncAt
										? new Date(integration.lastSyncAt).toLocaleString(
												"en-PH",
												{ dateStyle: "medium", timeStyle: "short" }
											)
										: "Never"}
								</span>
							</div>
							{syncStatus && (
								<div className="flex items-center gap-2">
									<span className="text-muted-foreground text-xs">Result:</span>
									<Badge
										variant={syncStatus === "ok" ? "default" : "destructive"}
										className="text-xs"
									>
										{syncStatus === "ok" ? "Success" : "Error"}
									</Badge>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Connectivity test */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">Connectivity test</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<Button
								variant="outline"
								size="sm"
								onClick={handleTestConnectivity}
								disabled={testMutation.isPending}
							>
								<Wifi className="mr-1.5 size-4" />
								{testMutation.isPending ? "Testing…" : "Test connectivity"}
							</Button>
							{connectivityResult && (
								<div className="space-y-2">
									<div className="flex flex-wrap items-center gap-2">
									{connectivityResult.readinessLevel === "activation" && connectivityResult.status === "ok" && (
										<Badge variant="default" className="text-xs">
											Activation-ready
										</Badge>
									)}
									{(connectivityResult.readinessLevel === "transport" ||
										(connectivityResult.readinessLevel === "activation" &&
											connectivityResult.status === "error")) && (
											<Badge variant="secondary" className="border-amber-400 text-xs text-amber-700 dark:text-amber-300">
												Transport only
											</Badge>
										)}
										{connectivityResult.readinessLevel === "none" && (
											<Badge variant="destructive" className="text-xs">
												Unreachable
											</Badge>
										)}
										<Badge variant="outline" className="text-xs">
											{connectivityResult.credentialProbed
												? "Credentialed probe"
												: "Unauthenticated probe"}
										</Badge>
										{connectivityResult.latencyMs !== null && (
											<span className="text-muted-foreground text-xs">
												{connectivityResult.latencyMs}ms
											</span>
										)}
									</div>
									<p className="text-muted-foreground text-xs">{connectivityResult.detail}</p>
									{connectivityResult.readinessLevel === "transport" && (
										<p className="text-xs text-amber-700 dark:text-amber-400">
											Transport-only result — cannot activate until contract-level validation passes.
										</p>
									)}
									{connectivityResult.checks.length > 0 && (
										<ul className="space-y-0.5">
											{connectivityResult.checks.map((check, i) => (
												<li key={i} className="flex items-start gap-1.5 text-xs">
													<span
														className={
															check.status === "pass"
																? "text-green-600 dark:text-green-400"
																: check.status === "fail"
																	? "text-destructive"
																	: "text-muted-foreground"
														}
													>
														{check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "–"}
													</span>
													<span className="text-muted-foreground">
														<span className="font-medium text-foreground">{check.name}</span>:{" "}
														{check.detail}
													</span>
												</li>
											))}
										</ul>
									)}
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">Recent changes</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<p className="text-muted-foreground text-xs">
								Last updated{" "}
								{integration?.updatedAt
									? new Date(integration.updatedAt).toLocaleDateString(
											"en-PH",
											{ year: "numeric", month: "short", day: "numeric" }
										)
									: "—"}
							</p>
							<a
								href={`/audit?entityType=integration&entityId=${integrationId}`}
								className="text-primary text-xs hover:underline"
							>
								View full history →
							</a>
						</CardContent>
					</Card>

				</div>
			</div>

			{/* Delete confirmation dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete integration?</DialogTitle>
						<DialogDescription>
							This will permanently delete{" "}
							<strong>{integration?.name}</strong> and cannot be undone. The
							deletion will be recorded in the audit log.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowDeleteDialog(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting…" : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
