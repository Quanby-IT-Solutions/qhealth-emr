"use client"

import { useState } from "react"
import Image from "next/image"
import { Loader2, QrCode } from "lucide-react"
import * as QRCode from "qrcode"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { getPublicAppUrl } from "@/core/lib/utils"
import { useGenerateOrderAccessTokenMutation } from "@/features/orders/api/orders.hooks"

type OrderAccessDocumentType = "prescription" | "lab_order" | "imaging_order"

export function OrderAccessQrButton({
	documentType,
	documentId,
	label = "QR",
}: {
	documentType: OrderAccessDocumentType
	documentId: string
	label?: string
}) {
	const [open, setOpen] = useState(false)
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
	const [accessUrl, setAccessUrl] = useState<string | null>(null)
	const generateToken = useGenerateOrderAccessTokenMutation()

	const showQr = async (path: string) => {
		const url = getPublicAppUrl(path)
		setAccessUrl(url)
		setQrDataUrl(await QRCode.toDataURL(url, { margin: 1, width: 240 }))
		setOpen(true)
	}

	const generate = () => {
		generateToken.mutate(
			{ documentType, documentId },
			{
				onSuccess: result => {
					void showQr(result.url).catch(error => {
						toast.error(error instanceof Error ? error.message : "Failed to render QR access code.")
					})
				},
				onError: error => {
					toast.error(error instanceof Error ? error.message : "Failed to generate QR access.")
				},
			}
		)
	}

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				title="Generate patient access QR"
				aria-label="Generate patient access QR"
				disabled={generateToken.isPending}
				onClick={generate}
			>
				{generateToken.isPending ? (
					<Loader2 className="size-4 animate-spin" />
				) : (
					<QrCode className="size-4" />
				)}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Patient Access QR</DialogTitle>
						<DialogDescription>
							Patient must verify last name and date of birth before details are shown.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col items-center gap-3">
						{qrDataUrl && (
							<Image
								src={qrDataUrl}
								alt="Patient access QR code"
								width={240}
								height={240}
								unoptimized
								className="rounded border"
							/>
						)}
						{accessUrl && (
							<p className="text-muted-foreground max-w-full text-center text-xs break-all">
								{accessUrl}
							</p>
						)}
						<span className="sr-only">{label}</span>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
