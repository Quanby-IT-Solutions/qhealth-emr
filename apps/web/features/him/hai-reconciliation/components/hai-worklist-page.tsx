"use client"

import { useCallback, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Textarea } from "@/core/components/ui/textarea"
import { FilterBar, FilterField } from "@/features/admin/components/filter-bar"
import { EmptyState, ErrorState, SkeletonRows } from "@/features/admin/components/state-views"
import { TableToolbar } from "@/features/admin/components/table-toolbar"
import { useWardsQuery } from "@/features/beds/api/beds.hooks"

import {
	useConfirmHaiMutation,
	useDismissHaiMutation,
	useHaiQuery,
	useReclassifyHaiMutation,
} from "../api/hai.hooks"

interface HaiWorklistPageProps {
	facilityId: string
}

const TYPES = ["clabsi", "cauti", "vap", "ssi", "cdiff"] as const
type HaiType = (typeof TYPES)[number]

export function HaiWorklistPage({ facilityId }: HaiWorklistPageProps) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	const filterType = (searchParams.get("type") ?? "all") as "all" | HaiType
	const filterWard = searchParams.get("ward") ?? "all"
	const dateFrom = searchParams.get("from") ?? ""
	const dateTo = searchParams.get("to") ?? ""

	const { data: wards } = useWardsQuery(facilityId)

	const { data, isLoading, isError, refetch, error } = useHaiQuery({
		facilityId,
		haiType: filterType !== "all" ? filterType : undefined,
		wardId: filterWard !== "all" ? filterWard : undefined,
		dateFrom: dateFrom || undefined,
		dateTo: dateTo || undefined,
	})

	const { mutate: confirm } = useConfirmHaiMutation()
	const { mutate: reclassify } = useReclassifyHaiMutation()
	const { mutate: dismiss } = useDismissHaiMutation()

	const [reclassOpen, setReclassOpen] = useState<string | null>(null)
	const [reclassPrev, setReclassPrev] = useState<string>("")
	const [reclassNew, setReclassNew] = useState<HaiType>("clabsi")
	const [reclassReason, setReclassReason] = useState("")

	const [dismissOpen, setDismissOpen] = useState<string | null>(null)
	const [dismissReason, setDismissReason] = useState("")

	const updateParam = useCallback(
		(key: string, value: string) => {
			const params = new URLSearchParams(searchParams.toString())
			if (value && value !== "all") params.set(key, value)
			else params.delete(key)
			router.replace(`${pathname}?${params.toString()}`, { scroll: false })
		},
		[router, pathname, searchParams]
	)

	return (
		<div className="space-y-3 px-4 py-3">
			<TableToolbar
				title="HAI Surveillance Worklist"
				description="Review and reconcile healthcare-associated infection tags."
				actions={
					<Button size="sm" variant="outline" onClick={() => router.push("/him/hai/report")}>
						View Report
					</Button>
				}
			/>

			<FilterBar>
				<FilterField label="HAI Type" htmlFor="ht-f">
					<Select value={filterType} onValueChange={v => updateParam("type", v ?? "")}>
						<SelectTrigger id="ht-f" className="h-8 w-32 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All types</SelectItem>
							{TYPES.map(t => (
								<SelectItem key={t} value={t} className="uppercase">
									{t}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FilterField>
				<FilterField label="Ward" htmlFor="hw-f">
					<Select value={filterWard} onValueChange={v => updateParam("ward", v ?? "")}>
						<SelectTrigger id="hw-f" className="h-8 w-44 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All wards</SelectItem>
							{(wards ?? []).map(w => (
								<SelectItem key={w.id} value={w.id} className="text-xs">
									{w.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FilterField>
				<FilterField label="From" htmlFor="hf-f">
					<Input
						id="hf-f"
						type="date"
						value={dateFrom}
						onChange={e => updateParam("from", e.target.value)}
						className="h-8 w-36 text-xs"
					/>
				</FilterField>
				<FilterField label="To" htmlFor="ht-t">
					<Input
						id="ht-t"
						type="date"
						value={dateTo}
						onChange={e => updateParam("to", e.target.value)}
						className="h-8 w-36 text-xs"
					/>
				</FilterField>
			</FilterBar>

			{isLoading && <SkeletonRows count={5} />}
			{isError && <ErrorState error={error} retry={refetch} />}
			{data && data.tags.length === 0 && !isLoading && (
				<EmptyState title="No HAI tags match filters" />
			)}

			{data && data.tags.length > 0 && (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Patient</TableHead>
							<TableHead>Encounter</TableHead>
							<TableHead className="w-24">HAI Type</TableHead>
							<TableHead>Tagged-by Nurse</TableHead>
							<TableHead className="w-32">Tagged Date</TableHead>
							<TableHead className="w-28">Linked ICD-10</TableHead>
							<TableHead className="w-32">Reconciliation Status</TableHead>
							<TableHead className="w-72 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.tags.map(t => (
							<TableRow key={t.id}>
								<TableCell>
									<div className="space-y-0.5">
										<p className="text-sm font-medium">{t.patientName}</p>
										<p className="text-muted-foreground text-xs">{t.wardName ?? "Ward pending"}</p>
									</div>
								</TableCell>
								<TableCell className="font-mono text-xs">{t.encounterId.slice(0, 8)}…</TableCell>
								<TableCell>
									<Badge variant="outline" className="text-[10px] uppercase">
										{t.haiType}
									</Badge>
								</TableCell>
								<TableCell className="text-xs">
									{t.taggedByNurse ?? "Nurse record pending"}
								</TableCell>
								<TableCell className="text-xs">
									{new Date(t.detectedAt).toLocaleDateString("en-PH")}
								</TableCell>
								<TableCell className="font-mono text-xs">
									{t.linkedIcd10Code ?? "Not linked"}
								</TableCell>
								<TableCell>
									<Badge
										variant={
											t.status === "confirmed"
												? "default"
												: t.status === "pending"
													? "outline"
													: "secondary"
										}
										className="text-[10px] capitalize"
									>
										{t.status}
									</Badge>
								</TableCell>
								<TableCell className="text-right">
									<div className="flex justify-end gap-1.5">
										<Button size="sm" variant="ghost" onClick={() => confirm({ haiTagId: t.id })}>
											Confirm
										</Button>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => {
												setReclassOpen(t.id)
												setReclassPrev(t.haiType)
												setReclassReason("")
											}}
										>
											Reclassify
										</Button>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => {
												setDismissOpen(t.id)
												setDismissReason("")
											}}
										>
											Dismiss
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<Dialog open={!!reclassOpen} onOpenChange={open => !open && setReclassOpen(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reclassify HAI</DialogTitle>
						<DialogDescription>Compare original vs new tag side-by-side.</DialogDescription>
					</DialogHeader>
					<div className="grid grid-cols-2 gap-3">
						<div className="bg-muted/30 rounded-md border p-3">
							<p className="text-muted-foreground text-xs">Original</p>
							<p className="font-mono text-sm uppercase">{reclassPrev}</p>
						</div>
						<div className="rounded-md border p-3">
							<p className="text-muted-foreground text-xs">New</p>
							<Select value={reclassNew} onValueChange={v => setReclassNew(v as HaiType)}>
								<SelectTrigger className="mt-1 h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TYPES.map(t => (
										<SelectItem key={t} value={t} className="uppercase">
											{t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-1">
						<Label htmlFor="rcl-reason">Reason</Label>
						<Textarea
							id="rcl-reason"
							value={reclassReason}
							onChange={e => setReclassReason(e.target.value)}
							rows={3}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setReclassOpen(null)}>
							Cancel
						</Button>
						<Button
							disabled={!reclassReason.trim()}
							onClick={() =>
								reclassify(
									{ haiTagId: reclassOpen!, newType: reclassNew, reason: reclassReason },
									{ onSuccess: () => setReclassOpen(null) }
								)
							}
						>
							Confirm Reclassify
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={!!dismissOpen} onOpenChange={open => !open && setDismissOpen(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Dismiss HAI</DialogTitle>
						<DialogDescription>Reason recorded in audit trail.</DialogDescription>
					</DialogHeader>
					<div className="space-y-1">
						<Label htmlFor="dis-reason">Reason</Label>
						<Textarea
							id="dis-reason"
							value={dismissReason}
							onChange={e => setDismissReason(e.target.value)}
							rows={3}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDismissOpen(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={!dismissReason.trim()}
							onClick={() =>
								dismiss(
									{ haiTagId: dismissOpen!, reason: dismissReason },
									{ onSuccess: () => setDismissOpen(null) }
								)
							}
						>
							Confirm Dismiss
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
