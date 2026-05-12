"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowRight, Baby, Loader2, Search, ShieldAlert, UserRound, WifiOff } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { BreakGlassForm } from "@/features/audit/components/break-glass-form"
import { useOfflinePatients } from "@/features/offline-cache/lib/use-offline-patients"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
import { orpc } from "@/services/orpc/client"

const BREAK_GLASS_REQUIRED_MESSAGE = "Break-glass required for this patient chart."

function isBreakGlassRequiredError(error: unknown) {
	if (!error || typeof error !== "object") return false
	const candidate = error as { status?: number; message?: string } | null
	return (
		candidate?.message?.includes(BREAK_GLASS_REQUIRED_MESSAGE) === true ||
		String(error).includes(BREAK_GLASS_REQUIRED_MESSAGE)
	)
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateVal: string | null | undefined) {
	if (!dateVal) return "—"
	return new Date(dateVal).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function formatPatientName({
	firstName,
	middleName,
	lastName,
}: {
	firstName: string
	middleName?: string | null
	lastName: string
}) {
	return [firstName, middleName, lastName].filter(Boolean).join(" ")
}

function calculateAge(dateOfBirth: string): string {
	const dob = new Date(dateOfBirth)
	const today = new Date()
	const ageMs = today.getTime() - dob.getTime()
	const ageDays = ageMs / (1000 * 60 * 60 * 24)
	if (ageDays < 30) return `${Math.floor(ageDays)}d`
	const ageYears = Math.floor(ageDays / 365)
	return `${ageYears} yrs`
}

function isNewborn(dateOfBirth: string): boolean {
	return (Date.now() - new Date(dateOfBirth).getTime()) / (1000 * 60 * 60 * 24) < 30
}

// ============================================================================
// PatientListCard — self-contained patient list with break-glass support
// ============================================================================

export function PatientListCard() {
	const facilityId = useActiveFacilityId() ?? ""
	const [filter, setFilter] = useState("")
	const [breakGlassPatientId, setBreakGlassPatientId] = useState<string | null>(null)
	const [checkingPatientId, setCheckingPatientId] = useState<string | null>(null)
	const router = useRouter()
	const queryClient = useQueryClient()

	const handleOpenChart = async (patientId: string) => {
		setCheckingPatientId(patientId)
		try {
			await queryClient.fetchQuery(
				orpc.patient.get.queryOptions({ input: { id: patientId } })
			)
			router.push(`/patients/${patientId}?from=list`)
		} catch (error) {
			if (isBreakGlassRequiredError(error)) {
				setBreakGlassPatientId(patientId)
			} else {
				router.push(`/patients/${patientId}?from=list`)
			}
		} finally {
			setCheckingPatientId(null)
		}
	}

	const { isOnline, offlinePatients, cachedAt } = useOfflinePatients()

	const { data, isLoading } = usePatientSearchQuery(
		{ facilityId, isActive: true, page: 1, limit: 100 },
		{ enabled: !!facilityId && isOnline }
	)

	const allPatients = isOnline ? (data?.data ?? []) : offlinePatients

	const trimmed = filter.trim().toLowerCase()
	const filtered = useMemo(() => {
		if (!trimmed) return allPatients
		return allPatients.filter(p => {
			const name = formatPatientName(p).toLowerCase()
			const mrn = (p.mrn ?? "").toLowerCase()
			return name.includes(trimmed) || mrn.includes(trimmed)
		})
	}, [allPatients, trimmed])

	return (
		<>
			{!isOnline && (
				<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
					<WifiOff className="mt-0.5 size-4 shrink-0 text-amber-600" />
					<div>
						<p className="font-medium text-amber-800 dark:text-amber-300">Working offline</p>
						<p className="text-amber-700 dark:text-amber-400">
							{offlinePatients.length > 0
								? `Showing ${offlinePatients.length.toLocaleString()} cached patients${cachedAt ? ` · Last updated ${new Date(cachedAt).toLocaleString("en-PH")}` : ""}.`
								: "No offline cache available. Reconnect to load patients."}
						</p>
					</div>
				</div>
			)}

			<Card className="border-border/60 bg-card shadow-sm">
				<CardHeader className="border-border/60 border-b pb-5">
					<div className="flex items-start gap-3">
						<div className="bg-secondary/60 text-muted-foreground flex size-10 items-center justify-center rounded-xl">
							<UserRound className="size-4" />
						</div>
						<div className="space-y-1">
							<CardTitle className="tracking-tight">Patient List</CardTitle>
							<CardDescription>
								Browse all active patients. Search by name or MRN to open a chart.
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="pt-5 space-y-4">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
						<Input
							placeholder="Filter by name or MRN…"
							value={filter}
							onChange={e => setFilter(e.target.value)}
							className="pl-9 h-10 border-border/60 bg-background rounded-xl"
						/>
					</div>

					{isLoading && isOnline ? (
						<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
							Loading patients…
						</div>
					) : filtered.length === 0 ? (
						<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
							{trimmed ? `No patients match "${filter}".` : "No active patients found."}
						</div>
					) : (
						<>
							<p className="text-xs text-muted-foreground px-0.5">
								{filtered.length} {filtered.length === 1 ? "patient" : "patients"}
								{trimmed && ` matching "${filter}"`}
							</p>
							<div className="border-border/60 bg-background overflow-hidden rounded-2xl border divide-y divide-border/60">
								{filtered.map(patient => {
									const name = formatPatientName(patient)
									const dob = "dateOfBirth" in patient ? (patient as { dateOfBirth: string }).dateOfBirth : ""
									const newborn = dob ? isNewborn(dob) : false
									const lastEncounter = "lastEncounterDate" in patient
										? (patient as { lastEncounterDate?: string | null }).lastEncounterDate
										: null

									return (
										<div
											key={patient.id}
											className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between hover:bg-secondary/30 transition-colors"
										>
											<div className="min-w-0 space-y-1.5">
												<div className="flex flex-wrap items-center gap-2">
													<span className="text-foreground text-sm font-semibold tracking-tight">
														{name}
													</span>
													<Badge
														variant="secondary"
														className="border-border/60 bg-secondary/60 text-foreground rounded-full border px-2 py-0.5 font-mono text-[0.68rem] tracking-[0.14em]"
													>
														{patient.mrn}
													</Badge>
													{newborn && (
														<Badge className="gap-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[0.68rem] px-2 py-0.5">
															<Baby className="size-2.5" />
															Newborn
														</Badge>
													)}
												</div>
												<p className="text-muted-foreground text-xs">
													{dob ? `DOB ${formatDate(dob)} · Age ${calculateAge(dob)}` : ""}
													{lastEncounter ? ` · Last encounter ${formatDate(lastEncounter)}` : ""}
												</p>
											</div>

											<Button
												variant="ghost"
												size="sm"
												className="shrink-0 justify-between gap-2"
												disabled={checkingPatientId === patient.id}
												onClick={() => void handleOpenChart(patient.id)}
											>
												{checkingPatientId === patient.id ? (
													<>
														Checking…
														<Loader2 className="size-4 animate-spin" />
													</>
												) : (
													<>
														Open chart
														<ArrowRight className="size-4" />
													</>
												)}
											</Button>
										</div>
									)
								})}
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<Dialog open={!!breakGlassPatientId} onOpenChange={open => { if (!open) setBreakGlassPatientId(null) }}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<div className="flex items-center gap-3">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
								<ShieldAlert className="size-5 text-orange-600 dark:text-orange-400" />
							</div>
							<div>
								<DialogTitle className="text-lg">Emergency Override Access</DialogTitle>
								<DialogDescription className="mt-0.5">
									Break-glass request required to access this patient record.
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>
					{breakGlassPatientId && (
						<BreakGlassForm
							patientId={breakGlassPatientId}
							facilityId={facilityId}
							entityType="patient"
							entityId={breakGlassPatientId}
							onSuccess={() => {
								const id = breakGlassPatientId
								setBreakGlassPatientId(null)
								router.push(`/patients/${id}?from=list`)
							}}
							onCancel={() => setBreakGlassPatientId(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	)
}

// ============================================================================
// PatientListPage — layout wrapper used by /patients/search route
// ============================================================================

export function PatientListPage() {
	return (
		<div className="flex flex-col min-h-svh">
			<header className="border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-10">
				<div className="flex h-14 items-center gap-3 px-4">
					<div className="flex-1">
						<h1 className="text-base font-semibold tracking-tight">Patients</h1>
					</div>
				</div>
			</header>

			<main className="flex-1 p-4 md:p-6 space-y-5">
				<PatientListCard />
			</main>
		</div>
	)
}
