"use client"

import { use } from "react"
import { useSearchParams } from "next/navigation"

import { MembershipVerificationPage as MembershipVerificationPageComponent } from "@/features/billing/eligibility-cews/components/membership-verification-page"

export default function MembershipVerificationPage({
	params,
}: {
	params: Promise<{ memberPin: string }>
}) {
	const { memberPin } = use(params)
	const searchParams = useSearchParams()
	const encounterId = searchParams.get("encounterId") ?? ""

	return (
		<main>
			<MembershipVerificationPageComponent memberPin={memberPin} encounterId={encounterId} />
		</main>
	)
}
