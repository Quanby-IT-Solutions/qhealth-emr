"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
	useSurgicalCaseListQuery,
	type SurgeryStatus,
	type SurgicalCase,
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
	onRowClick: (caseId: string) => void
}

function SurgicalTable({ cases, onRowClick }: SurgicalTableProps) {
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
				{cases.map(c => (
					<TableRow
						key={c.id}
						className="hover:bg-muted/50 cursor-pointer"
						onClick={() => onRowClick(c.id)}
					>
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
	const router = useRouter()
	const { data: profile } = useMyProfile()
	const activeStaffProfile =
		profile?.staffProfiles?.find(staffProfile =>
			staffProfile.roles?.some(role => role.id === profile.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]
	const facilityId = activeStaffProfile?.facilityId ?? ""
	const roleName = (profile?.activeRole?.name ?? "").toLowerCase()
	const isSurgeon = roleName === "surgeon"
	const isAnesthesiologist = roleName === "anesthesiologist"
	const ownCaseFilter = isSurgeon
		? { surgeonStaffId: activeStaffProfile?.id }
		: isAnesthesiologist
			? { anesthesiologistStaffId: activeStaffProfile?.id }
			: {}

	const [activeTab, setActiveTab] = useState<SurgeryStatus>("scheduled")

	const { data, isLoading } = useSurgicalCaseListQuery({
		facilityId,
		status: activeTab,
		...ownCaseFilter,
	})
	const caseScopeLabel = isSurgeon || isAnesthesiologist ? "My Cases" : "All Cases"

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
				<div className="flex items-center gap-2">
					<Badge variant="secondary">{caseScopeLabel}</Badge>
					<Button variant="outline" nativeButton={false} render={<a href="/or/schedule" />}>
						OR Schedule Calendar
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Surgical Cases</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="border-b px-4 pt-1 pb-0">
						<Tabs value={activeTab} onValueChange={v => setActiveTab(v as SurgeryStatus)}>
							<TabsList variant="line">
								{STATUS_TABS.map(tab => (
									<TabsTrigger key={tab.value} value={tab.value}>
										{tab.label}
										{(counts[tab.value] ?? 0) > 0 && (
											<Badge variant="secondary" className="ml-1.5 text-[10px]">
												{counts[tab.value]}
											</Badge>
										)}
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					</div>
					{isLoading ? (
						<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
					) : (
						<SurgicalTable
							cases={data?.data ?? []}
							onRowClick={id => router.push(`/surgical/${id}`)}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
