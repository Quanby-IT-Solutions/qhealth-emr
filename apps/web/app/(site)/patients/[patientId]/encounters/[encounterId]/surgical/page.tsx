"use client"

import { Loader2 } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { isCoordinatorRole } from "@/features/app-shell/lib/navigation"
import { useChartContext } from "@/features/encounters/context/chart-context"
import {
	useAnesthesiaRecordQuery,
	useOperationRecordQuery,
	usePreOpChecklistQuery,
	useSurgicalCaseListQuery,
} from "@/features/surgical/api/surgical.hooks"
import { AnesthesiaRecordForm } from "@/features/surgical/components/anesthesia-record-form"
import { CreateSurgicalCasePanel } from "@/features/surgical/components/create-surgical-case-panel"
import { OperationRecordForm } from "@/features/surgical/components/operation-record-form"
import { PreOpChecklist } from "@/features/surgical/components/pre-op-checklist"
import { RvsCodeSelector } from "@/features/surgical/components/rvs-code-selector"

export default function SurgicalPage() {
	const { encounterId, patientId, facilityId } = useChartContext()
	const { data: profile } = useMyProfile()
	const activeStaffProfile =
		profile?.staffProfiles?.find(staffProfile =>
			staffProfile.roles?.some(role => role.id === profile.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]
	const staffId = activeStaffProfile?.id ?? ""
	const activeFacilityId = facilityId || activeStaffProfile?.facilityId || ""

	const { data: cases, isLoading: casesLoading } = useSurgicalCaseListQuery({
		encounterId,
	})
	const surgicalCase = cases?.data?.[0]

	const caseId = surgicalCase?.id ?? ""

	const { data: opRecord, isLoading: opLoading } = useOperationRecordQuery(
		caseId ? caseId : undefined
	)
	const { data: anesthesiaRecord, isLoading: anesthesiaLoading } = useAnesthesiaRecordQuery(
		caseId ? caseId : undefined
	)
	const { data: preOpChecklist, isLoading: checklistLoading } = usePreOpChecklistQuery(
		caseId ? caseId : undefined
	)

	const permSet = usePermissionSet()
	const canEditSurgical = can(permSet, "surgical", "edit")
	const canSignSurgical = can(permSet, "surgical", "sign")
	const canValidateRvs = can(permSet, "billing", "edit")
	const canFinalizeRvs = can(permSet, "billing", "sign")
	const isOperationRecordSigned = opRecord?.status === "signed"

	const roleName = (profile?.activeRole?.name ?? "").toLowerCase()
	const isSurgeon = roleName === "surgeon"
	const isAnesthesiologist = roleName === "anesthesiologist"
	const isCoordinator = isCoordinatorRole(profile?.activeRole)

	const defaultTab = isSurgeon ? "operation" : isAnesthesiologist ? "anesthesia" : "checklist"
	const showRvsTab = !isAnesthesiologist || isCoordinator

	const canEditPreOp = isAnesthesiologist && !isCoordinator ? false : canEditSurgical
	const canEditOperation = isAnesthesiologist && !isCoordinator ? false : canEditSurgical
	const canSignOperation = isAnesthesiologist && !isCoordinator ? false : canSignSurgical
	const isAssignedAnesthesiologist =
		(isAnesthesiologist &&
			!!surgicalCase?.anesthesiologistStaffId &&
			surgicalCase.anesthesiologistStaffId === staffId) ||
		isCoordinator
	const canEditAnesthesia = isAssignedAnesthesiologist && canEditSurgical
	const canSignAnesthesia = isAssignedAnesthesiologist && canSignSurgical

	if (casesLoading) {
		return (
			<div className="flex items-center gap-2 p-8 text-sm">
				<Loader2 className="size-4 animate-spin" />
				Loading surgical case...
			</div>
		)
	}

	if (!surgicalCase) {
		if (canEditSurgical) {
			return (
				<CreateSurgicalCasePanel
					encounterId={encounterId}
					patientId={patientId}
					facilityId={activeFacilityId}
					onSuccess={() => {
						// query auto-invalidates via useCreateSurgicalCaseMutation onSuccess
					}}
				/>
			)
		}
		return (
			<div className="p-8 text-center">
				<p className="text-muted-foreground text-sm">No surgical case linked to this encounter.</p>
				<p className="text-muted-foreground mt-1 text-xs">
					A surgical case must be created from the Surgical module before records can be entered
					here.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-4 p-6">
			<div>
				<h2 className="text-base font-semibold">{surgicalCase.procedureName}</h2>
				<p className="text-muted-foreground text-sm">
					Case #{surgicalCase.id.slice(-8).toUpperCase()} &middot;{" "}
					{surgicalCase.orSuite ?? "Unassigned OR"}
					{surgicalCase.scheduledDatetime ? (
						<>
							{" "}
							&middot;{" "}
							{new Date(surgicalCase.scheduledDatetime).toLocaleString("en-PH", {
								month: "short",
								day: "numeric",
								year: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</>
					) : null}
				</p>
			</div>

			<Tabs defaultValue={defaultTab}>
				<TabsList>
					<TabsTrigger value="checklist">Pre-Op Checklist</TabsTrigger>
					<TabsTrigger value="operation">Operation Record</TabsTrigger>
					<TabsTrigger value="anesthesia">Anesthesia Record</TabsTrigger>
					{showRvsTab && <TabsTrigger value="rvs">RVS Codes</TabsTrigger>}
				</TabsList>

				<TabsContent value="checklist" className="mt-6">
					{checklistLoading ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<PreOpChecklist caseId={caseId} existing={preOpChecklist} canEdit={canEditPreOp} />
					)}
				</TabsContent>

				<TabsContent value="operation" className="mt-6">
					{opLoading ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<OperationRecordForm
							caseId={caseId}
							facilityId={activeFacilityId}
							surgeonStaffId={surgicalCase.surgeonStaffId ?? staffId}
							defaultAnesthesiologistStaffId={surgicalCase.anesthesiologistStaffId}
							existing={opRecord}
							canEdit={canEditOperation}
							canSign={canSignOperation}
						/>
					)}
				</TabsContent>

				<TabsContent value="anesthesia" className="mt-6">
					{anesthesiaLoading ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<AnesthesiaRecordForm
							caseId={caseId}
							existing={anesthesiaRecord}
							canEdit={canEditAnesthesia}
							canSign={canSignAnesthesia}
						/>
					)}
				</TabsContent>

				{showRvsTab && (
					<TabsContent value="rvs" className="mt-6">
						<RvsCodeSelector
							caseId={caseId}
							operationRecord={opRecord}
							canEdit={canEditSurgical}
							canValidate={canValidateRvs}
							canFinalize={canFinalizeRvs}
							isOperationRecordSigned={isOperationRecordSigned}
						/>
					</TabsContent>
				)}
			</Tabs>
		</div>
	)
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
