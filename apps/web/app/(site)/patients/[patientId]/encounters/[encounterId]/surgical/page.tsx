"use client"

import { useState } from "react"

import { Loader2 } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useChartContext } from "@/features/encounters/context/chart-context"
import { AnesthesiaRecordForm } from "@/features/surgical/components/anesthesia-record-form"
import { OperationRecordForm } from "@/features/surgical/components/operation-record-form"
import { PreOpChecklist } from "@/features/surgical/components/pre-op-checklist"
import { RvsCodeSelector } from "@/features/surgical/components/rvs-code-selector"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import {
	useAnesthesiaRecordQuery,
	useOperationRecordQuery,
	usePreOpChecklistQuery,
	useSurgicalCaseListQuery,
} from "@/features/surgical/api/surgical.hooks"

export default function SurgicalPage() {
	const { encounterId, facilityId } = useChartContext()
	const { data: profile } = useMyProfile()
	const staffId = profile?.staffProfiles?.[0]?.id ?? ""

	// Fetch the surgical case tied to this encounter
	const { data: cases, isLoading: casesLoading } = useSurgicalCaseListQuery({
		encounterId,
	})
	const surgicalCase = cases?.[0]

	const caseId = surgicalCase?.id ?? ""

	const { data: opRecord, isLoading: opLoading } = useOperationRecordQuery(
		caseId ? caseId : undefined,
	)
	const { data: anesthesiaRecord, isLoading: anesthesiaLoading } = useAnesthesiaRecordQuery(
		caseId ? caseId : undefined,
	)
	const { data: preOpChecklist, isLoading: checklistLoading } = usePreOpChecklistQuery(
		caseId ? caseId : undefined,
	)

	const permSet = usePermissionSet()
	const canValidateRvs = can(permSet, "billing", "edit")
	const canFinalizeRvs = can(permSet, "billing", "sign")

	if (casesLoading) {
		return (
			<div className="flex items-center gap-2 p-8 text-sm">
				<Loader2 className="size-4 animate-spin" />
				Loading surgical case…
			</div>
		)
	}

	if (!surgicalCase) {
		return (
			<div className="p-8 text-center">
				<p className="text-muted-foreground text-sm">
					No surgical case linked to this encounter.
				</p>
				<p className="text-muted-foreground mt-1 text-xs">
					A surgical case must be created from the Surgical module before records can be
					entered here.
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
					{surgicalCase.orSuite} &middot;{" "}
					{new Date(surgicalCase.scheduledAt).toLocaleString("en-PH", {
						month: "short",
						day: "numeric",
						year: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					})}
				</p>
			</div>

			<Tabs defaultValue="checklist">
				<TabsList>
					<TabsTrigger value="checklist">Pre-Op Checklist</TabsTrigger>
					<TabsTrigger value="operation">Operation Record</TabsTrigger>
					<TabsTrigger value="anesthesia">Anesthesia Record</TabsTrigger>
					<TabsTrigger value="rvs">RVS Codes</TabsTrigger>
				</TabsList>

				<TabsContent value="checklist" className="mt-6">
					{checklistLoading ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<PreOpChecklist caseId={caseId} existing={preOpChecklist} />
					)}
				</TabsContent>

				<TabsContent value="operation" className="mt-6">
					{opLoading ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<OperationRecordForm
							caseId={caseId}
							surgeonStaffId={surgicalCase.surgeonStaffId ?? staffId}
							existing={opRecord}
						/>
					)}
				</TabsContent>

				<TabsContent value="anesthesia" className="mt-6">
					{anesthesiaLoading ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<AnesthesiaRecordForm caseId={caseId} existing={anesthesiaRecord} />
					)}
				</TabsContent>

				<TabsContent value="rvs" className="mt-6">
					<RvsCodeSelector
						caseId={caseId}
						canValidate={canValidateRvs}
						canFinalize={canFinalizeRvs}
					/>
				</TabsContent>
			</Tabs>
		</div>
	)
}

// ── Inline RBAC helpers (mirrors layout.tsx pattern) ─────────────────────────

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}
