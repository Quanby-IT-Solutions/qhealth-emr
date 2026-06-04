"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { isNewborn, NbsCard } from "@/features/nbs/components/nbs-card"

import { FlowsheetGrid } from "./flowsheet-grid"
import { HaiTagForm } from "./hai-tag-form"
import { IoTracking } from "./io-tracking"
import { MarScreen } from "./mar-screen"
import { ShiftHandoffForm } from "./shift-handoff-form"
import { TarScreen } from "./tar-screen"
import { TransfusionVerification } from "./transfusion-verification"
import { VitalsPanel } from "./vitals-entry-form"

// ============================================================================
// Props
// ============================================================================

interface NursingTabProps {
	encounterId: string
	facilityId: string
	patientId: string
	patientDateOfBirth?: string
	patientName?: string
	readOnly?: boolean
}

export function NursingTab({
	encounterId,
	facilityId,
	patientId,
	patientDateOfBirth,
	patientName,
	readOnly,
}: NursingTabProps) {
	return (
		<Tabs defaultValue="vitals">
			<TabsList variant="line">
				<TabsTrigger value="vitals">Vitals</TabsTrigger>
				<TabsTrigger value="mar">MAR</TabsTrigger>
				<TabsTrigger value="tar">TAR</TabsTrigger>
				<TabsTrigger value="io">I/O</TabsTrigger>
				<TabsTrigger value="flowsheets">Flowsheets</TabsTrigger>
				<TabsTrigger value="handoff">Handoff</TabsTrigger>
				<TabsTrigger value="hai">HAI Tags</TabsTrigger>
				<TabsTrigger value="transfusion">Transfusion</TabsTrigger>
				{patientDateOfBirth && isNewborn(patientDateOfBirth) && (
					<TabsTrigger value="nbs">NBS</TabsTrigger>
				)}
			</TabsList>

			<TabsContent value="vitals">
				<VitalsPanel encounterId={encounterId} facilityId={facilityId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="mar">
				<MarScreen encounterId={encounterId} facilityId={facilityId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="tar">
				<TarScreen encounterId={encounterId} facilityId={facilityId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="io">
				<IoTracking encounterId={encounterId} facilityId={facilityId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="flowsheets">
				<FlowsheetGrid encounterId={encounterId} facilityId={facilityId} />
			</TabsContent>
			<TabsContent value="handoff">
				<ShiftHandoffForm encounterId={encounterId} facilityId={facilityId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="hai">
				<HaiTagForm encounterId={encounterId} facilityId={facilityId} readOnly={readOnly} />
			</TabsContent>
			<TabsContent value="transfusion">
				<TransfusionVerification encounterId={encounterId} />
			</TabsContent>
			{patientDateOfBirth && isNewborn(patientDateOfBirth) && (
				<TabsContent value="nbs">
					<NbsCard
						encounterId={encounterId}
						patientId={patientId}
						facilityId={facilityId}
						patientDateOfBirth={patientDateOfBirth}
						patientName={patientName}
						readOnly={readOnly}
					/>
				</TabsContent>
			)}
		</Tabs>
	)
}
