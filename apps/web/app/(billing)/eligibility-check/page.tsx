"use client"

import { useSearchParams } from "next/navigation"

import { EligibilityCheckPage as EligibilityCheckPageComponent } from "@/features/billing/eligibility-cews/components/eligibility-check-page"

export default function EligibilityCheckPage() {
	const searchParams = useSearchParams()
	const encounterId = searchParams.get("encounterId") ?? ""

	if (!encounterId) {
		return (
			<main className="px-4 py-8 text-sm text-muted-foreground">
				Missing encounterId query parameter.
			</main>
		)
	}

	return (
		<main>
			<EligibilityCheckPageComponent encounterId={encounterId} />
		</main>
	)
}
