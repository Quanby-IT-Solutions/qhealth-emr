"use client"

import { ShieldCheck } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import { usePatientConsentsQuery } from "@/features/clinical-docs/api/clinical-docs.hooks"

interface DpaStatusBadgeProps {
	patientId: string
}

export function DpaStatusBadge({ patientId }: DpaStatusBadgeProps) {
	const { data, isLoading } = usePatientConsentsQuery({
		patientId,
		consentType: "dpa",
	})

	if (isLoading) return null

	const dpaConsents = (data?.data ?? []).filter(c => c.consentType === "dpa")

	if (dpaConsents.length === 0) {
		return (
			<Tooltip>
				<TooltipTrigger
					render={
						<Badge
							variant="outline"
							className="cursor-default gap-1 border-slate-300 text-slate-500"
						/>
					}
				>
					<ShieldCheck className="size-3" />
					No DPA
				</TooltipTrigger>
				<TooltipContent>No Data Privacy Act consent on record</TooltipContent>
			</Tooltip>
		)
	}

	// Find the most recent DPA consent
	const sorted = [...dpaConsents].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	)
	const latest = sorted[0]

	if (!latest) {
		return null
	}

	if (latest.revokedAt) {
		return (
			<Tooltip>
				<TooltipTrigger render={<Badge variant="destructive" className="cursor-default gap-1" />}>
					<ShieldCheck className="size-3" />
					DPA Revoked
				</TooltipTrigger>
				<TooltipContent>
					DPA consent was revoked on{" "}
					{new Date(latest.revokedAt).toLocaleDateString("en-PH", {
						year: "numeric",
						month: "short",
						day: "numeric",
					})}
				</TooltipContent>
			</Tooltip>
		)
	}

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Badge className="cursor-default gap-1 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200" />
				}
			>
				<ShieldCheck className="size-3" />
				DPA Active
			</TooltipTrigger>
			<TooltipContent>
				DPA consent active since{" "}
				{new Date(latest.signedAt ?? latest.createdAt).toLocaleDateString("en-PH", {
					year: "numeric",
					month: "short",
					day: "numeric",
				})}
			</TooltipContent>
		</Tooltip>
	)
}
