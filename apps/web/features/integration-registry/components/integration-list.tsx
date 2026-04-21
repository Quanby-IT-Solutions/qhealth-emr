"use client"

import { useState } from "react"

import Link from "next/link"

import { Plus, Search } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
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
import { useIntegrationsListQuery } from "@/features/integration-registry/api/integration-registry.hooks"

const KIND_LABELS: Record<string, string> = {
	fhir: "FHIR",
	civil_registry: "Civil Registry",
	hai: "HAI",
	philhealth: "PhilHealth",
	custom: "Custom",
}

const CREDENTIAL_STATUS_BADGE: Record<
	string,
	{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
	ok: { label: "Credential OK", variant: "default" },
	missing_in_env: { label: "Missing in env", variant: "destructive" },
	not_in_whitelist: { label: "Not whitelisted", variant: "destructive" },
	unset: { label: "No credential", variant: "outline" },
}

export function IntegrationList() {
	const { data: integrations, isLoading, error } = useIntegrationsListQuery()
	const [search, setSearch] = useState("")
	const [kindFilter, setKindFilter] = useState<string>("all")

	if (isLoading) {
		return (
			<div className="space-y-2">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-48 w-full" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="text-destructive text-sm">
				Failed to load integrations. Please refresh the page.
			</div>
		)
	}

	const filtered = (integrations ?? []).filter(i => {
		const matchesSearch =
			!search ||
			i.name.toLowerCase().includes(search.toLowerCase()) ||
			i.endpointUrl.toLowerCase().includes(search.toLowerCase())
		const matchesKind = kindFilter === "all" || i.kind === kindFilter
		return matchesSearch && matchesKind
	})

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<div className="relative">
						<Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
						<Input
							placeholder="Search integrations…"
							value={search}
							onChange={e => setSearch(e.target.value)}
							className="pl-8 w-64"
						/>
					</div>
					<select
						value={kindFilter}
						onChange={e => setKindFilter(e.target.value)}
						className="border-input rounded-md border px-3 py-2 text-sm"
					>
						<option value="all">All kinds</option>
						<option value="fhir">FHIR</option>
						<option value="civil_registry">Civil Registry</option>
						<option value="hai">HAI</option>
						<option value="philhealth">PhilHealth</option>
						<option value="custom">Custom</option>
					</select>
				</div>
				<Link href="/admin/integration-registry/new">
					<Button size="sm">
						<Plus className="mr-1.5 size-4" />
						Add integration
					</Button>
				</Link>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Kind</TableHead>
							<TableHead>Endpoint</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Credentials</TableHead>
							<TableHead>Last sync</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="text-muted-foreground text-center py-8 text-sm"
								>
									{search || kindFilter !== "all"
										? "No integrations match your filter."
										: "No integrations configured yet."}
								</TableCell>
							</TableRow>
						) : (
							filtered.map(integration => {
								const credBadge =
									CREDENTIAL_STATUS_BADGE[integration.credentialStatus] ??
									CREDENTIAL_STATUS_BADGE.unset!

								return (
									<TableRow key={integration.id}>
										<TableCell className="font-medium">
											{integration.name}
										</TableCell>
										<TableCell>
											<Badge variant="secondary" className="text-xs">
												{KIND_LABELS[integration.kind] ?? integration.kind}
											</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground max-w-48 truncate text-xs">
											{integration.endpointUrl}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													integration.enabled ? "default" : "outline"
												}
											>
												{integration.enabled ? "Enabled" : "Disabled"}
											</Badge>
										</TableCell>
										<TableCell>
											<Badge variant={credBadge.variant} className="text-xs">
												{credBadge.label}
											</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{integration.lastSyncAt
												? new Date(
														integration.lastSyncAt
													).toLocaleString("en-PH", {
														dateStyle: "short",
														timeStyle: "short",
													})
												: "—"}
											{integration.lastSyncStatus && (
												<span
													className={
														integration.lastSyncStatus === "ok"
															? "text-green-600 ml-1"
															: "text-red-600 ml-1"
													}
												>
													({integration.lastSyncStatus})
												</span>
											)}
										</TableCell>
										<TableCell>
											<Link
												href={`/admin/integration-registry/${integration.id}`}
												className="text-primary text-xs hover:underline"
											>
												Open
											</Link>
										</TableCell>
									</TableRow>
								)
							})
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
