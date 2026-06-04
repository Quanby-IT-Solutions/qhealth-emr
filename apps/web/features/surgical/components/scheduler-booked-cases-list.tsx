"use client"

import { useState } from "react"
import { Stethoscope } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

import { useSurgicalCaseListQuery, type SurgeryStatus } from "../api/surgical.hooks"

interface SchedulerBookedCasesListProps {
	facilityId: string
}

function formatDateTime(dateStr: string | null | undefined): string {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function statusVariant(status: SurgeryStatus) {
	switch (status) {
		case "in_progress":
			return "default" as const
		case "completed":
			return "secondary" as const
		case "cancelled":
		case "postponed":
			return "outline" as const
		default:
			return "outline" as const
	}
}

const STATUS_TABS: { value: SurgeryStatus; label: string }[] = [
	{ value: "scheduled", label: "Scheduled" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "completed", label: "Completed" },
	{ value: "cancelled", label: "Cancelled" },
]

function TableSkeleton() {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Patient</TableHead>
					<TableHead>Procedure</TableHead>
					<TableHead>OR Suite</TableHead>
					<TableHead>Surgeon</TableHead>
					<TableHead>Anesthesiologist</TableHead>
					<TableHead>Scheduled</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody aria-busy aria-label="Loading booked cases">
				{Array.from({ length: 4 }).map((_, i) => (
					<TableRow key={i}>
						<TableCell>
							<Skeleton className="h-4 w-32" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-40" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-16" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-28" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-28" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-36" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-5 w-20 rounded-full" />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}

export function SchedulerBookedCasesList({ facilityId }: SchedulerBookedCasesListProps) {
	const [activeTab, setActiveTab] = useState<SurgeryStatus>("scheduled")

	const { data, isLoading, isError } = useSurgicalCaseListQuery({
		facilityId,
		status: activeTab,
	})

	const cases = data?.data ?? []

	return (
		<div className="px-6 pb-6">
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Stethoscope className="size-4" />
						Booked Cases
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="border-b px-4 pt-1 pb-3">
						<Tabs value={activeTab} onValueChange={v => setActiveTab(v as SurgeryStatus)}>
							<TabsList>
								{STATUS_TABS.map(tab => (
									<TabsTrigger key={tab.value} value={tab.value}>
										{tab.label}
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					</div>

					{isLoading ? (
						<TableSkeleton />
					) : isError ? (
						<div className="text-destructive py-10 text-center text-sm">
							Unable to load booked cases. Please try again.
						</div>
					) : cases.length === 0 ? (
						<div className="flex flex-col items-center gap-2 py-10 text-center">
							<Stethoscope className="text-muted-foreground size-8" />
							<p className="text-muted-foreground text-sm">No cases booked yet.</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Patient</TableHead>
									<TableHead>Procedure</TableHead>
									<TableHead>OR Suite</TableHead>
									<TableHead>Surgeon</TableHead>
									<TableHead>Anesthesiologist</TableHead>
									<TableHead>Scheduled</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{cases.map(c => (
									<TableRow key={c.id}>
										<TableCell className="font-medium">{c.patientName ?? "—"}</TableCell>
										<TableCell>{c.procedureName}</TableCell>
										<TableCell>{c.orSuite ?? "—"}</TableCell>
										<TableCell>{c.surgeonName ?? "—"}</TableCell>
										<TableCell>{c.anesthesiologistName ?? "—"}</TableCell>
										<TableCell>{formatDateTime(c.scheduledDatetime)}</TableCell>
										<TableCell>
											<Badge variant={statusVariant(c.status)}>{c.status.replace(/_/g, " ")}</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
