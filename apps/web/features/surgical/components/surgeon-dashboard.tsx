"use client"

import Link from "next/link"
import {
	ArrowRight,
	CalendarClock,
	CheckCircle2,
	ClipboardPenLine,
	FileSearch,
	Loader2,
	Scissors,
	Search,
	ShieldCheck,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import type { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { useSurgicalCaseListQuery, type SurgicalCase, type SurgeryStatus } from "../api/surgical.hooks"

type MyProfile = NonNullable<ReturnType<typeof useMyProfile>["data"]>
type StaffProfile = MyProfile["staffProfiles"][number]

interface SurgeonDashboardProps {
	profile?: MyProfile
}

function getActiveStaffProfile(profile: MyProfile | undefined): StaffProfile | undefined {
	const activeRoleId = profile?.activeRole?.id
	return (
		profile?.staffProfiles?.find(sp => sp.roles.some(role => role.id === activeRoleId)) ??
		profile?.staffProfiles?.[0]
	)
}

function formatDateTime(value: string | null) {
	if (!value) return "Unscheduled"
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) return "Unscheduled"
	return parsed.toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	})
}

function statusLabel(status: SurgeryStatus) {
	return status.replace(/_/g, " ")
}

function CaseRow({ surgicalCase, actionLabel }: { surgicalCase: SurgicalCase; actionLabel: string }) {
	return (
		<div className="hover:bg-secondary/40 flex flex-col gap-2 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<p className="truncate text-sm font-semibold">{surgicalCase.procedureName}</p>
					<Badge variant="secondary" className="capitalize">
						{statusLabel(surgicalCase.status)}
					</Badge>
				</div>
				<p className="text-muted-foreground text-xs">
					{surgicalCase.patientName ?? "Patient not linked"} - {surgicalCase.orSuite ?? "OR not assigned"} -{" "}
					{formatDateTime(surgicalCase.scheduledDatetime)}
				</p>
			</div>
			<Button asChild size="xs" variant="outline" className="self-start sm:self-auto">
				<Link href={`/surgical/${surgicalCase.id}`}>
					{actionLabel}
					<ArrowRight className="size-3.5" />
				</Link>
			</Button>
		</div>
	)
}

function EmptyState({ title, description }: { title: string; description: string }) {
	return (
		<div className="border-border/60 bg-secondary/30 flex items-start gap-3 rounded-lg border border-dashed p-3">
			<div className="bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border">
				<CheckCircle2 className="size-4" />
			</div>
			<div className="space-y-1">
				<p className="text-sm font-medium">{title}</p>
				<p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
			</div>
		</div>
	)
}

export function SurgeonDashboard({ profile }: SurgeonDashboardProps) {
	const staffProfile = getActiveStaffProfile(profile)
	const facilityId = staffProfile?.facilityId ?? ""
	const staffProfileId = staffProfile?.id ?? ""

	const scheduledQuery = useSurgicalCaseListQuery({
		facilityId,
		surgeonStaffId: staffProfileId,
		status: "scheduled",
		limit: 8,
	})
	const inProgressQuery = useSurgicalCaseListQuery({
		facilityId,
		surgeonStaffId: staffProfileId,
		status: "in_progress",
		limit: 8,
	})
	const completedQuery = useSurgicalCaseListQuery({
		facilityId,
		surgeonStaffId: staffProfileId,
		status: "completed",
		limit: 8,
	})

	const scheduledCases = scheduledQuery.data?.data ?? []
	const inProgressCases = inProgressQuery.data?.data ?? []
	const completedCases = completedQuery.data?.data ?? []
	const activeCases = [...inProgressCases, ...scheduledCases]
	const nextCase = activeCases[0] ?? null
	const needsRvsCount = completedCases.length
	const isLoading =
		scheduledQuery.isLoading || inProgressQuery.isLoading || completedQuery.isLoading

	return (
		<div className="bg-secondary/20 -m-4 min-h-[calc(100vh-4rem)] p-3 md:-m-6 md:p-4 lg:-m-8">
			<div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3">
				<div className="bg-card flex flex-col gap-3 border px-3 py-2.5 shadow-sm md:flex-row md:items-center md:justify-between">
					<div className="min-w-0 space-y-1">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-xl font-bold tracking-tight">Surgeon Worklist</h1>
							<Badge variant="outline" className="font-normal">
								Surgeon
							</Badge>
						</div>
						<p className="text-muted-foreground text-sm">
							{profile?.user?.name ? `${profile.user.name} - ` : ""}
							assigned OR cases, operation records, and RVS mapping
						</p>
					</div>
					<div className="flex flex-col gap-2 md:min-w-[420px] md:flex-row md:items-center">
						<div className="grid grid-cols-3 gap-1.5 text-center">
							<div className="bg-background rounded-md border px-2 py-1">
								<p className="text-sm font-semibold">{scheduledCases.length}</p>
								<p className="text-muted-foreground text-[0.65rem]">Scheduled</p>
							</div>
							<div className="bg-background rounded-md border px-2 py-1">
								<p className="text-sm font-semibold">{inProgressCases.length}</p>
								<p className="text-muted-foreground text-[0.65rem]">In OR</p>
							</div>
							<div className="bg-background rounded-md border px-2 py-1">
								<p className="text-sm font-semibold">{needsRvsCount}</p>
								<p className="text-muted-foreground text-[0.65rem]">RVS</p>
							</div>
						</div>
						<div className="relative flex-1">
							<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
							<Input
								placeholder="Search patient or MRN..."
								className="h-9 pl-9"
								onKeyDown={event => {
									if (event.key === "Enter") {
										window.location.href = "/patients/search"
									}
								}}
							/>
						</div>
					</div>
				</div>

				<div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
					<div className="space-y-3">
						<Card size="sm" className="gap-0 shadow-sm">
							<CardHeader className="flex flex-row items-center justify-between gap-3 border-b pb-2">
								<div className="space-y-1">
									<CardTitle className="text-base">Now</CardTitle>
									<p className="text-muted-foreground text-xs">The next surgical action to take.</p>
								</div>
								<Badge variant={nextCase ? "default" : "secondary"}>
									{nextCase ? "Ready" : "Clear"}
								</Badge>
							</CardHeader>
							<CardContent className="pt-3">
								{isLoading ? (
									<div className="text-muted-foreground flex items-center gap-2 text-sm">
										<Loader2 className="size-4 animate-spin" />
										Loading surgical worklist...
									</div>
								) : nextCase ? (
									<CaseRow surgicalCase={nextCase} actionLabel="Open Record" />
								) : (
									<EmptyState
										title="No active OR case"
										description="Assigned scheduled and in-progress cases appear here first."
									/>
								)}
							</CardContent>
						</Card>

						<Card size="sm" className="gap-0 shadow-sm">
							<CardHeader className="flex flex-row items-center justify-between gap-3 border-b pb-2">
								<div className="space-y-1">
									<CardTitle className="text-base">Assigned Cases</CardTitle>
									<p className="text-muted-foreground text-xs">
										Scheduled and active operation records.
									</p>
								</div>
								<Badge variant="outline">{activeCases.length}</Badge>
							</CardHeader>
							<CardContent className="space-y-2 pt-3">
								{isLoading ? (
									<div className="text-muted-foreground flex items-center gap-2 text-sm">
										<Loader2 className="size-4 animate-spin" />
										Loading cases...
									</div>
								) : activeCases.length ? (
									activeCases
										.slice(0, 6)
										.map(surgicalCase => (
											<CaseRow
												key={surgicalCase.id}
												surgicalCase={surgicalCase}
												actionLabel="Open"
											/>
										))
								) : (
									<EmptyState
										title="No assigned cases"
										description="Scheduler-booked cases assigned to you will show here."
									/>
								)}
							</CardContent>
						</Card>
					</div>

					<div className="space-y-3">
						<Card size="sm" className="gap-0 shadow-sm">
							<CardHeader className="border-b pb-2">
								<CardTitle className="text-base">Surgical Actions</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 pt-3">
								<Link
									href="/surgical"
									className="hover:bg-secondary/40 flex items-start gap-3 rounded-lg border p-3 transition-colors"
								>
									<ClipboardPenLine className="text-muted-foreground mt-0.5 size-4" />
									<div className="min-w-0 flex-1">
										<p className="text-sm font-semibold">Operation records</p>
										<p className="text-muted-foreground text-xs">
											Document operative technique, personnel, and timestamps.
										</p>
									</div>
									<ArrowRight className="text-muted-foreground size-4" />
								</Link>
								<Link
									href="/surgical"
									className="hover:bg-secondary/40 flex items-start gap-3 rounded-lg border p-3 transition-colors"
								>
									<FileSearch className="text-muted-foreground mt-0.5 size-4" />
									<div className="min-w-0 flex-1">
										<p className="text-sm font-semibold">RVS mapping</p>
										<p className="text-muted-foreground text-xs">
											Map signed procedures to PhilHealth RVS codes.
										</p>
									</div>
									<ArrowRight className="text-muted-foreground size-4" />
								</Link>
								<Link
									href="/or/schedule"
									className="hover:bg-secondary/40 flex items-start gap-3 rounded-lg border p-3 transition-colors"
								>
									<CalendarClock className="text-muted-foreground mt-0.5 size-4" />
									<div className="min-w-0 flex-1">
										<p className="text-sm font-semibold">My OR schedule</p>
										<p className="text-muted-foreground text-xs">
											Read-only view of assigned operating room cases.
										</p>
									</div>
									<ArrowRight className="text-muted-foreground size-4" />
								</Link>
							</CardContent>
						</Card>

						<Card size="sm" className="gap-0 shadow-sm">
							<CardHeader className="border-b pb-2">
								<CardTitle className="text-base">Role Boundary</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 pt-3 text-xs text-muted-foreground">
								<div className="flex gap-2">
									<Scissors className="mt-0.5 size-4 shrink-0" />
									<p>Surgeon owns operation record signing and RVS procedure mapping.</p>
								</div>
								<div className="flex gap-2">
									<CalendarClock className="mt-0.5 size-4 shrink-0" />
									<p>Scheduler owns OR slot booking and case scheduling.</p>
								</div>
								<div className="flex gap-2">
									<ShieldCheck className="mt-0.5 size-4 shrink-0" />
									<p>Billing validates/finalizes RVS codes for claims.</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	)
}
