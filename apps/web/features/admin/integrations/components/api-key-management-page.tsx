"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import {
	useGenerateApiKeyMutation,
	useListApiKeysQuery,
	useRevokeApiKeyMutation,
} from "@/features/admin/integrations/api/api-keys.hooks"

interface ApiKeyManagementPageProps {
	integrationId: string
}

export function ApiKeyManagementPage({ integrationId }: ApiKeyManagementPageProps) {
	const [showNewKey, setShowNewKey] = useState<{ key: string; isRotation: boolean } | null>(null)
	const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
	const [newLabel, setNewLabel] = useState("")

	const { data: keys, isLoading } = useListApiKeysQuery(integrationId)
	const generateMutation = useGenerateApiKeyMutation(integrationId)
	const revokeMutation = useRevokeApiKeyMutation(integrationId)

	async function generateKey() {
		if (!newLabel.trim()) return
		generateMutation.mutate(
			{ integrationId, label: newLabel.trim() },
			{
				onSuccess: data => {
					setShowNewKey({ key: data.rawKey, isRotation: false })
					setNewLabel("")
				},
			}
		)
	}

	return (
		<div className="space-y-4">
			{showNewKey && (
				<div className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:bg-emerald-950/20">
					<p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
						{showNewKey.isRotation ? "Key rotated — " : "New API key generated — "}
						copy it now. It won&apos;t be shown again.
					</p>
					<div className="flex gap-2">
						<Input value={showNewKey.key} readOnly className="font-mono text-sm" />
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								void navigator.clipboard.writeText(showNewKey.key)
							}}
						>
							Copy
						</Button>
					</div>
					<Button variant="ghost" size="sm" onClick={() => setShowNewKey(null)}>
						I&apos;ve copied it
					</Button>
				</div>
			)}

			<div className="flex items-center gap-2">
				<Input
					placeholder="Key label (e.g. Production)"
					value={newLabel}
					onChange={e => setNewLabel(e.target.value)}
					className="max-w-xs"
				/>
				<Button
					onClick={generateKey}
					size="sm"
					disabled={!newLabel.trim() || generateMutation.isPending}
				>
					Generate Key
				</Button>
			</div>

			{isLoading && <Skeleton className="h-48 w-full" />}

			{!isLoading && (!keys || keys.length === 0) && (
				<p className="text-muted-foreground py-8 text-center text-sm">No API keys configured.</p>
			)}

			{keys && keys.length > 0 && (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Label</TableHead>
							<TableHead>Key prefix</TableHead>
							<TableHead>Created</TableHead>
							<TableHead>Status</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{keys.map(key => (
							<TableRow key={key.id}>
								<TableCell className="font-medium">{key.label}</TableCell>
								<TableCell className="font-mono text-sm">{key.keyPrefix}…</TableCell>
								<TableCell className="text-muted-foreground text-sm">
									{new Date(key.createdAt).toLocaleDateString("en-PH")}
								</TableCell>
								<TableCell>
									{key.revokedAt ? (
										<span className="text-destructive text-xs">Revoked</span>
									) : (
										<span className="text-xs text-emerald-600">Active</span>
									)}
								</TableCell>
								<TableCell>
									{!key.revokedAt &&
										(confirmRevoke === key.id ? (
											<div className="flex gap-1">
												<Button
													variant="destructive"
													size="sm"
													disabled={revokeMutation.isPending}
													onClick={() => {
														revokeMutation.mutate(
															{ id: key.id },
															{ onSuccess: () => setConfirmRevoke(null) }
														)
													}}
												>
													Confirm Revoke
												</Button>
												<Button variant="ghost" size="sm" onClick={() => setConfirmRevoke(null)}>
													Cancel
												</Button>
											</div>
										) : (
											<Button variant="ghost" size="sm" onClick={() => setConfirmRevoke(key.id)}>
												Revoke
											</Button>
										))}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	)
}
