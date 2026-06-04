"use client"

import { useState } from "react"
import Link from "next/link"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useEncounterListQuery } from "@/features/encounters/api/encounters.hooks"

function formatDatetime(value: Date | string | null) {
	if (!value) return "—"
	return new Date(value).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export default function RegistrarDischargePage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const [search, setSearch] = useState("")

	const { data, isLoading } = useEncounterListQuery(
		{
			facilityId,
			status: "pending_discharge",
			encounterType: "inpatient",
			limit: 100,
		},
		{ enabled: !!facilityId }
	)

	const encounters = data?.data ?? []

	const filtered = search.trim()
		? encounters.filter(e => {
				const q = search.toLowerCase()
				return (
					(e.wardName ?? "").toLowerCase().includes(q) ||
					(e.bedNumber ?? "").toLowerCase().includes(q) ||
					(e.attendingStaffName ?? "").toLowerCase().includes(q)
				)
			})
		: encounters

	return (
		<div className="space-y-6 p-4 md:p-6">
			<div>
				<h1 className="text-2xl font-semibold">Discharge Processing</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Patients pending discharge — verify clearances and issue gate passes.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Pending Discharge</CardTitle>
					<Input
						placeholder="Filter by ward, bed, or physician…"
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="mt-2 max-w-sm"
					/>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Ward / Bed</TableHead>
								<TableHead>Attending</TableHead>
								<TableHead>Admitted</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-28 text-right">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								Array.from({ length: 5 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={5}>
											<Skeleton className="h-5 w-full" />
										</TableCell>
									</TableRow>
								))
							) : filtered.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
										No patients pending discharge.
									</TableCell>
								</TableRow>
							) : (
								filtered.map(enc => (
									<TableRow key={enc.id}>
										<TableCell>
											<div className="font-medium">{enc.wardName ?? "—"}</div>
											{enc.bedNumber && (
												<Badge variant="outline" className="mt-0.5 text-xs">
													Bed {enc.bedNumber}
												</Badge>
											)}
										</TableCell>
										<TableCell className="text-sm">{enc.attendingStaffName ?? "—"}</TableCell>
										<TableCell className="text-sm">
											{formatDatetime(enc.admissionDatetime)}
										</TableCell>
										<TableCell>
											<Badge variant="secondary">Pending Discharge</Badge>
										</TableCell>
										<TableCell className="text-right">
											<Button size="sm" asChild>
												<Link href={`/registrar/discharge/${enc.id}`}>Process</Link>
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}
