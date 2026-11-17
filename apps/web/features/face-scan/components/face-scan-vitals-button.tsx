"use client"

import { useState } from "react"
import { Video01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { QrCode } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"
import { FaceScanDialog } from "@/features/face-scan/components/face-scan-dialog"
import { FaceScanPhoneQrDialog } from "@/features/face-scan/components/face-scan-phone-qr-dialog"
import { useFaceScanStatusQuery } from "@/features/face-scan/hooks/face-scan.hooks"
import {
	useFaceScanDemographicsFromEncounter,
	useFaceScanDemographicsFromPatient,
} from "@/features/face-scan/hooks/use-face-scan-demographics"
import { mergeFaceScanDemographics } from "@/features/face-scan/lib/face-scan-demographics"
import type { FaceScanVitals } from "@/features/face-scan/lib/face-scan-vitals"

interface FaceScanVitalsButtonProps {
	age?: number
	gender?: "male" | "female"
	smoking?: boolean
	facilityId?: string
	encounterId?: string
	patientId?: string
	onComplete: (vitals: FaceScanVitals) => void
	className?: string
	size?: "default" | "sm" | "lg" | "icon"
}

export function FaceScanVitalsButton({
	age,
	gender,
	smoking,
	facilityId,
	encounterId,
	patientId,
	onComplete,
	className,
	size = "sm",
}: FaceScanVitalsButtonProps) {
	const [cameraOpen, setCameraOpen] = useState(false)
	const [phoneOpen, setPhoneOpen] = useState(false)
	const { data: status } = useFaceScanStatusQuery()
	const hasExplicitDemographics = age !== undefined || gender !== undefined || smoking !== undefined
	const fromEncounter = useFaceScanDemographicsFromEncounter(
		hasExplicitDemographics ? undefined : encounterId
	)
	const fromPatient = useFaceScanDemographicsFromPatient(
		patientId && !encounterId && !hasExplicitDemographics ? patientId : undefined
	)
	const demographics = mergeFaceScanDemographics(
		fromEncounter,
		fromPatient,
		hasExplicitDemographics ? { age, gender, smoking } : undefined
	)

	if (status?.enabled === false) return null

	const iconOnly = size === "icon"

	return (
		<>
			<div className={cn("flex flex-wrap items-center gap-2", className)}>
				<Button
					type="button"
					variant="outline"
					size={size}
					aria-label={iconOnly ? "Scan vitals with camera" : undefined}
					onClick={() => setCameraOpen(true)}
				>
					<HugeiconsIcon icon={Video01FreeIcons} className="size-4" data-icon="inline-start" />
					{!iconOnly && "Scan vitals with camera"}
				</Button>
				<Button
					type="button"
					variant="outline"
					size={size}
					aria-label={iconOnly ? "Scan with phone" : undefined}
					onClick={() => setPhoneOpen(true)}
				>
					<QrCode className="size-4" data-icon="inline-start" />
					{!iconOnly && "Scan with phone"}
				</Button>
			</div>
			<FaceScanDialog
				open={cameraOpen}
				onOpenChange={setCameraOpen}
				age={demographics.age}
				gender={demographics.gender}
				smoking={demographics.smoking}
				onComplete={onComplete}
			/>
			<FaceScanPhoneQrDialog
				open={phoneOpen}
				onOpenChange={setPhoneOpen}
				age={demographics.age}
				gender={demographics.gender}
				smoking={demographics.smoking}
				facilityId={facilityId}
				encounterId={encounterId}
				patientId={patientId}
				onComplete={onComplete}
			/>
		</>
	)
}
