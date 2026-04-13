import { Suspense } from "react"

import { FormularyManager } from "@/features/formulary/components/formulary-manager"

// TODO: Replace with actual facility context from session/RBAC
const PLACEHOLDER_FACILITY_ID = "00000000-0000-0000-0000-000000000000"

export default function FormularyPage() {
	return (
		<div className="w-full max-w-7xl space-y-6 p-4">
			<div>
				<h1 className="text-2xl font-bold">Facility Formulary</h1>
				<p className="text-muted-foreground">
					Manage approved drugs for this facility. Add, remove, and annotate formulary items.
				</p>
			</div>

			<Suspense fallback={<p>Loading formulary...</p>}>
				<FormularyManager facilityId={PLACEHOLDER_FACILITY_ID} />
			</Suspense>
		</div>
	)
}
