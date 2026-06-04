"use client"

import Link from "next/link"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

const CATALOGS = [
	{
		id: "drug-formulary",
		name: "Drug Formulary",
		description: "Generic and brand drug catalog with dosage forms and routes.",
		linkedTo: "/admin/formulary",
	},
	{
		id: "lab-catalog",
		name: "Lab Catalog",
		description: "Laboratory test catalog with LOINC codes and reference ranges.",
		linkedTo: null,
	},
	{
		id: "rvs-catalog",
		name: "RVS Catalog",
		description: "Relative Value Scale billing codes for Philippine healthcare.",
		linkedTo: "/admin/terminology/rvs",
	},
	{
		id: "icd10-sets",
		name: "ICD-10 Sets",
		description: "Curated ICD-10 code sets for common diagnoses and DRG grouping.",
		linkedTo: "/admin/terminology/icd10",
	},
]

export function MasterDataCatalogsPage() {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{CATALOGS.map(catalog => (
				<Card key={catalog.id}>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">{catalog.name}</CardTitle>
						<p className="text-muted-foreground text-xs">{catalog.description}</p>
					</CardHeader>
					<CardContent>
						{catalog.linkedTo ? (
							<Button
								variant="outline"
								size="sm"
								nativeButton={false}
								render={<Link href={catalog.linkedTo} />}
							>
								Manage
							</Button>
						) : (
							<Button
								variant="outline"
								size="sm"
								nativeButton={false}
								render={<Link href={`/admin/master-data/${catalog.id}`} />}
							>
								Manage
							</Button>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	)
}
