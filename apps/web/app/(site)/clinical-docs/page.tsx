"use client"

import { FileText } from "lucide-react"

import { Card, CardContent } from "@/core/components/ui/card"

export default function ClinicalDocsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Clinical Documents</h1>
				<p className="text-muted-foreground text-sm">
					Access and review clinical documentation for billing purposes
				</p>
			</div>
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-20 text-center">
					<FileText className="text-muted-foreground mb-4 size-12" />
					<p className="font-medium">Clinical Documentation Access</p>
					<p className="text-muted-foreground mt-1 max-w-sm text-sm">
						Review CF4 data extraction, physician notes, and clinical summaries
						for billing and revenue cycle management purposes.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
