"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Search, Wifi, WifiOff } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { useOfflinePatients } from "@/features/offline-cache/lib/use-offline-patients"

function patientName(patient: { firstName: string; middleName?: string | null; lastName: string }) {
	return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(" ")
}

function formatCachedAt(value: string | null) {
	return value ? new Date(value).toLocaleString("en-PH") : "No cache recorded"
}

function calculateAge(dateOfBirth: string) {
	const ageDays = (Date.now() - new Date(dateOfBirth).getTime()) / (1000 * 60 * 60 * 24)
	if (ageDays < 30) return `${Math.floor(ageDays)}d`
	return `${Math.floor(ageDays / 365.25)} yrs`
}

export default function OfflinePatientCachePage() {
	const { isOnline, offlinePatients, cachedAt } = useOfflinePatients()
	const [search, setSearch] = useState("")
	const trimmedSearch = search.trim().toLowerCase()

	const filteredPatients = useMemo(() => {
		if (!trimmedSearch) return offlinePatients
		return offlinePatients.filter(patient => {
			const name = patientName(patient).toLowerCase()
			const mrn = patient.mrn.toLowerCase()
			return name.includes(trimmedSearch) || mrn.includes(trimmedSearch)
		})
	}, [offlinePatients, trimmedSearch])

	return (
		<div className="space-y-5">
			<Alert className={isOnline ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50"}>
				{isOnline ? (
					<Wifi className="size-4 text-blue-700" />
				) : (
					<WifiOff className="size-4 text-amber-700" />
				)}
				<AlertTitle className={isOnline ? "text-blue-900" : "text-amber-900"}>
					{isOnline
						? "Offline cache is ready for outages"
						: "You are offline - viewing cached patient data"}
				</AlertTitle>
				<AlertDescription className={isOnline ? "text-blue-800" : "text-amber-800"}>
					Cache last updated: {formatCachedAt(cachedAt)} - {offlinePatients.length.toLocaleString()}{" "}
					patients cached
				</AlertDescription>
			</Alert>

			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold">Offline Patient Cache</h1>
					<p className="text-muted-foreground text-sm">
						Cached patient summaries available without network access.
					</p>
				</div>
				<Badge variant="secondary">{offlinePatients.length.toLocaleString()} patients cached</Badge>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Cached Patients</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="relative">
						<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
						<Input
							data-element-id="offline-search"
							value={search}
							onChange={event => setSearch(event.target.value)}
							placeholder="Search by name or MRN..."
							className="pl-9"
						/>
					</div>

					{filteredPatients.length === 0 ? (
						<div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
							{offlinePatients.length === 0
								? "No offline cache is available for this facility."
								: "No cached patients match your search."}
						</div>
					) : (
						<div className="overflow-hidden rounded-lg border">
							<div className="bg-muted/50 text-muted-foreground grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] gap-3 px-4 py-2 text-xs font-medium uppercase">
								<div>Patient</div>
								<div>MRN</div>
								<div>Age / Sex</div>
								<div>Status</div>
								<div />
							</div>
							{filteredPatients.map(patient => (
								<div
									key={patient.id}
									className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] items-center gap-3 border-t px-4 py-3 text-sm"
								>
									<div className="min-w-0">
										<div className="truncate font-medium">{patientName(patient)}</div>
										<div className="text-muted-foreground font-mono text-xs">{patient.mrn}</div>
									</div>
									<div className="font-mono text-xs">{patient.mrn}</div>
									<div className="text-muted-foreground">
										{calculateAge(patient.dateOfBirth)} / {patient.sex}
									</div>
									<div>
										<Badge variant={patient.isActive ? "secondary" : "outline"}>
											{patient.isActive ? "Active" : "Inactive"}
										</Badge>
									</div>
									<Button
										variant="ghost"
										size="sm"
										nativeButton={false}
										render={<Link href={`/patients/offline/${patient.id}`} />}
									>
										Open
										<ArrowRight className="size-4" />
									</Button>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
