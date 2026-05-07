import { OpdTriageForm } from "@/features/opd-triage/components/opd-triage-form"

/**
 * Walk-in (pre-registration) OPD triage page.
 * Triage staff can capture arrival time, chief complaint, and vitals
 * before the patient has been registered. The registrar links the
 * resulting intake to a patient record from the patient registration queue.
 */
export default function WalkInTriagePage() {
	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-semibold">Walk-in OPD Triage</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Record triage data for an unregistered walk-in patient. A registrar will link this intake
					to the patient record.
				</p>
			</div>
			<OpdTriageForm />
		</div>
	)
}
