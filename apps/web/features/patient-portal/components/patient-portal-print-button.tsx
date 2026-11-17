"use client"

import { Download } from "lucide-react"

import { Button } from "@/core/components/ui/button"

export function PatientPortalPrintButton() {
	return (
		<Button
			type="button"
			size="lg"
			className="w-full gap-1.5 md:w-auto"
			onClick={() => window.print()}
		>
			<Download className="size-4" />
			Print / Save PDF
		</Button>
	)
}
