"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { EncounterContextBar } from "@/features/msw/components/encounter-context-bar"
import { AnnexPanel } from "@/features/msw/annex-signatures/components/annex-panel"

interface AnnexPageProps {
	params: Promise<{ encounterId: string }>
}

export default function AnnexPage({ params }: AnnexPageProps) {
	const { encounterId } = use(params)

	return (
		<div className="space-y-4">
			<EncounterContextBar encounterId={encounterId} />

			<div className="flex items-center gap-3">
				<Link href={`/msw/encounters/${encounterId}/assessment`}>
					<Button variant="ghost" size="sm" className="gap-1.5">
						<ArrowLeft className="size-4" />
						Back to Assessment
					</Button>
				</Link>
			</div>

			<div>
				<h1 className="text-xl font-semibold">PhilHealth Annex A &amp; B Signature Capture</h1>
				<p className="text-sm text-muted-foreground">Story 12.9 · Flow L9 · Tablet-optimised</p>
			</div>

			<Card>
				<CardContent className="pt-6">
					<Tabs defaultValue="a">
						<TabsList className="mb-4">
							<TabsTrigger value="a">Annex A — Informed Consent</TabsTrigger>
							<TabsTrigger value="b">Annex B — Member Empowerment</TabsTrigger>
						</TabsList>
						<TabsContent value="a">
							<AnnexPanel annexType="a" encounterId={encounterId} />
						</TabsContent>
						<TabsContent value="b">
							<AnnexPanel annexType="b" encounterId={encounterId} />
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	)
}
