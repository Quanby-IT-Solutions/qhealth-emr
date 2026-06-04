"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Separator } from "@/core/components/ui/separator"

interface FieldSource {
	field: string
	label: string
	source: string
	value: string | null
}

interface SourceNoteDrawerProps {
	open: boolean
	onClose: () => void
	sources: FieldSource[]
	sectionLabel: string
}

const SOURCE_LABEL: Record<string, string> = {
	encounter: "Encounter",
	patient: "Patient Registry",
	orders: "CPOE Orders",
	lab: "Lab Results",
	diagnosis: "Clinical Diagnosis",
	philhealth: "PhilHealth DB",
	manual: "Manual Entry",
}

export function SourceNoteDrawer({ open, onClose, sources, sectionLabel }: SourceNoteDrawerProps) {
	useEffect(() => {
		if (!open) return
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose()
		}
		document.addEventListener("keydown", handler)
		return () => document.removeEventListener("keydown", handler)
	}, [open, onClose])

	if (!open) return null

	return (
		<>
			{/* Backdrop */}
			<div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} aria-hidden />

			{/* Drawer */}
			<aside
				role="dialog"
				aria-label={`Source notes for ${sectionLabel}`}
				aria-modal
				className="bg-background fixed top-0 right-0 z-50 flex h-full w-80 flex-col shadow-xl"
			>
				<div className="flex items-center justify-between border-b px-4 py-3">
					<div>
						<p className="text-muted-foreground text-xs tracking-wide uppercase">
							Auto-Extraction Sources
						</p>
						<h2 className="text-sm font-semibold">{sectionLabel}</h2>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						aria-label="Close source notes drawer"
						className="size-7"
					>
						<X className="size-4" />
					</Button>
				</div>

				<div className="flex-1 space-y-3 overflow-y-auto p-4">
					{sources.length === 0 && (
						<p className="text-muted-foreground py-8 text-center text-sm">
							No auto-extracted sources for this section.
						</p>
					)}

					{sources.map(s => (
						<div key={s.field} className="bg-muted/30 space-y-1.5 rounded-md border p-3">
							<div className="flex items-center justify-between gap-2">
								<span className="text-xs font-medium">{s.label}</span>
								<Badge variant="outline" className="h-4 px-1 text-[10px]">
									{SOURCE_LABEL[s.source] ?? s.source}
								</Badge>
							</div>
							{s.value !== null && (
								<p className="text-muted-foreground font-mono text-xs break-all">{s.value}</p>
							)}
							<Separator className="my-1" />
							<p className="text-muted-foreground text-[10px]">
								Pulled automatically from <strong>{SOURCE_LABEL[s.source] ?? s.source}</strong>.
								Edit in source system to change.
							</p>
						</div>
					))}
				</div>
			</aside>
		</>
	)
}
