"use client"

import { useEffect, useMemo, useState } from "react"

import { CheckCircle2, Circle, ShieldAlert } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"

import {
	type PreOpChecklist as PreOpChecklistData,
	useSavePreOpChecklistMutation,
} from "../api/surgical.hooks"

// ── Default checklist items ──────────────────────────────────────────────────

const DEFAULT_CHECKLIST_ITEMS: Array<{ key: string; label: string; category: string }> = [
	// Fasting
	{ key: "npo_confirmed", label: "NPO status confirmed (solid food ≥ 6 h, clear fluids ≥ 2 h)", category: "Fasting & Preparation" },
	{ key: "iv_access", label: "IV access established and patent", category: "Fasting & Preparation" },
	// Labs
	{ key: "labs_reviewed", label: "Pre-operative labs reviewed (CBC, serum electrolytes, coag)", category: "Laboratory & Imaging" },
	{ key: "xray_reviewed", label: "Chest X-ray/imaging reviewed where indicated", category: "Laboratory & Imaging" },
	{ key: "blood_type", label: "Blood type and cross-match completed", category: "Laboratory & Imaging" },
	// Medications
	{ key: "meds_held", label: "Anticoagulants / antiplatelet agents held as ordered", category: "Medications" },
	{ key: "pre_op_meds", label: "Pre-operative medications administered", category: "Medications" },
	{ key: "allergy_reviewed", label: "Drug allergies reviewed and documented", category: "Medications" },
	// Consent
	{ key: "surgical_consent", label: "Surgical consent form signed by patient/guardian", category: "Consents & Documents" },
	{ key: "anesthesia_consent", label: "Anesthesia consent form signed", category: "Consents & Documents" },
	{ key: "implant_consent", label: "Implant/blood product consent signed (if applicable)", category: "Consents & Documents" },
	// Safety
	{ key: "site_marked", label: "Operative site marked by surgeon", category: "Safety Checks" },
	{ key: "identity_confirmed", label: "Patient identity confirmed (name + ID + wristband)", category: "Safety Checks" },
	{ key: "position_verified", label: "Planned procedure and position verified with team", category: "Safety Checks" },
	{ key: "equipment_ready", label: "Special equipment/implants confirmed available", category: "Safety Checks" },
]

type CheckMap = Record<string, boolean>

function buildCheckMap(existing: PreOpChecklistData | null | undefined): CheckMap {
	const map: CheckMap = {}
	for (const item of DEFAULT_CHECKLIST_ITEMS) {
		map[item.key] = false
	}
	if (existing) {
		for (const item of existing.items) {
			map[item.key] = item.checked
		}
	}
	return map
}

interface ChecklistGroupProps {
	category: string
	items: Array<{ key: string; label: string }>
	checks: CheckMap
	onChange: (key: string, checked: boolean) => void
	serverItems: PreOpChecklistData["items"]
}

function ChecklistGroup({ category, items, checks, onChange, serverItems }: ChecklistGroupProps) {
	return (
		<div>
			<p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
				{category}
			</p>
			<div className="space-y-2">
				{items.map((item) => {
					const serverItem = serverItems?.find((s) => s.key === item.key)
					const isChecked = checks[item.key] ?? false

					return (
						<div key={item.key} className="flex items-start gap-3">
							<Checkbox
								id={item.key}
								checked={isChecked}
								onCheckedChange={(v) => onChange(item.key, !!v)}
								className="mt-0.5"
							/>
							<div className="flex-1">
								<Label htmlFor={item.key} className="cursor-pointer text-sm">
									{item.label}
								</Label>
								{serverItem?.checkedAt && (
									<p className="text-muted-foreground text-xs">
										Checked by{" "}
										{serverItem.checkedByName ?? "staff"} at{" "}
										{new Date(serverItem.checkedAt).toLocaleString("en-PH", {
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								)}
							</div>
							{isChecked ? (
								<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
							) : (
								<Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
							)}
						</div>
					)
				})}
			</div>
		</div>
	)
}

interface PreOpChecklistProps {
	caseId: string
	existing: PreOpChecklistData | null | undefined
	canEdit?: boolean
}

export function PreOpChecklist({ caseId, existing, canEdit = true }: PreOpChecklistProps) {
	const [checks, setChecks] = useState<CheckMap>(() => buildCheckMap(existing))
	const save = useSavePreOpChecklistMutation()

	useEffect(() => {
		setChecks(buildCheckMap(existing))
	}, [existing])

	const categories = useMemo(() => {
		const map = new Map<string, Array<{ key: string; label: string }>>()
		for (const item of DEFAULT_CHECKLIST_ITEMS) {
			if (!map.has(item.category)) map.set(item.category, [])
			map.get(item.category)!.push({ key: item.key, label: item.label })
		}
		return map
	}, [])

	const checkedCount = Object.values(checks).filter(Boolean).length
	const totalCount = DEFAULT_CHECKLIST_ITEMS.length
	const allClear = checkedCount === totalCount

	function handleChange(key: string, checked: boolean) {
		setChecks((prev) => ({ ...prev, [key]: checked }))
	}

	function handleSave() {
		save.mutate({
			caseId,
			items: Object.entries(checks).map(([key, checked]) => ({ key, checked })),
		})
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">Pre-Operative Checklist</CardTitle>
						<div className="flex items-center gap-3">
							<span className="text-muted-foreground text-sm">
								{checkedCount} / {totalCount} items
							</span>
							{allClear ? (
								<Badge variant="default" className="gap-1">
									<CheckCircle2 className="size-3.5" />
									All Clear
								</Badge>
							) : (
								<Badge variant="secondary">
									{totalCount - checkedCount} pending
								</Badge>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{!allClear && (
						<div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
							<ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
							<p className="text-sm text-amber-800">
								<strong>Surgery should not begin</strong> until all checklist items
								are confirmed. Incomplete items must be addressed before proceeding
								to the OR.
							</p>
						</div>
					)}

					<div className="space-y-6">
						{Array.from(categories.entries()).map(([category, items]) => (
							<div key={category}>
								<ChecklistGroup
									category={category}
									items={items}
									checks={checks}
									onChange={handleChange}
									serverItems={existing?.items ?? []}
								/>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{existing?.completedAt && (
				<Card>
					<CardContent className="flex items-center gap-2 py-4">
						<CheckCircle2 className="size-5 text-green-600" />
						<p className="text-sm">
							Checklist completed by{" "}
							<strong>{existing.completedByName ?? "staff"}</strong> at{" "}
							{new Date(existing.completedAt).toLocaleString("en-PH", {
								month: "short",
								day: "numeric",
								year: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</p>
					</CardContent>
				</Card>
			)}

			<Separator />

			<div className="flex justify-end">
				<Button onClick={handleSave} disabled={save.isPending || !canEdit}>
					{save.isPending ? "Saving…" : "Save Checklist"}
				</Button>
			</div>
		</div>
	)
}
