"use client"

import Link from "next/link"
import { use } from "react"

import { Button } from "@/core/components/ui/button"
import { DischargeProcessingPanel } from "@/features/registrar/discharge/components/discharge-processing-panel"

export default function DischargeProcessingPage({
	params,
}: {
	params: Promise<{ encounterId: string }>
}) {
	const { encounterId } = use(params)

	return (
		<div className="space-y-6 p-4 md:p-6">
			<div className="flex items-center gap-4">
				<Button variant="outline" size="sm" asChild>
					<Link href="/registrar/discharge">← Back</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-semibold">Discharge Processing</h1>
					<p className="text-muted-foreground mt-0.5 text-sm">
						Verify clearances and issue gate pass.
					</p>
				</div>
			</div>

			<div className="max-w-xl">
				<DischargeProcessingPanel encounterId={encounterId} />
			</div>
		</div>
	)
}
