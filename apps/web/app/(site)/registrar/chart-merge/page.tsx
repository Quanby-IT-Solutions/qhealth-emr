"use client"

import { useState } from "react"

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
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { usePreEncounterListQuery } from "@/features/ed/api/ed.hooks"
import { MergeDialog } from "@/features/ed/components/merge-dialog"
import { acuityColor } from "@/features/ed/lib/acuity-utils"

interface MergeTarget {
	id: string
	traumaAlias: string
}

function formatDateTime(value: Date | string | null) {
	if (!value) return "-"

	return new Date(value).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export default function RegistrarChartMergePage() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const permSet = new Set(permissions.map(p => `${p.module}:${p.action}`))
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const staffProfileId = profile?.staffProfiles?.[0]?.id ?? ""
	const [mergeTarget, setMergeTarget] = useState<MergeTarget | null>(null)

	const { data, isLoading } = usePreEncounterListQuery({
		facilityId,
		status: "active",
		limit: 50,
	})

	const preEncounters = data?.data ?? []

	if (!permSet.has("adt:edit") || !permSet.has("patients:edit")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access chart merge.
			</div>
		)
	}

	return (
		<div className="space-y-6 p-4 md:p-6">
			<div>
				<h1 className="text-2xl font-semibold">Chart Merge</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Match active trauma aliases to permanent patient records.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Active Trauma Aliases</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Alias</TableHead>
								<TableHead>Chief Complaint</TableHead>
								<TableHead>Acuity</TableHead>
								<TableHead>Triage Time</TableHead>
								<TableHead className="w-28 text-right">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
										Loading trauma aliases...
									</TableCell>
								</TableRow>
							) : preEncounters.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
										No active trauma aliases for merge.
									</TableCell>
								</TableRow>
							) : (
								preEncounters.map(preEncounter => (
									<TableRow key={preEncounter.id}>
										<TableCell className="font-medium">{preEncounter.traumaAlias}</TableCell>
										<TableCell className="max-w-md truncate">
											{preEncounter.chiefComplaint ?? "-"}
										</TableCell>
										<TableCell>
											{preEncounter.triageAcuityLevel ? (
												<Badge className={acuityColor(preEncounter.triageAcuityLevel)}>
													Level {preEncounter.triageAcuityLevel}
												</Badge>
											) : (
												<Badge variant="secondary">Unscored</Badge>
											)}
										</TableCell>
										<TableCell>{formatDateTime(preEncounter.triageDatetime)}</TableCell>
										<TableCell className="text-right">
											<Button
												size="sm"
												disabled={!facilityId || !staffProfileId}
												onClick={() =>
													setMergeTarget({
														id: preEncounter.id,
														traumaAlias: preEncounter.traumaAlias,
													})
												}
											>
												Merge
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{mergeTarget ? (
				<MergeDialog
					preEncounterId={mergeTarget.id}
					traumaAlias={mergeTarget.traumaAlias}
					facilityId={facilityId}
					staffProfileId={staffProfileId}
					open={!!mergeTarget}
					onOpenChange={open => {
						if (!open) setMergeTarget(null)
					}}
				/>
			) : null}
		</div>
	)
}
