"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
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
import { useMalasakitCasesQuery } from "@/features/msw/malasakit-tracking/api/malasakit.hooks"

type Source = "DSWD" | "PCSO" | "DOH-MAIFIP" | "all"
type Status = "pending" | "approved" | "released" | "denied" | "all"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	pending: "secondary",
	approved: "default",
	released: "outline",
	denied: "destructive",
}

function MalasakitQueueInner() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const sourceFilter = (searchParams.get("source") ?? "all") as Source
	const statusFilter = (searchParams.get("status") ?? "all") as Status
	const dateFrom = searchParams.get("dateFrom") ?? ""
	const dateTo = searchParams.get("dateTo") ?? ""

	const { data, isLoading, error } = useMalasakitCasesQuery({
		source: sourceFilter === "all" ? undefined : sourceFilter,
		status: statusFilter === "all" ? undefined : statusFilter,
		dateFrom: dateFrom || undefined,
		dateTo: dateTo || undefined,
	})

	const setFilter = (key: string, value: string) => {
		const p = new URLSearchParams(searchParams.toString())
		if (!value || value === "all") p.delete(key)
		else p.set(key, value)
		router.replace(`/msw/malasakit?${p.toString()}`)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">Malasakit Case Tracking</h1>
					<p className="text-sm text-muted-foreground">Story 12.10 · Flow L10</p>
				</div>
				<Button size="sm" className="gap-1.5">
					<Plus className="size-4" />
					New Case
				</Button>
			</div>

			<div className="flex flex-wrap gap-3">
				<Select value={sourceFilter} onValueChange={v => v && setFilter("source", v)}>
					<SelectTrigger className="w-[160px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Sources</SelectItem>
						<SelectItem value="DSWD">DSWD</SelectItem>
						<SelectItem value="PCSO">PCSO</SelectItem>
						<SelectItem value="DOH-MAIFIP">DOH-MAIFIP</SelectItem>
					</SelectContent>
				</Select>
				<Select value={statusFilter} onValueChange={v => v && setFilter("status", v)}>
					<SelectTrigger className="w-[160px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="pending">Pending</SelectItem>
						<SelectItem value="approved">Approved</SelectItem>
						<SelectItem value="released">Released</SelectItem>
						<SelectItem value="denied">Denied</SelectItem>
					</SelectContent>
				</Select>
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">Date From</Label>
					<Input
						type="date"
						className="w-[155px]"
						value={dateFrom}
						onChange={e => setFilter("dateFrom", e.target.value)}
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">Date To</Label>
					<Input
						type="date"
						className="w-[155px]"
						value={dateTo}
						onChange={e => setFilter("dateTo", e.target.value)}
					/>
				</div>
			</div>

			{isLoading && (
				<div className="space-y-2">
					{[1, 2, 3].map(i => (
						<Skeleton key={i} className="h-16 w-full rounded-lg" />
					))}
				</div>
			)}

			{error && (
				<Card>
					<CardContent className="py-8 text-center text-sm text-destructive">
						Failed to load cases. Please try again.
					</CardContent>
				</Card>
			)}

			{!isLoading && !error && data?.data.length === 0 && (
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">
						No Malasakit cases found.
					</CardContent>
				</Card>
			)}

			{!isLoading && !error && data && data.data.length > 0 && (
				<div className="space-y-2">
					{data.data.map(c => (
						<Card key={c.id} className="cursor-pointer transition-colors hover:bg-accent/50">
							<CardContent
								className="flex items-center justify-between py-4"
								onClick={() => router.push(`/msw/malasakit/${c.id}`)}
							>
								<div className="space-y-1">
									<p className="text-sm font-medium">{c.patientName ?? c.patientId}</p>
									<div className="flex items-center gap-2">
										<Badge variant="outline">{c.source}</Badge>
										<Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>{c.status}</Badge>
										{c.amountGranted != null && (
											<span className="text-xs text-muted-foreground">
												₱{c.amountGranted.toLocaleString()}
											</span>
										)}
									</div>
								</div>
								<span className="text-xs text-muted-foreground">
									{new Date(c.updatedAt).toLocaleDateString()}
								</span>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{data && data.totalPages > 1 && (
				<p className="text-center text-xs text-muted-foreground">
					Page {data.page} of {data.totalPages} · {data.total} cases
				</p>
			)}
		</div>
	)
}

export function MalasakitQueueClient() {
	return (
		<Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
			<MalasakitQueueInner />
		</Suspense>
	)
}
