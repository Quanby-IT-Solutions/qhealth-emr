"use client"

import { use } from "react"
import Link from "next/link"

import { Button } from "@/core/components/ui/button"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useGatePassQuery } from "@/features/registrar/discharge/api/discharge.hooks"
import { GatePassCard } from "@/features/registrar/discharge/components/gate-pass-card"

export default function GatePassPage({ params }: { params: Promise<{ encounterId: string }> }) {
	const { encounterId } = use(params)
	const { data: gatePass, isLoading } = useGatePassQuery(encounterId)

	return (
		<div className="space-y-6 p-4 md:p-6">
			<div className="no-print flex items-center gap-4">
				<Button variant="outline" size="sm" asChild>
					<Link href={`/registrar/discharge/${encounterId}`}>← Back</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-semibold">Gate Pass</h1>
					<p className="text-muted-foreground mt-0.5 text-sm">Present to patient at exit.</p>
				</div>
			</div>

			{isLoading ? (
				<Skeleton className="h-96 w-full max-w-lg" />
			) : !gatePass ? (
				<div className="text-muted-foreground py-8">
					<p>No gate pass has been issued for this encounter.</p>
					<Button className="mt-4" asChild>
						<Link href={`/registrar/discharge/${encounterId}`}>Go to Discharge Processing</Link>
					</Button>
				</div>
			) : (
				<GatePassCard gatePass={gatePass} />
			)}
		</div>
	)
}
