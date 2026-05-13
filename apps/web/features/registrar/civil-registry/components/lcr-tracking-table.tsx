"use client"

import Link from "next/link"
import { ArrowLeft01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
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
import {
	useListBirthRegistrationsQuery,
	useMarkBirthRegistrationPaidMutation,
	useMarkBirthRegistrationReleasedMutation,
} from "@/features/registrar/civil-registry/api/lcr.hooks"

function formatDate(value: Date | string | null | undefined): string {
	if (!value) return "—"
	return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" })
}

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, string> = {
		draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
		completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
		submitted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	}
	return (
		<Badge className={cn("text-[10px] px-1.5 font-medium capitalize", map[status] ?? "")}>
			{status}
		</Badge>
	)
}

export function LcrTrackingTable() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const staffId = profile?.user?.id ?? ""

	const { data, isLoading } = useListBirthRegistrationsQuery(
		{ facilityId },
		{ enabled: !!facilityId }
	)
	const markPaid = useMarkBirthRegistrationPaidMutation()
	const markReleased = useMarkBirthRegistrationReleasedMutation()

	const records = data?.data ?? []

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link
					href="/registrar/civil-registry"
					className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
				>
					<HugeiconsIcon icon={ArrowLeft01FreeIcons} className="size-4" />
					Civil Registry
				</Link>
			</div>

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">LCR Tracking</h1>
					<p className="text-sm text-muted-foreground">
						Birth certificate SLA checkpoints — SLA-017 (payment) and SLA-021 (release)
					</p>
				</div>
				<Link
					href="/registrar/civil-registry/birth"
					className={buttonVariants({ size: "sm" })}
				>
					New Birth Certificate
				</Link>
			</div>

			{isLoading && (
				<div className="space-y-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-12 w-full rounded" />
					))}
				</div>
			)}

			{!isLoading && records.length === 0 && (
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-muted-foreground">No birth registrations found for this facility.</p>
					</CardContent>
				</Card>
			)}

			{!isLoading && records.length > 0 && (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Type</TableHead>
								<TableHead>Certificate #</TableHead>
								<TableHead>Birth Date</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Requested</TableHead>
								<TableHead>Paid (SLA-017)</TableHead>
								<TableHead>Released (SLA-021)</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{records.map(record => (
								<TableRow key={record.id}>
									<TableCell>
										<Badge variant="outline" className="text-[10px]">Birth</Badge>
									</TableCell>
									<TableCell className="font-medium">
										{record.certificateNumber ?? <span className="text-muted-foreground">—</span>}
									</TableCell>
									<TableCell>{formatDate(record.birthDatetime)}</TableCell>
									<TableCell>
										<StatusBadge status={record.status} />
									</TableCell>
									<TableCell className="text-xs text-muted-foreground">
										{formatDate(record.requestedAt)}
									</TableCell>
									<TableCell className="text-xs text-muted-foreground">
										{record.paidAt ? (
											<span className="text-green-700 dark:text-green-400">
												{formatDate(record.paidAt)}
											</span>
										) : (
											"—"
										)}
									</TableCell>
									<TableCell className="text-xs text-muted-foreground">
										{record.releasedAt ? (
											<span className="text-green-700 dark:text-green-400">
												{formatDate(record.releasedAt)}
											</span>
										) : (
											"—"
										)}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-1">
											{!record.paidAt && (
												<Button
													size="sm"
													variant="outline"
													className="h-7 px-2 text-xs"
													disabled={markPaid.isPending}
													onClick={() => markPaid.mutate({ id: record.id })}
												>
													Mark Paid
												</Button>
											)}
											{record.paidAt && !record.releasedAt && staffId && (
												<Button
													size="sm"
													variant="outline"
													className="h-7 px-2 text-xs"
													disabled={markReleased.isPending}
													onClick={() =>
														markReleased.mutate({
															id: record.id,
															releasedByStaffId: staffId,
														})
													}
												>
													Mark Released
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<div className="px-4 py-2 text-xs text-muted-foreground">
						{data?.total ?? 0} total record{(data?.total ?? 0) === 1 ? "" : "s"}
					</div>
				</div>
			)}

			<div className="rounded-lg border border-border/70 p-4">
				<p className="text-sm font-medium">Death Certificates</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Death certificate records (FMDRF/FNDRF) are tracked per encounter.
					Open a patient encounter and use the Death Reporting section to view or update FMDRF/FNDRF status.
				</p>
				<Link
					href="/registrar/civil-registry/death"
					className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
				>
					New Death Certificate
				</Link>
			</div>
		</div>
	)
}
