"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Clock, Lock, Save, X } from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
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
import {
	useSystemSettingsQuery,
	useUpdateSystemSettingsMutation,
} from "@/features/system-settings/api/system-settings.hooks"

interface DraftState {
	timezone: string
	chartRetentionYears: number
	supportMailbox: string
	serviceDeskHotline: string
	breakGlassRequiresReason: boolean
	autoFreezeChargesOnDischarge: boolean
	requireDpaConsentBeforeExport: boolean
	enableOfflineSummaryCache: boolean
	artaSlaTargetMinutes: number
	offlineModePolicy: string
	exportDefaultWindow: string
}

function toDraft(s: {
	timezone: string
	chartRetentionYears: number
	supportMailbox: string | null
	serviceDeskHotline: string | null
	breakGlassRequiresReason: boolean
	autoFreezeChargesOnDischarge: boolean
	requireDpaConsentBeforeExport: boolean
	enableOfflineSummaryCache: boolean
	policySections: {
		artaSla?: { targetMinutes?: number }
		offlineMode?: { cacheActivePatients?: boolean }
		exportDefaults?: { scheduleWindow?: string }
	}
}): DraftState {
	return {
		timezone: s.timezone,
		chartRetentionYears: s.chartRetentionYears,
		supportMailbox: s.supportMailbox ?? "",
		serviceDeskHotline: s.serviceDeskHotline ?? "",
		breakGlassRequiresReason: s.breakGlassRequiresReason,
		autoFreezeChargesOnDischarge: s.autoFreezeChargesOnDischarge,
		requireDpaConsentBeforeExport: s.requireDpaConsentBeforeExport,
		enableOfflineSummaryCache: s.enableOfflineSummaryCache,
		artaSlaTargetMinutes: s.policySections.artaSla?.targetMinutes ?? 20,
		// TOR §2: offline capability is mandatory — always auto-cache-active
		offlineModePolicy: "auto-cache-active",
		exportDefaultWindow: s.policySections.exportDefaults?.scheduleWindow ?? "daily-02:00",
	}
}

interface AdminSettingsPanelProps {
	canEdit: boolean
}

export function AdminSettingsPanel({ canEdit }: AdminSettingsPanelProps) {
	const { data: settings, isLoading, error } = useSystemSettingsQuery()
	const updateMutation = useUpdateSystemSettingsMutation()

	const [draft, setDraft] = useState<DraftState | null>(null)
	const [isDirty, setIsDirty] = useState(false)
	const [validationError, setValidationError] = useState<string | null>(null)

	// Sync draft from server data on first load
	useEffect(() => {
		if (settings && !isDirty) {
			setDraft(toDraft(settings))
		}
	}, [settings, isDirty])

	function handleDiscard() {
		if (settings) {
			setDraft(toDraft(settings))
			setIsDirty(false)
			setValidationError(null)
		}
	}

	function setField<K extends keyof DraftState>(key: K, value: DraftState[K]) {
		setDraft(prev => (prev ? { ...prev, [key]: value } : prev))
		setIsDirty(true)
		setValidationError(null)
	}

	function validate(d: DraftState): string | null {
		if (d.supportMailbox && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.supportMailbox)) {
			return "Support mailbox must be a valid email address."
		}
		if (d.chartRetentionYears < 1 || d.chartRetentionYears > 99) {
			return "Chart retention must be between 1 and 99 years."
		}
		if (d.artaSlaTargetMinutes < 1 || d.artaSlaTargetMinutes > 10080) {
			return "ARTA SLA target must be between 1 and 10080 minutes."
		}
		return null
	}

	async function handleSave() {
		if (!draft) return
		const err = validate(draft)
		if (err) {
			setValidationError(err)
			return
		}

		await updateMutation.mutateAsync({
			timezone: draft.timezone,
			chartRetentionYears: draft.chartRetentionYears,
			supportMailbox: draft.supportMailbox || null,
			serviceDeskHotline: draft.serviceDeskHotline || null,
			// Mandatory TOR guardrails — always enforced as true (TOR §4.3, §6, Flow 5, §2)
			breakGlassRequiresReason: true,
			autoFreezeChargesOnDischarge: true,
			requireDpaConsentBeforeExport: true,
			enableOfflineSummaryCache: true,
			policySections: {
				artaSla: { targetMinutes: draft.artaSlaTargetMinutes },
				// TOR §2: offline caching is mandatory — always enabled
				offlineMode: { cacheActivePatients: true },
				exportDefaults: { scheduleWindow: draft.exportDefaultWindow },
			},
		})

		setIsDirty(false)
	}

	if (isLoading || !draft) {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-80" />
				</div>
				<Skeleton className="h-64 w-full" />
			</div>
		)
	}

	if (error) {
		return (
			<Alert variant="destructive">
				<AlertCircle className="size-4" />
				<AlertDescription>
					Failed to load system settings. Please refresh the page.
				</AlertDescription>
			</Alert>
		)
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">System Settings</h1>
				<p className="text-muted-foreground max-w-3xl text-sm">
					Facility-scoped operational, privacy, and contact defaults. Identity lives in Facility
					Profile; integrations live in Integration Registry.
				</p>
			</div>

			{/* -- Unsaved changes banner ------------------------------------------------- */}
			{isDirty && canEdit && (
				<div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950">
					<span className="text-amber-800 dark:text-amber-200">Unsaved changes</span>
					<div className="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={handleDiscard}
							disabled={updateMutation.isPending}
						>
							<X className="mr-1 size-3" />
							Discard
						</Button>
						<Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
							<Save className="mr-1 size-3" />
							{updateMutation.isPending ? "Saving..." : "Save changes"}
						</Button>
					</div>
				</div>
			)}

			{validationError && (
				<Alert variant="destructive">
					<AlertCircle className="size-4" />
					<AlertDescription>{validationError}</AlertDescription>
				</Alert>
			)}

			{updateMutation.isError && (
				<Alert variant="destructive">
					<AlertCircle className="size-4" />
					<AlertDescription>Save failed. Please try again.</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-4 xl:grid-cols-2">
				{/* -- Section 1: Operational defaults --------------------------------------- */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Operational defaults</CardTitle>
						<CardDescription>
							Facility-wide scheduling, retention, and data defaults.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="timezone">Default timezone</Label>
							{canEdit ? (
								<Select value={draft.timezone} onValueChange={v => setField("timezone", v ?? "")}>
									<SelectTrigger id="timezone">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Asia/Manila">Asia/Manila</SelectItem>
										<SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
										<SelectItem value="UTC">UTC</SelectItem>
									</SelectContent>
								</Select>
							) : (
								<p className="text-sm">{draft.timezone}</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="retention">Chart retention (years)</Label>
							{canEdit ? (
								<Input
									id="retention"
									type="number"
									min={1}
									max={99}
									value={draft.chartRetentionYears}
									onChange={e => setField("chartRetentionYears", Number(e.target.value))}
								/>
							) : (
								<p className="text-sm">{draft.chartRetentionYears} years</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="arta-sla">ARTA SLA target (minutes)</Label>
							{canEdit ? (
								<Input
									id="arta-sla"
									type="number"
									min={1}
									value={draft.artaSlaTargetMinutes}
									onChange={e => setField("artaSlaTargetMinutes", Number(e.target.value))}
								/>
							) : (
								<p className="text-sm">{draft.artaSlaTargetMinutes} min</p>
							)}
						</div>
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Label htmlFor="offline-mode">Offline mode policy</Label>
								<Badge variant="secondary" className="flex items-center gap-1 text-xs">
									<Lock className="size-3" />
									Required by TOR
								</Badge>
							</div>
							{/* TOR §2: offline capability is mandatory — Disabled option removed */}
							{canEdit ? (
								<Select
									value={draft.offlineModePolicy}
									onValueChange={v => setField("offlineModePolicy", v ?? "")}
									disabled
								>
									<SelectTrigger id="offline-mode">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="auto-cache-active">Auto-cache active patients</SelectItem>
									</SelectContent>
								</Select>
							) : (
								<p className="text-sm">Auto-cache active patients</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="export-window">Export submission default window</Label>
							{canEdit ? (
								<Select
									value={draft.exportDefaultWindow}
									onValueChange={v => setField("exportDefaultWindow", v ?? "")}
								>
									<SelectTrigger id="export-window">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="daily-02:00">Daily 02:00</SelectItem>
										<SelectItem value="weekly">Weekly</SelectItem>
										<SelectItem value="manual">Manual</SelectItem>
									</SelectContent>
								</Select>
							) : (
								<p className="text-sm">{draft.exportDefaultWindow}</p>
							)}
						</div>
					</CardContent>
				</Card>

				{/* -- Section 2: Privacy & consent defaults --------------------------------- */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Privacy & consent defaults</CardTitle>
						<CardDescription>
							Institution-wide privacy guardrails and consent enforcement policies.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-1">
						{/* Mandatory TOR guardrails are always locked to true (SS-002) */}
						{[
							{
								key: "breakGlassRequiresReason" as const,
								label: "Break-glass reason required",
								description: "Require justification text before emergency chart access is granted.",
								isMandatory: true,
							},
							{
								key: "requireDpaConsentBeforeExport" as const,
								label: "Require DPA consent before export",
								description: "Prevent sensitive exports when consent capture is incomplete.",
								isMandatory: true,
							},
							{
								key: "autoFreezeChargesOnDischarge" as const,
								label: "Freeze charges on discharge order",
								description: "Lock ward-side charging once the may-go-home workflow starts.",
								isMandatory: true,
							},
							{
								key: "enableOfflineSummaryCache" as const,
								label: "Enable offline summary cache",
								description:
									"Prepare locally cached patient summaries for connectivity interruptions.",
								isMandatory: true,
							},
						].map(({ key, label, description, isMandatory }) => (
							<div
								key={key}
								className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
							>
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<p className="text-sm font-medium">{label}</p>
										{isMandatory && (
											<Badge variant="secondary" className="flex items-center gap-1 text-xs">
												<Lock className="size-3" />
												Required by TOR
											</Badge>
										)}
									</div>
									<p className="text-muted-foreground text-xs">{description}</p>
								</div>
								<Switch
									checked={isMandatory ? true : draft[key]}
									onCheckedChange={isMandatory ? undefined : checked => setField(key, checked)}
									disabled={isMandatory || !canEdit}
									aria-label={label}
								/>
							</div>
						))}
					</CardContent>
				</Card>

				{/* -- Section 3: Internal contacts ------------------------------------------ */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Internal contacts</CardTitle>
						<CardDescription>
							Facility support channels for staff and system alerts.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="support-mailbox">Support mailbox</Label>
							{canEdit ? (
								<Input
									id="support-mailbox"
									type="email"
									placeholder="admin.ops@qhealth.local"
									value={draft.supportMailbox}
									onChange={e => setField("supportMailbox", e.target.value)}
								/>
							) : (
								<p className="text-sm">
									{draft.supportMailbox || <span className="text-muted-foreground">Not set</span>}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="service-desk-hotline">Service desk hotline</Label>
							{canEdit ? (
								<Input
									id="service-desk-hotline"
									placeholder="+63 2 8123 4567"
									value={draft.serviceDeskHotline}
									onChange={e => setField("serviceDeskHotline", e.target.value)}
								/>
							) : (
								<p className="text-sm">
									{draft.serviceDeskHotline || (
										<span className="text-muted-foreground">Not set</span>
									)}
								</p>
							)}
						</div>
					</CardContent>
				</Card>

				{/* -- Section 4: Recent changes ---------------------------------------------- */}
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Clock className="text-muted-foreground size-4" />
							<CardTitle className="text-base">Recent changes</CardTitle>
						</div>
						<CardDescription>Audit trail for this facility's system settings.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							{settings?.updatedAt
								? `Last updated ${new Date(settings.updatedAt).toLocaleString()}`
								: "No changes recorded yet."}
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
