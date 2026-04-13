"use client"

import { PatientRegistrationForm } from "@/features/patients/components/patient-registration-form"

export default function PatientRegisterPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Register New Patient</h1>
				<p className="text-muted-foreground text-sm">
					Enter patient demographics to create a new medical record
				</p>
			</div>
			<PatientRegistrationForm />
		</div>
	)
}
