"use client"

import { use } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useAnesthesiaRecordQuery,
	useOperationRecordQuery,
	usePreOpChecklistQuery,
	useSurgicalCaseDetailQuery,
	type SurgeryStatus,
} from "@/features/surgical/api/surgical.hooks"
import { AnesthesiaRecordForm } from "@/features/surgical/components/anesthesia-record-form"
import { OperationRecordForm } from "@/features/surgical/components/operation-record-form"
import { PreOpChecklist } from "@/features/surgical/components/pre-op-checklist"
import { RvsCodeSelector } from "@/features/surgical/components/rvs-code-selector"

function statusVariant(status: SurgeryStatus) {
	switch (status) {
		case "in_progress":
			return "default" as const
		case "completed":
			return "secondary" as const
		case "cancelled":
		case "postponed":
			return "outline" as const
		default:
			return "outline" as const
	}
}

function statusLabel(status: SurgeryStatus): string {
	return status.replace(/_/g, " ")
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

export default function SurgicalCaseDetailPage({
	params,
}: {
	params: Promise<{ caseId: string }>
}) {
	const { caseId } = use(params)
	const { data: profile } = useMyProfile()
	const permSet = usePermissionSet()

	const canEditSurgical = can(permSet, "surgical", "edit")
	const canSignSurgical = can(permSet, "surgical", "sign")
	const canValidateRvs = can(permSet, "billing", "edit")
	const canFinalizeRvs = can(permSet, "billing", "sign")

	const roleName = (profile?.activeRole?.name ?? "").toLowerCase()
	const isSurgeon = roleName === "surgeon"
	const isAnesthesiologist = roleName === "anesthesiologist"

	const defaultTab = isSurgeon ? "operation" : "anesthesia"
	const showRvsTab = !isAnesthesiologist

	const canEditPreOp = isAnesthesiologist ? false : canEditSurgical
	const canEditOperation = isAnesthesiologist ? false : canEditSurgical
	const canSignOperation = isAnesthesiologist ? false : canSignSurgical
	const activeStaffProfile =
		profile?.staffProfiles?.find((sp: { roles?: { id: string }[] }) =>
			sp.roles?.some((role: { id: string }) => role.id === profile.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]
	const staffId = activeStaffProfile?.id ?? ""
	const facilityId = activeStaffProfile?.facilityId ?? ""

	const { data: surgicalCase, isLoading: caseLoading } = useSurgicalCaseDetailQuery(caseId)
	const { data: opRecord, isLoading: opLoading } = useOperationRecordQuery(caseId)
	const { data: anesthesiaRecord, isLoading: anesthesiaLoading } = useAnesthesiaRecordQuery(caseId)
	const { data: preOpChecklist, isLoading: checklistLoading } = usePreOpChecklistQuery(caseId)

	const isOperationRecordSigned = opRecord?.status === "signed"
	const isAssignedAnesthesiologist =
		isAnesthesiologist &&
		!!surgicalCase?.anesthesiologistStaffId &&
		surgicalCase.anesthesiologistStaffId === staffId
	const canEditAnesthesia = isAssignedAnesthesiologist && canEditSurgical
	const canSignAnesthesia = isAssignedAnesthesiologist && canSignSurgical

	if (caseLoading) {
		return (
			<div className="flex items-center gap-2 p-8 text-sm">
				<Loader2 className="size-4 animate-spin" />
				Loading case…
			</div>
		)
	}

	if (!surgicalCase) {
		return (
			<div className="p-8 text-center">
				<p className="text-muted-foreground text-sm">Surgical case not found.</p>
			</div>
		)
	}

	return (
		<div className="space-y-4 p-6">
			{/* Breadcrumb */}
			<div className="text-muted-foreground flex items-center gap-1 text-xs">
				<Link href="/surgical" className="text-blue-600 hover:underline">
					Surgical Services
				</Link>
				<span>›</span>
				<span>Case #{surgicalCase.id.slice(-8).toUpperCase()}</span>
			</div>

			{/* Header */}
			<div>
				<div className="flex items-center gap-3">
					<h1 className="text-xl font-semibold">{surgicalCase.procedureName}</h1>
					<Badge variant={statusVariant(surgicalCase.status)}>
						{statusLabel(surgicalCase.status)}
					</Badge>
				</div>
				<p className="text-muted-foreground mt-1 text-sm">
					Case #{surgicalCase.id.slice(-8).toUpperCase()}
					{surgicalCase.orSuite ? ` · ${surgicalCase.orSuite}` : ""}
					{surgicalCase.scheduledDatetime
						? ` · ${new Date(surgicalCase.scheduledDatetime).toLocaleString("en-PH", {
								month: "short",
								day: "numeric",
								year: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}`
						: ""}
				</p>
			</div>

			{/* Info grid */}
			<div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
				<div>
					<span className="text-muted-foreground text-xs tracking-wide uppercase">Patient</span>
					<p className="font-medium">{surgicalCase.patientName ?? "—"}</p>
				</div>
				<div>
					<span className="text-muted-foreground text-xs tracking-wide uppercase">Surgeon</span>
					<p className="font-medium">{surgicalCase.surgeonName ?? "—"}</p>
				</div>
				<div>
					<span className="text-muted-foreground text-xs tracking-wide uppercase">
						Anesthesiologist
					</span>
					<p className="font-medium">{surgicalCase.anesthesiologistName ?? "—"}</p>
				</div>
				<div>
					<span className="text-muted-foreground text-xs tracking-wide uppercase">
						Surgical Type
					</span>
					<p className="font-medium capitalize">{surgicalCase.surgicalType}</p>
				</div>
				{surgicalCase.asaClass && (
					<div>
						<span className="text-muted-foreground text-xs tracking-wide uppercase">ASA Class</span>
						<p className="font-medium">{surgicalCase.asaClass}</p>
					</div>
				)}
				{surgicalCase.orSuite && (
					<div>
						<span className="text-muted-foreground text-xs tracking-wide uppercase">OR Suite</span>
						<p className="font-medium">{surgicalCase.orSuite}</p>
					</div>
				)}
			</div>

			{/* Tabs */}
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
							facilityId={facilityId}
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
