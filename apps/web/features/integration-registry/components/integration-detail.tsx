"use client"

import { useEffect, useState } from "react"

import { useRouter } from "next/navigation"

import { Save, Trash2, X } from "lucide-react"

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
	useUpdateIntegrationMutation,
} from "@/features/integration-registry/api/integration-registry.hooks"

const KIND_LABELS: Record<string, string> = {
	fhir: "FHIR",
	civil_registry: "Civil Registry",
	hai: "HAI",
	philhealth: "PhilHealth",
	custom: "Custom",
}

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
	credentialsRef: string | null
	enabled: boolean
	notes: string | null
	lastSyncAt: Date | null
	lastSyncStatus: "ok" | "error" | null
	credentialStatus: "ok" | "missing_in_env" | "not_in_whitelist" | "unset"
	createdAt: Date
	updatedAt: Date
}

function toDraft(i: IntegrationData): DraftState {
	return {
		name: i.name,
		kind: i.kind,
		endpointUrl: i.endpointUrl,
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
	const { data: integration, isLoading, error } = useIntegrationDetailQuery(integrationId)
	const { data: credentialRefs = [] } = useCredentialRefsQuery()
	const updateMutation = useUpdateIntegrationMutation()
	const deleteMutation = useDeleteIntegrationMutation()

	const [draft, setDraft] = useState<DraftState | null>(null)
	const [isDirty, setIsDirty] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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
			if (field === "credentialsRef") {
				payload.credentialsRef = draft.credentialsRef || null
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

	const credBadge =
		CREDENTIAL_STATUS_VARIANT[integration?.credentialStatus ?? "unset"] ??
		CREDENTIAL_STATUS_VARIANT.unset!
	const syncStatus = integration?.lastSyncStatus

	return (
		<div className="space-y-4">
			{/* Unsaved changes banner */}
			{hasChanges && (
				<div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-700 dark:bg-amber-950">
					<span className="text-amber-800 dark:text-amber-200">
						{changedFields.length} unsaved{" "}
						{changedFields.length === 1 ? "change" : "changes"}
					</span>
					<div className="flex gap-2">
						<Button variant="ghost" size="sm" onClick={handleDiscard}>
							<X className="mr-1.5 size-4" />
							Discard
						</Button>
						<Button
							size="sm"
							onClick={handleSave}
							disabled={updateMutation.isPending}
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
								href={`/admin/audit?entityType=integration&entityId=${integrationId}`}
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
