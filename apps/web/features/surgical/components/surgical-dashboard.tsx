"use client"

import { useState } from "react"

import { Stethoscope } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import {
	type SurgeryStatus,
	type SurgicalCase,
	useSurgicalCaseListQuery,
} from "../api/surgical.hooks"

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

function statusLabel(status: SurgeryStatus): string {
	return status.replace(/_/g, " ")
}

const STATUS_TABS: { value: SurgeryStatus | "all"; label: string }[] = [
	{ value: "scheduled", label: "Scheduled" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "completed", label: "Completed" },
	{ value: "cancelled", label: "Cancelled" },
]

interface SurgicalTableProps {
	cases: SurgicalCase[]
}

function SurgicalTable({ cases }: SurgicalTableProps) {
	if (cases.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 py-10 text-center">
				<Stethoscope className="text-muted-foreground size-8" />
				<p className="text-muted-foreground text-sm">No surgical cases found.</p>
			</div>
		)
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Patient</TableHead>
					<TableHead>Procedure</TableHead>
					<TableHead>Type</TableHead>
					<TableHead>OR Suite</TableHead>
					<TableHead>Surgeon</TableHead>
					<TableHead>Anesthesiologist</TableHead>
					<TableHead>Scheduled</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{cases.map((c) => (
					<TableRow key={c.id}>
						<TableCell className="font-medium">{c.patientName ?? "—"}</TableCell>
						<TableCell>{c.procedureName}</TableCell>
						<TableCell className="capitalize">{c.surgicalType}</TableCell>
						<TableCell>{c.orSuite ?? "—"}</TableCell>
						<TableCell>{c.surgeonName ?? "—"}</TableCell>
						<TableCell>{c.anesthesiologistName ?? "—"}</TableCell>
						<TableCell>{formatDateTime(c.scheduledDatetime)}</TableCell>
						<TableCell>
							<Badge variant={statusVariant(c.status)}>{statusLabel(c.status)}</Badge>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}

export function SurgicalDashboard() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const [activeTab, setActiveTab] = useState<SurgeryStatus>("scheduled")

	const { data, isLoading } = useSurgicalCaseListQuery({ facilityId, status: activeTab })

	const counts = STATUS_TABS.reduce<Record<string, number>>((acc, tab) => {
		acc[tab.value] = 0
		return acc
	}, {})

	return (
		<div className="space-y-4 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Surgical Services</h1>
					<p className="text-muted-foreground text-sm">
						Operating room schedule and surgical cases
					</p>
				</div>
				<Button variant="outline" nativeButton={false} render={<a href="/surgical/schedule" />}>
					OR Schedule Calendar
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Surgical Cases</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="border-b px-4 pb-0 pt-1">
						<Tabs
							value={activeTab}
							onValueChange={(v) => setActiveTab(v as SurgeryStatus)}
						>
							<TabsList variant="line">
								{STATUS_TABS.map((tab) => (
									<TabsTrigger key={tab.value} value={tab.value}>
										{tab.label}
										{counts[tab.value] > 0 && (
											<Badge
												variant="secondary"
												className="ml-1.5 text-[10px]"
											>
												{counts[tab.value]}
											</Badge>
										)}
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					</div>
					{isLoading ? (
						<div className="text-muted-foreground py-8 text-center text-sm">
							Loading…
						</div>
					) : (
						<SurgicalTable cases={data?.data ?? []} />
					)}
				</CardContent>
			</Card>
		</div>
	)
}
