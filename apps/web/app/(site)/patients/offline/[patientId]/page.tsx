"use client"

import { use, useMemo } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Clock, WifiOff } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import {
	loadPatientEncounterSummaries,
	loadPatientFromCache,
} from "@/features/offline-cache/lib/offline-cache"

function timeAgo(isoTimestamp: string): string {
	const diff = Date.now() - new Date(isoTimestamp).getTime()
	const hours = Math.floor(diff / (1000 * 60 * 60))
	if (hours < 1) {
		const minutes = Math.floor(diff / (1000 * 60))
		return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
	}
	if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`
	const days = Math.floor(hours / 24)
	return `${days} day${days !== 1 ? "s" : ""} ago`
}

function isStale(isoTimestamp: string): boolean {
	return Date.now() - new Date(isoTimestamp).getTime() > 24 * 60 * 60 * 1000
}

function formatDate(val: string) {
	return new Date(val).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function calculateAge(dob: string) {
	const ageDays = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24)
	if (ageDays < 30) return `${Math.floor(ageDays)}d`
	return `${Math.floor(ageDays / 365.25)} yrs`
}

function DisabledAction({ label }: { label: string }) {
	return (
		<Tooltip>
			<TooltipTrigger render={<span className="cursor-not-allowed" />}>
				<Button variant="outline" size="sm" disabled>
					{label}
				</Button>
			</TooltipTrigger>
			<TooltipContent>Unavailable offline</TooltipContent>
		</Tooltip>
	)
}

export default function CachedPatientSummaryPage({
	params,
}: {
	params: Promise<{ patientId: string }>
}) {
	const { patientId } = use(params)

	const patient = useMemo(() => loadPatientFromCache(patientId), [patientId])
	const encounterCaches = useMemo(() => loadPatientEncounterSummaries(patientId), [patientId])
	const latestCache = encounterCaches[0] ?? null
	const encounter = latestCache?.summary ?? null
	const cachedAt = latestCache?.cachedAt ?? null

	const name =
		patient
			? [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(" ")
			: (encounter?.encounter.patientName ?? "Unknown Patient")
	const mrn = patient?.mrn ?? encounter?.encounter.patientMrn ?? "—"
	const dob = patient?.dateOfBirth ?? encounter?.encounter.patientDateOfBirth ?? null
	const sex = patient?.sex ?? encounter?.encounter.patientSex ?? "—"

	if (!patient && !encounter) {
		return (
			<div className="space-y-5">
				<Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/patients/offline" />}>
					<ArrowLeft className="size-4" />
					Back to Cached Patients
				</Button>
				<Alert className="border-amber-200 bg-amber-50">
					<WifiOff className="size-4 text-amber-700" />
					<AlertTitle className="text-amber-900">No cached data available</AlertTitle>
					<AlertDescription className="text-amber-800">
						No offline cache exists for this patient. View the patient while online to build the
						cache.
					</AlertDescription>
				</Alert>
			</div>
		)
	}

	return (
		<div className="space-y-5">
			{/* Back navigation */}
			<Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/patients/offline" />}>
				<ArrowLeft className="size-4" />
				Back to Cached Patients
			</Button>

			{/* Offline Read-Only banner */}
			<Alert className="border-amber-300 bg-amber-50">
				<WifiOff className="size-4 text-amber-700" />
				<AlertTitle className="text-amber-900">Offline — Read Only</AlertTitle>
				<AlertDescription className="text-amber-800">
					You are viewing cached patient data. All write actions are unavailable until connectivity
					is restored.
				</AlertDescription>
			</Alert>

			{/* Stale cache warning */}
			{cachedAt && isStale(cachedAt) && (
				<Alert className="border-red-200 bg-red-50">
					<AlertTriangle className="size-4 text-red-600" />
					<AlertTitle className="text-red-900">Cache may be stale</AlertTitle>
					<AlertDescription className="text-red-800">
						This cache is older than 24 hours and may not reflect current patient status.
					</AlertDescription>
				</Alert>
			)}

			{/* Patient header with cache freshness */}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold">{name}</h1>
					<p className="text-muted-foreground font-mono text-sm">MRN: {mrn}</p>
				</div>
				{cachedAt && (
					<div className="text-muted-foreground flex items-center gap-1.5 text-xs">
						<Clock className="size-3.5" />
						Last synced: {timeAgo(cachedAt)}
					</div>
				)}
			</div>

			{/* Demographics */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Patient Demographics</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div>
						<p className="text-muted-foreground text-xs uppercase tracking-wider">Name</p>
						<p className="mt-1 text-sm font-medium">{name}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs uppercase tracking-wider">MRN</p>
						<p className="mt-1 font-mono text-sm">{mrn}</p>
					</div>
					{dob && (
						<div>
							<p className="text-muted-foreground text-xs uppercase tracking-wider">
								Date of Birth
							</p>
							<p className="mt-1 text-sm">
								{formatDate(dob)} ({calculateAge(dob)})
							</p>
						</div>
					)}
					<div>
						<p className="text-muted-foreground text-xs uppercase tracking-wider">Sex</p>
						<p className="mt-1 text-sm capitalize">{sex}</p>
					</div>
				</CardContent>
			</Card>

			{encounter ? (
				<>
					{/* Last known vitals */}
					{encounter.latestVitals && (
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm">Last Known Vitals</CardTitle>
									<DisabledAction label="Record Vitals" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="grid gap-4 sm:grid-cols-3">
									{encounter.latestVitals.temperature !== null && (
										<div>
											<p className="text-muted-foreground text-xs uppercase tracking-wider">
												Temperature
											</p>
											<p className="mt-1 text-sm font-medium">
												{encounter.latestVitals.temperature} °C
											</p>
										</div>
									)}
									{encounter.latestVitals.bpSystolic !== null &&
										encounter.latestVitals.bpDiastolic !== null && (
											<div>
												<p className="text-muted-foreground text-xs uppercase tracking-wider">
													Blood Pressure
												</p>
												<p className="mt-1 text-sm font-medium">
													{encounter.latestVitals.bpSystolic}/
													{encounter.latestVitals.bpDiastolic} mmHg
												</p>
											</div>
										)}
									{encounter.latestVitals.heartRate !== null && (
										<div>
											<p className="text-muted-foreground text-xs uppercase tracking-wider">
												Heart Rate
											</p>
											<p className="mt-1 text-sm font-medium">
												{encounter.latestVitals.heartRate} bpm
											</p>
										</div>
									)}
									{encounter.latestVitals.respiratoryRate !== null && (
										<div>
											<p className="text-muted-foreground text-xs uppercase tracking-wider">
												Respiratory Rate
											</p>
											<p className="mt-1 text-sm font-medium">
												{encounter.latestVitals.respiratoryRate} /min
											</p>
										</div>
									)}
									{encounter.latestVitals.spo2 !== null && (
										<div>
											<p className="text-muted-foreground text-xs uppercase tracking-wider">
												SpO2
											</p>
											<p className="mt-1 text-sm font-medium">
												{encounter.latestVitals.spo2}%
											</p>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Active Problems */}
					{encounter.activeProblems.length > 0 && (
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm">Active Problems</CardTitle>
									<DisabledAction label="Add Problem" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{encounter.activeProblems.map(problem => (
										<div
											key={problem.id}
											className="flex items-start justify-between rounded-lg border px-3 py-2 text-sm"
										>
											<div>
												<p className="font-medium">{problem.description}</p>
												{problem.icd10Code && (
													<p className="text-muted-foreground font-mono text-xs">
														{problem.icd10Code}
													</p>
												)}
											</div>
											<Badge variant="secondary" className="ml-2 shrink-0 capitalize">
												{problem.status}
											</Badge>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Active Allergies */}
					{encounter.activeAllergies.length > 0 && (
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm">Active Allergies</CardTitle>
									<DisabledAction label="Add Allergy" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{encounter.activeAllergies.map(allergy => (
										<div
											key={allergy.id}
											className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
										>
											<div>
												<p className="font-medium">{allergy.allergenName}</p>
												{allergy.reactionType && (
													<p className="text-muted-foreground text-xs">{allergy.reactionType}</p>
												)}
											</div>
											<Badge
												variant={allergy.severity === "severe" ? "destructive" : "secondary"}
												className="ml-2 shrink-0 capitalize"
											>
												{allergy.severity}
											</Badge>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Current Medications */}
					{encounter.activeMedications.length > 0 && (
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm">Current Medications</CardTitle>
									<DisabledAction label="New Order" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{encounter.activeMedications.map(med => (
										<div
											key={med.id}
											className="flex items-start justify-between rounded-lg border px-3 py-2 text-sm"
										>
											<div>
												<p className="font-medium">{med.genericName}</p>
												<p className="text-muted-foreground text-xs">
													{med.dose} {med.doseUnit} · {med.route} · {med.frequency}
												</p>
											</div>
											<Badge variant="secondary" className="ml-2 shrink-0 capitalize">
												{med.status}
											</Badge>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{encounter.activeProblems.length === 0 &&
						encounter.activeAllergies.length === 0 &&
						encounter.activeMedications.length === 0 &&
						!encounter.latestVitals && (
							<Card>
								<CardContent className="text-muted-foreground py-10 text-center text-sm">
									No clinical data is available in the offline cache for this patient.
								</CardContent>
							</Card>
						)}
				</>
			) : (
				<Card>
					<CardContent className="text-muted-foreground py-10 text-center text-sm">
						No encounter data is cached for this patient. View this patient&apos;s encounter while
						online to populate the clinical cache.
					</CardContent>
				</Card>
			)}
		</div>
	)
}
