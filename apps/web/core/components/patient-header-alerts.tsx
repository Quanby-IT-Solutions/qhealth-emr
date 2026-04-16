"use client"

import {
	Alert01FreeIcons,
	MedicalFileFreeIcons,
	TestTubeFreeIcons,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"

import { cn } from "@/core/lib/utils"
import { orpc } from "@/services/orpc/client"

import { Badge } from "./ui/badge"
import { Skeleton } from "./ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

type AllergySeverity = "mild" | "moderate" | "severe"
type NbsStatus = "pending" | "collected" | "resulted" | "none"

interface PatientHeaderAlertsProps {
	patientId: string
	/** DPA consent obtained — pass from encounter/patient context */
	dpaConsent?: boolean | null
	/** NBS logbook status */
	nbsStatus?: NbsStatus
	className?: string
}

const SEVERITY_CONFIG: Record<AllergySeverity, { label: string; className: string }> = {
	severe: {
		label: "Severe",
		className: "bg-red-100 text-red-800 border-red-300",
	},
	moderate: {
		label: "Moderate",
		className: "bg-orange-100 text-orange-800 border-orange-200",
	},
	mild: {
		label: "Mild",
		className: "bg-yellow-100 text-yellow-800 border-yellow-200",
	},
}

const NBS_STATUS_CONFIG: Record<NbsStatus, { label: string; className: string }> = {
	pending: { label: "NBS Pending", className: "bg-amber-100 text-amber-800 border-amber-200" },
	collected: { label: "NBS Collected", className: "bg-blue-100 text-blue-800 border-blue-200" },
	resulted: { label: "NBS Resulted", className: "bg-green-100 text-green-800 border-green-200" },
	none: { label: "No NBS", className: "bg-gray-100 text-gray-500 border-gray-200" },
}

function AllergySkeleton() {
	return (
		<div className="flex gap-1.5">
			<Skeleton className="h-5 w-24 rounded-full" />
			<Skeleton className="h-5 w-20 rounded-full" />
		</div>
	)
}

export function PatientHeaderAlerts({
	patientId,
	dpaConsent,
	nbsStatus,
	className,
}: PatientHeaderAlertsProps) {
	const { data, isLoading } = useQuery(
		orpc.problemsAllergies.getActiveAllergies.queryOptions({
			input: { patientId },
			enabled: !!patientId,
			staleTime: 60_000,
		}),
	)

	const allergies = data?.allergies ?? []
	const hasSevere = data?.hasSevereAllergies ?? false

	// Deduplicate — show at most one badge per allergen name, prioritize highest severity
	const uniqueAllergies = allergies.reduce<typeof allergies>((acc, a) => {
		const existing = acc.find(x => x.allergenName === a.allergenName)
		if (!existing) return [...acc, a]
		const severityOrder: AllergySeverity[] = ["severe", "moderate", "mild"]
		const existingIdx = severityOrder.indexOf(existing.severity)
		const newIdx = severityOrder.indexOf(a.severity)
		if (newIdx < existingIdx) {
			return acc.map(x => (x.allergenName === a.allergenName ? a : x))
		}
		return acc
	}, [])

	const hasAnyAlert =
		isLoading ||
		uniqueAllergies.length > 0 ||
		dpaConsent === false ||
		(nbsStatus && nbsStatus !== "none")

	if (!hasAnyAlert && !isLoading) return null

	return (
		<TooltipProvider>
			<div
				className={cn(
					"flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2",
					hasSevere && "border-red-300 bg-red-50/60",
					className,
				)}
				role="alert"
				aria-label="Patient alert strip"
			>
				{/* Allergy alerts */}
				{isLoading ? (
					<AllergySkeleton />
				) : (
					uniqueAllergies.map(allergy => {
						const config = SEVERITY_CONFIG[allergy.severity]
						return (
							<Tooltip key={allergy.id}>
							<TooltipTrigger>
									<Badge
										variant="outline"
										className={cn(
											"cursor-default gap-1 text-xs font-medium",
											config.className,
										)}
									>
										<HugeiconsIcon icon={Alert01FreeIcons} className="size-3" />
										{allergy.allergenName}
										<span className="font-normal opacity-75">({config.label})</span>
									</Badge>
								</TooltipTrigger>
								<TooltipContent side="bottom" className="text-xs">
									<p>
										<strong>Allergen:</strong> {allergy.allergenName}
									</p>
									<p>
										<strong>Type:</strong> {allergy.allergenType}
									</p>
									{allergy.reactionType && (
										<p>
											<strong>Reaction:</strong> {allergy.reactionType}
										</p>
									)}
									<p>
										<strong>Severity:</strong> {config.label}
									</p>
								</TooltipContent>
							</Tooltip>
						)
					})
				)}

				{/* DPA consent indicator */}
				{dpaConsent === false && (
					<Tooltip>
						<TooltipTrigger>
							<Badge
								variant="outline"
								className="cursor-default gap-1 bg-gray-100 text-xs font-medium text-gray-600 border-gray-300"
							>
								<HugeiconsIcon icon={MedicalFileFreeIcons} className="size-3" />
								DPA Not Obtained
							</Badge>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="text-xs">
							Data Privacy Act consent has not yet been obtained from this patient.
						</TooltipContent>
					</Tooltip>
				)}

				{dpaConsent === true && (
					<Badge
						variant="outline"
						className="cursor-default gap-1 bg-green-50 text-xs font-medium text-green-700 border-green-200"
					>
						<HugeiconsIcon icon={MedicalFileFreeIcons} className="size-3" />
						DPA Obtained
					</Badge>
				)}

				{/* NBS status indicator */}
				{nbsStatus && nbsStatus !== "none" && (
					<Tooltip>
						<TooltipTrigger>
							<Badge
								variant="outline"
								className={cn(
									"cursor-default gap-1 text-xs font-medium",
									NBS_STATUS_CONFIG[nbsStatus].className,
								)}
							>
								<HugeiconsIcon icon={TestTubeFreeIcons} className="size-3" />
								{NBS_STATUS_CONFIG[nbsStatus].label}
							</Badge>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="text-xs">
							Newborn Screening (NBS) status: {NBS_STATUS_CONFIG[nbsStatus].label.toLowerCase()}
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</TooltipProvider>
	)
}
