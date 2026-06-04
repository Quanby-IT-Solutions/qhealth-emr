"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Clock, ListFilter, Search, Stethoscope, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/core/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
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
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useCancelPreEncounterMutation, useEdQueueQuery } from "@/features/ed/api/ed.hooks"
import { TraumaAliasBadge } from "@/features/ed/components/trauma-alias-badge"
import { TriageForm } from "@/features/ed/components/triage-form"
import { acuityColor, acuityLabel } from "@/features/ed/lib/acuity-utils"

const ACUITY_COLUMNS = [1, 2, 3, 4, 5] as const

interface TriageQueueItem {
	id: string
	type: "pre_encounter" | "encounter"
	patientName: string
	traumaAlias: string | null
	acuityLevel: number | null
	acuityScale: "esi" | "ats" | "ctas" | null
	chiefComplaint: string | null
	arrivalTime: string | Date
	queueStatus: "waiting" | "triage" | "being_seen" | "disposition"
	inboundHandoff?: {
		id: string
		callerName: string
		patientLocation: string
		transportMode: "ambulance" | "private_vehicle" | "walk_in" | "motorcycle_ambulance"
		channelType: "phone" | "video"
		etaMinutes: number
		etaAt: string | Date
		arrivedAt: string | Date | null
		assessmentNotes: string
		resourceNeeds: {
			bed: boolean
			codeTeam: boolean
			equipment: string[]
		}
	} | null
}

function formatElapsed(arrivalTime: string | Date, now: number) {
	const minutes = Math.max(0, Math.floor((now - new Date(arrivalTime).getTime()) / 60_000))
	const hours = Math.floor(minutes / 60)
	const remainingMinutes = minutes % 60

	if (hours > 0) {
		return `${hours}h ${remainingMinutes}m`
	}

	return `${remainingMinutes}m`
}

function formatArrival(arrivalTime: string | Date) {
	return new Date(arrivalTime).toLocaleTimeString("en-PH", {
		hour: "2-digit",
		minute: "2-digit",
	})
}

function formatLabel(value: string) {
	return value
		.split("_")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")
}

function formatResourceNeeds(
	needs: NonNullable<TriageQueueItem["inboundHandoff"]>["resourceNeeds"]
) {
	const resources = [
		needs.bed ? "Bed" : null,
		needs.codeTeam ? "Code team" : null,
		...needs.equipment,
	].filter(Boolean)

	return resources.length > 0 ? resources.join(", ") : "No special resources"
}

function formatInboundHandoff(item: TriageQueueItem) {
	if (!item.inboundHandoff) return null

	return [
		formatLabel(item.inboundHandoff.transportMode),
		`ETA ${formatArrival(item.inboundHandoff.etaAt)}`,
		formatResourceNeeds(item.inboundHandoff.resourceNeeds),
	].join(" · ")
}

function matchesSearch(item: TriageQueueItem, query: string) {
	if (!query) return true

	const searchable = [
		item.patientName,
		item.traumaAlias,
		item.chiefComplaint,
		item.acuityScale,
		item.queueStatus,
		item.inboundHandoff?.callerName,
		item.inboundHandoff?.patientLocation,
		item.inboundHandoff?.assessmentNotes,
	].filter(Boolean)

	return searchable.some(value => String(value).toLowerCase().includes(query))
}

function TriageQueueTable({
	items,
	now,
	canRemoveTraumaAlias,
	onRequestRemoveTraumaAlias,
	removingId,
}: {
	items: TriageQueueItem[]
	now: number
	canRemoveTraumaAlias: boolean
	onRequestRemoveTraumaAlias: (item: TriageQueueItem) => void
	removingId: string | null
}) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="min-w-56">Patient</TableHead>
					<TableHead className="min-w-64">Chief complaint</TableHead>
					<TableHead className="w-28">Level</TableHead>
					<TableHead className="min-w-44">Handoff</TableHead>
					<TableHead>Arrival</TableHead>
					<TableHead>Elapsed</TableHead>
					<TableHead>Status</TableHead>
					<TableHead className="w-14 text-right">Action</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.length === 0 ? (
					<TableRow>
						<TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
							No patients match the current filters.
						</TableCell>
					</TableRow>
				) : (
					items.map(item => {
						const handoff = formatInboundHandoff(item)

						return (
							<TableRow key={`${item.type}-${item.id}`}>
								<TableCell>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											{item.type === "pre_encounter" ? (
												<TraumaAliasBadge
													alias={item.traumaAlias ?? item.id}
													acuityLevel={item.acuityLevel}
												/>
											) : (
												<span className="font-medium">{item.patientName}</span>
											)}
										</div>
										<p className="text-muted-foreground text-xs">
											{item.type === "pre_encounter" ? "Trauma alias" : "Registered patient"} ·{" "}
											{item.acuityScale?.toUpperCase() ?? "No scale"}
										</p>
									</div>
								</TableCell>
								<TableCell className="max-w-80 whitespace-normal">
									<p className="line-clamp-2 text-sm">
										{item.chiefComplaint || "No chief complaint recorded"}
									</p>
								</TableCell>
								<TableCell>
									<Badge className={cn("min-w-20 justify-center", acuityColor(item.acuityLevel))}>
										Level {item.acuityLevel ?? "-"}
									</Badge>
								</TableCell>
								<TableCell className="max-w-72 whitespace-normal">
									{handoff ? (
										<div className="space-y-1">
											<p className="line-clamp-2 text-sm">{handoff}</p>
											<p className="text-muted-foreground text-xs">
												From {item.inboundHandoff?.patientLocation}
											</p>
										</div>
									) : (
										<span className="text-muted-foreground">-</span>
									)}
								</TableCell>
								<TableCell>
									<div className="text-sm">{formatArrival(item.arrivalTime)}</div>
								</TableCell>
								<TableCell>
									<span className="text-muted-foreground inline-flex items-center gap-1">
										<Clock className="size-3" />
										{formatElapsed(item.arrivalTime, now)}
									</span>
								</TableCell>
								<TableCell>
									<Badge variant="outline">{formatLabel(item.queueStatus)}</Badge>
								</TableCell>
								<TableCell className="text-right">
									{item.type === "pre_encounter" && canRemoveTraumaAlias ? (
										<Button
											type="button"
											size="icon-sm"
											variant="ghost"
											disabled={removingId === item.id}
											aria-label="Remove trauma alias"
											onClick={() => onRequestRemoveTraumaAlias(item)}
										>
											<Trash2 className="size-4" />
										</Button>
									) : null}
								</TableCell>
							</TableRow>
						)
					})
				)}
			</TableBody>
		</Table>
	)
}

export default function TriageDashboardPage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const staffProfileId = profile?.staffProfiles?.[0]?.id ?? ""
	const [now, setNow] = useState(() => Date.now())
	const [triageOpen, setTriageOpen] = useState(false)
	const [removingId, setRemovingId] = useState<string | null>(null)
	const [removeTarget, setRemoveTarget] = useState<TriageQueueItem | null>(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedLevels, setSelectedLevels] = useState<number[]>([])

	const { data: queue, isLoading } = useEdQueueQuery(facilityId)
	const cancelPreEncounter = useCancelPreEncounterMutation()
	const permissions = profile?.activeRole?.permissions ?? []
	const canRemoveTraumaAlias = permissions.some(
		(permission: { module: string; action: string }) =>
			permission.module === "ed" && permission.action === "create"
	)

	useEffect(() => {
		const interval = window.setInterval(() => setNow(Date.now()), 30_000)
		return () => window.clearInterval(interval)
	}, [])

	const queueItems = useMemo(() => queue?.items ?? [], [queue?.items])
	const filteredItems = useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase()
		const selectedLevelSet = new Set(selectedLevels)

		return queueItems.filter(item => {
			const matchesLevel =
				selectedLevelSet.size === 0 ||
				(item.acuityLevel !== null && selectedLevelSet.has(item.acuityLevel))

			return matchesLevel && matchesSearch(item, normalizedQuery)
		})
	}, [queueItems, searchQuery, selectedLevels])

	const total = queue?.summary.total ?? 0
	const levelFilterLabel =
		selectedLevels.length === 0
			? "All levels"
			: `Level ${[...selectedLevels].sort((a, b) => a - b).join(", ")}`

	function toggleLevelFilter(level: number) {
		setSelectedLevels(current => {
			if (current.includes(level)) {
				return current.filter(item => item !== level)
			}

			return [...current, level]
		})
	}

	function handleRemoveTraumaAlias() {
		if (!removeTarget) return

		const target = removeTarget
		setRemovingId(target.id)
		cancelPreEncounter.mutate(
			{ id: target.id },
			{
				onSuccess: () => {
					toast.success(`${target.traumaAlias ?? "Trauma alias"} removed from queue.`)
					setRemoveTarget(null)
				},
				onError: error => {
					toast.error(error.message || "Unable to remove trauma alias.")
				},
				onSettled: () => setRemovingId(null),
			}
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Triage Queue Dashboard</h1>
					<p className="text-muted-foreground text-sm">
						{total} patient{total === 1 ? "" : "s"} sorted by arrival and acuity.
					</p>
				</div>
				<Dialog open={triageOpen} onOpenChange={setTriageOpen}>
					<DialogTrigger
						render={
							<Button disabled={!facilityId || !staffProfileId}>
								<Activity className="size-4" />
								New ER Triage
							</Button>
						}
					/>
					<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
						<DialogHeader>
							<DialogTitle>New ER Triage Assessment</DialogTitle>
						</DialogHeader>
						<TriageForm
							facilityId={facilityId}
							triageStaffId={staffProfileId}
							onSuccess={() => setTriageOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			</div>

			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div className="relative w-full md:max-w-md">
					<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
					<Input
						value={searchQuery}
						onChange={event => setSearchQuery(event.target.value)}
						placeholder="Search patient, alias, complaint, handoff..."
						className="pl-8"
					/>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button type="button" variant="outline" className="justify-between md:min-w-44">
								<ListFilter className="size-4" />
								{levelFilterLabel}
							</Button>
						}
					/>
					<DropdownMenuContent align="end" className="w-48">
						<DropdownMenuGroup>
							<DropdownMenuLabel>Filter by level</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem
								checked={selectedLevels.length === 0}
								onCheckedChange={() => setSelectedLevels([])}
							>
								All levels
							</DropdownMenuCheckboxItem>
							{ACUITY_COLUMNS.map(level => (
								<DropdownMenuCheckboxItem
									key={level}
									checked={selectedLevels.includes(level)}
									onCheckedChange={() => toggleLevelFilter(level)}
								>
									Level {level} · {acuityLabel(level)}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuGroup>
						{selectedLevels.length > 0 ? (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => setSelectedLevels([])}>
									Clear filter
								</DropdownMenuItem>
							</>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{isLoading ? (
				<Card>
					<CardHeader>
						<Skeleton className="h-8 w-48" />
					</CardHeader>
					<CardContent className="space-y-2">
						{Array.from({ length: 6 }).map((_, index) => (
							<Skeleton key={index} className="h-12 w-full" />
						))}
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader className="border-b py-3">
						<p className="text-muted-foreground text-sm">
							Showing {filteredItems.length} of {total} active queue item
							{total === 1 ? "" : "s"}.
						</p>
					</CardHeader>
					<CardContent className="px-0 pb-0">
						<TriageQueueTable
							items={filteredItems}
							now={now}
							canRemoveTraumaAlias={canRemoveTraumaAlias}
							onRequestRemoveTraumaAlias={setRemoveTarget}
							removingId={removingId}
						/>
					</CardContent>
				</Card>
			)}

			<AlertDialog
				open={!!removeTarget}
				onOpenChange={open => {
					if (!open && !removingId) {
						setRemoveTarget(null)
					}
				}}
			>
				<AlertDialogContent className="!h-auto !max-h-[calc(100svh-2rem)] !w-[min(30rem,calc(100vw-2rem))] !max-w-none">
					<AlertDialogHeader>
						<AlertDialogTitle>Remove trauma alias?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove {removeTarget?.traumaAlias ?? "this trauma alias"} from the triage
							queue. It can only be done before the alias is merged.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={!!removingId}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							type="button"
							variant="destructive"
							disabled={!!removingId}
							onClick={handleRemoveTraumaAlias}
						>
							{removingId ? "Removing..." : "Remove"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Card className="border-dashed">
				<CardContent className="text-muted-foreground flex items-start gap-3 p-4 text-sm">
					<Stethoscope className="mt-0.5 size-4 shrink-0" />
					<span>
						Level 1 and 2 cases receive trauma aliases through the existing ED pre-encounter
						workflow. Elapsed time updates automatically while the board is open.
					</span>
				</CardContent>
			</Card>
		</div>
	)
}
