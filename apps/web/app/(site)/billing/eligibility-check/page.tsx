"use client"

import { useSearchParams } from "next/navigation"

import { EligibilityCheckPage as EligibilityCheckPageComponent } from "@/features/billing/eligibility-cews/components/eligibility-check-page"

export default function EligibilityCheckPage() {
	const searchParams = useSearchParams()
	const encounterId = searchParams.get("encounterId") ?? ""

	return (
		<main>
			<EligibilityCheckPageComponent encounterId={encounterId} />
		</main>
	)
}
