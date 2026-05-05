"use client"

import { use } from "react"
import { useSearchParams } from "next/navigation"

import { EclaimsSubmissionPage as EclaimsSubmissionPageComponent } from "@/features/billing/cf4-eclaims/components/eclaims-submission-page"

export default function EclaimsSubmissionPage({ params }: { params: Promise<{ encounterId: string }> }) {
	void use(params)
	const searchParams = useSearchParams()
	const cf4Id = searchParams.get("cf4Id") ?? ""

	if (!cf4Id) {
		return <main className="p-4 text-sm text-muted-foreground">No CF4 ID provided.</main>
	}

	return <EclaimsSubmissionPageComponent cf4Id={cf4Id} />
}
