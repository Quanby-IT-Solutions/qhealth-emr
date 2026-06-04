"use client"

import { useState } from "react"

import { StatusBadge } from "@/core/components/status-badge"
import { Separator } from "@/core/components/ui/separator"

import { AdminPageHeader } from "./admin-page-header"
import { DataTableShell } from "./data-table-shell"
import { KpiTile } from "./kpi-tile"
import { MultiStepWizard } from "./multi-step-wizard"
import { ToggleListItem } from "./toggle-list-item"

export function DesignShowcase() {
	const [wizardStep, setWizardStep] = useState(0)
	const [toggle1, setToggle1] = useState(true)
	const [toggle2, setToggle2] = useState(false)

	return (
		<div className="space-y-12">
			{/* AdminPageHeader */}
			<section className="space-y-4">
				<h2 className="text-lg font-semibold">AdminPageHeader</h2>
				<AdminPageHeader
					title="Page Title"
					description="Optional description text."
					action={<span className="text-muted-foreground text-xs">[action slot]</span>}
				/>
				<AdminPageHeader title="No description, no action" />
			</section>

			<Separator />

			{/* KpiTile */}
			<section className="space-y-4">
				<h2 className="text-lg font-semibold">KpiTile</h2>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<KpiTile label="Today's BOR" value="87.4%" delta="+2.1%" deltaDirection="up" />
					<KpiTile label="Available Beds" value="12" delta="-3" deltaDirection="down" />
					<KpiTile label="7-Day Avg" value="84.1%" delta="0%" deltaDirection="neutral" />
					<KpiTile label="Active Users" value="142" />
				</div>
			</section>

			<Separator />

			{/* StatusBadge */}
			<section className="space-y-4">
				<h2 className="text-lg font-semibold">StatusBadge</h2>
				<div className="flex flex-wrap gap-2">
					<StatusBadge variant="verified" />
					<StatusBadge variant="pending" />
					<StatusBadge variant="active" />
					<StatusBadge variant="inactive" />
					<StatusBadge variant="expired" />
					<StatusBadge variant="restricted" />
					<StatusBadge variant="verified" label="PRC Verified" />
				</div>
			</section>

			<Separator />

			{/* ToggleListItem */}
			<section className="space-y-4">
				<h2 className="text-lg font-semibold">ToggleListItem</h2>
				<div className="divide-y rounded-md border">
					<ToggleListItem
						label="Telemedicine"
						description="Enable virtual consultations with video call integration."
						checked={toggle1}
						onCheckedChange={setToggle1}
						scope="Production"
						lastChangedBy="admin@example.com"
						lastChangedAt="Apr 29, 2026"
					/>
					<ToggleListItem
						label="NHDR FHIR Export"
						description="Push patient data to the National Health Data Repository."
						checked={toggle2}
						onCheckedChange={setToggle2}
						scope="Staging"
					/>
					<ToggleListItem
						label="Disabled Feature"
						description="This feature cannot be toggled right now."
						checked={false}
						onCheckedChange={() => undefined}
						disabled
					/>
				</div>
			</section>

			<Separator />

			{/* MultiStepWizard */}
			<section className="space-y-4">
				<h2 className="text-lg font-semibold">MultiStepWizard</h2>
				<MultiStepWizard
					steps={["Profile", "Role", "Permissions"]}
					currentStep={wizardStep}
					onNext={() => setWizardStep(s => Math.min(s + 1, 2))}
					onBack={() => setWizardStep(s => Math.max(s - 1, 0))}
					submitLabel="Create User"
				>
					<div className="text-muted-foreground rounded-md border px-4 py-8 text-center text-sm">
						Step {wizardStep + 1} content goes here.
					</div>
				</MultiStepWizard>
			</section>

			<Separator />

			{/* DataTableShell */}
			<section className="space-y-4">
				<h2 className="text-lg font-semibold">DataTableShell</h2>
				<DataTableShell
					searchPlaceholder="Search users..."
					onSearchChange={() => undefined}
					totalCount={42}
					page={1}
					pageSize={20}
					onPageChange={() => undefined}
				>
					<div className="text-muted-foreground px-4 py-8 text-center text-sm">
						Table rows render here.
					</div>
				</DataTableShell>
			</section>
		</div>
	)
}
