"use client"

import { PatientSearch } from "@/features/patients/components/patient-search"

export default function PatientSearchPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Patient Search</h1>
				<p className="text-muted-foreground text-sm">
					Search patients by name, MRN, or date of birth
				</p>
			</div>
			<PatientSearch />
		</div>
	)
}
