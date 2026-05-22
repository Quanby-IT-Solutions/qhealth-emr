"use client"

import { useSearchParams } from "next/navigation"
import { ExternalLink, ImageOff, MonitorPlay } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useImagingOrderDetailQuery } from "@/features/orders/api/orders.hooks"

type PacsStructuredResults = {
	pacsUrl?: string
}

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []

	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

function parseStructuredResults(raw: unknown): PacsStructuredResults {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
	return raw as PacsStructuredResults
}

export default function PacsViewerPage() {
	const searchParams = useSearchParams()
	const orderId = searchParams.get("orderId") ?? ""
	const permSet = usePermissionSet()
	const hasViewPermission = can(permSet, "radiology", "view") || can(permSet, "orders", "view")
	const imagingOrderQuery = useImagingOrderDetailQuery(orderId)
	const order = imagingOrderQuery.data
	const pacsUrl = parseStructuredResults(order?.structuredResults).pacsUrl?.trim() ?? ""

	if (!hasViewPermission) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access the PACS viewer.
			</div>
		)
	}

	if (!orderId) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">PACS Viewer</h1>
				<Card>
					<CardContent className="text-muted-foreground flex min-h-56 items-center justify-center text-sm">
						No imaging order selected.
					</CardContent>
				</Card>
			</div>
		)
	}

	if (imagingOrderQuery.isLoading) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				Loading PACS viewer...
			</div>
		)
	}

	if (!order) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				Imaging order not found.
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="flex items-center gap-2 text-2xl font-semibold">
						<MonitorPlay className="size-5" />
						PACS Viewer
					</h1>
					<p className="text-muted-foreground text-sm">
						{order.modality.toUpperCase()} {order.bodyPart}
					</p>
				</div>
				<Button
					variant="outline"
					onClick={() => window.open(pacsUrl, "_blank", "noopener,noreferrer")}
					disabled={!pacsUrl}
				>
					<ExternalLink className="mr-2 size-4" />
					Open external
				</Button>
			</div>

			<Card className="overflow-hidden">
				{pacsUrl ? (
					<iframe
						title="PACS viewer"
						src={pacsUrl}
						className="h-[calc(100vh-180px)] min-h-[560px] w-full border-0 bg-black"
						referrerPolicy="no-referrer"
						sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
					/>
				) : (
					<CardContent className="flex min-h-[560px] flex-col items-center justify-center gap-2 bg-black text-zinc-500">
						<ImageOff className="size-8" />
						<p className="font-mono text-xs">NO PACS URL ATTACHED</p>
					</CardContent>
				)}
			</Card>
		</div>
	)
}
