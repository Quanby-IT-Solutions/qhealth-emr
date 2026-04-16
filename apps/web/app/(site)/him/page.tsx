"use client"

import { FolderOpen } from "lucide-react"

import { Card, CardContent } from "@/core/components/ui/card"

export default function HIMPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Medical Records</h1>
				<p className="text-muted-foreground text-sm">
					Health information management, ICD-10 coding, and chart release
				</p>
			</div>
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-20 text-center">
					<FolderOpen className="text-muted-foreground mb-4 size-12" />
					<p className="font-medium">Health Information Management</p>
					<p className="text-muted-foreground mt-1 max-w-sm text-sm">
						Discharge summary coding, ICD-10 assignment, medical certificate requests, and chart release management will be available here.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
