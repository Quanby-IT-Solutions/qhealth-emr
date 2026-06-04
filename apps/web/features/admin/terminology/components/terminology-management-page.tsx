"use client"

import Link from "next/link"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

interface CodeSystemCard {
	id: string
	name: string
	description: string
	version: string
	totalCodes: number
	deprecatedCodes: number
	lastUpdated: string
}

const CODE_SYSTEMS: CodeSystemCard[] = [
	{
		id: "icd10",
		name: "ICD-10",
		description: "International Classification of Diseases, 10th Revision",
		version: "2024",
		totalCodes: 0,
		deprecatedCodes: 0,
		lastUpdated: "—",
	},
	{
		id: "snomed",
		name: "SNOMED CT",
		description: "Systematized Nomenclature of Medicine Clinical Terms",
		version: "2024-01",
		totalCodes: 0,
		deprecatedCodes: 0,
		lastUpdated: "—",
	},
	{
		id: "loinc",
		name: "LOINC",
		description: "Logical Observation Identifiers Names and Codes",
		version: "2.77",
		totalCodes: 0,
		deprecatedCodes: 0,
		lastUpdated: "—",
	},
	{
		id: "rxnorm",
		name: "RxNorm",
		description: "Standard clinical drug nomenclature",
		version: "2024-01",
		totalCodes: 0,
		deprecatedCodes: 0,
		lastUpdated: "—",
	},
	{
		id: "rvs",
		name: "RVS",
		description: "Relative Value Scale for Philippine healthcare billing",
		version: "2023",
		totalCodes: 0,
		deprecatedCodes: 0,
		lastUpdated: "—",
	},
]

export function TerminologyManagementPage() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{CODE_SYSTEMS.map(system => (
				<Card key={system.id}>
					<CardHeader className="pb-2">
						<div className="flex items-start justify-between">
							<CardTitle className="text-base">{system.name}</CardTitle>
							<span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs">
								v{system.version}
							</span>
						</div>
						<p className="text-muted-foreground text-xs">{system.description}</p>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div>
								<p className="text-muted-foreground text-xs">Total codes</p>
								<p className="font-medium">{system.totalCodes.toLocaleString()}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Deprecated</p>
								<p className="font-medium">{system.deprecatedCodes.toLocaleString()}</p>
							</div>
						</div>
						<p className="text-muted-foreground text-xs">Last updated: {system.lastUpdated}</p>
						<Button
							variant="outline"
							size="sm"
							className="w-full"
							nativeButton={false}
							render={<Link href={`/admin/terminology/${system.id}`} />}
						>
							Manage Codes
						</Button>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
