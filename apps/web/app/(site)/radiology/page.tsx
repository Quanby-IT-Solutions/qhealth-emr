"use client"

import { ScanSearch } from "lucide-react"

import { Card, CardContent } from "@/core/components/ui/card"

export default function RadiologyPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Radiology</h1>
				<p className="text-muted-foreground text-sm">
					Imaging order queue, RIS/PACS integration, and radiology report management
				</p>
			</div>
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-20 text-center">
					<ScanSearch className="text-muted-foreground mb-4 size-12" />
					<p className="font-medium">Radiology Information System</p>
					<p className="text-muted-foreground mt-1 max-w-sm text-sm">
						Imaging order worklist, PACS viewer integration, and structured radiology reporting will be available here.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
