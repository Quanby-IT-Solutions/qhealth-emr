"use client"

import { useState } from "react"
import { ExternalLink, ShieldAlert } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

interface PacsLinkProps {
	orderId: string
	pacsUrl: string | null
	modality: string
	bodyPart: string
}

export function PacsLink({ orderId: _orderId, pacsUrl, modality, bodyPart }: PacsLinkProps) {
	const [confirmOpen, setConfirmOpen] = useState(false)

	if (!pacsUrl) {
		return <span className="text-muted-foreground text-sm">PACS not available</span>
	}

	function handleConfirm() {
		if (pacsUrl) {
			window.open(pacsUrl, "_blank", "noopener,noreferrer")
		}
		setConfirmOpen(false)
	}

	return (
		<>
			<Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} className="gap-1.5">
				<ExternalLink className="size-3.5" />
				View in PACS
			</Button>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<ShieldAlert className="size-5 text-amber-500" />
							External System Notice
						</DialogTitle>
						<DialogDescription>
							You are about to open an external PACS viewer for{" "}
							<strong>
								{modality} — {bodyPart}
							</strong>
							. This will open in a new browser tab. Ensure you are on a secure, authorized
							workstation before proceeding.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleConfirm}>
							<ExternalLink className="mr-1.5 size-3.5" />
							Open PACS Viewer
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
