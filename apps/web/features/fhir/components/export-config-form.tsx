"use client"

import { useState } from "react"
import { Download, Plus } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Switch } from "@/core/components/ui/switch"
import {
	type CreateExportInput,
	FHIR_RESOURCE_TYPES,
	type FhirResourceType,
	useCreateExportMutation,
} from "@/features/fhir/api/fhir.hooks"

// ============================================================================
// Types
// ============================================================================

interface ExportConfigFormProps {
	facilityId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

// ============================================================================
// Component
// ============================================================================

export function ExportConfigForm({ facilityId, open, onOpenChange }: ExportConfigFormProps) {
	const today = new Date().toISOString().slice(0, 10)
	const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
		.toISOString()
		.slice(0, 10)

	const [dateStart, setDateStart] = useState(firstOfMonth)
	const [dateEnd, setDateEnd] = useState(today)
	const [selectedTypes, setSelectedTypes] = useState<Set<FhirResourceType>>(
		new Set(FHIR_RESOURCE_TYPES),
	)
	const [validateOnExport, setValidateOnExport] = useState(true)
	const [submitError, setSubmitError] = useState<string | null>(null)

	const mutation = useCreateExportMutation()

	function toggleResource(type: FhirResourceType) {
		setSelectedTypes(prev => {
			const next = new Set(prev)
			if (next.has(type)) {
				next.delete(type)
			} else {
				next.add(type)
			}
			return next
		})
	}

	function selectAll() {
		setSelectedTypes(new Set(FHIR_RESOURCE_TYPES))
	}

	function clearAll() {
		setSelectedTypes(new Set())
	}

	async function handleSubmit() {
		if (!dateStart || !dateEnd) {
			setSubmitError("Please select a date range.")
			return
		}
		if (selectedTypes.size === 0) {
			setSubmitError("Select at least one resource type.")
			return
		}
		setSubmitError(null)

		const input: CreateExportInput = {
			facilityId,
			dateRangeStart: dateStart,
			dateRangeEnd: dateEnd,
			resourceTypes: Array.from(selectedTypes),
			validateOnExport,
		}

		try {
			await mutation.mutateAsync(input)
			onOpenChange(false)
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : "Export failed. Please try again.")
		}
	}

	// Group resource types into clinical categories
	const GROUPS: { label: string; types: FhirResourceType[] }[] = [
		{
			label: "Clinical",
			types: [
				"Patient",
				"Encounter",
				"Observation",
				"Condition",
				"Procedure",
				"DiagnosticReport",
				"AllergyIntolerance",
				"Immunization",
			],
		},
		{
			label: "Medications",
			types: ["MedicationRequest"],
		},
		{
			label: "Billing & Coverage",
			types: ["Coverage", "ClaimResponse"],
		},
		{
			label: "Facility",
			types: ["Practitioner", "Organization", "Location"],
		},
	]

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Plus className="size-4" />
						New FHIR Export
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6">
					{/* Date Range */}
					<div>
						<h3 className="mb-3 text-sm font-semibold">Date Range</h3>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="date-start">Period Start</Label>
								<Input
									id="date-start"
									type="date"
									value={dateStart}
									onChange={e => setDateStart(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="date-end">Period End</Label>
								<Input
									id="date-end"
									type="date"
									value={dateEnd}
									onChange={e => setDateEnd(e.target.value)}
								/>
							</div>
						</div>
					</div>

					{/* Resource Types */}
					<div>
						<div className="mb-3 flex items-center justify-between">
							<h3 className="text-sm font-semibold">
								FHIR Resource Types
								<Badge variant="secondary" className="ml-2">
									{selectedTypes.size} / {FHIR_RESOURCE_TYPES.length}
								</Badge>
							</h3>
							<div className="flex gap-2">
								<Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
									Select All
								</Button>
								<Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
									Clear
								</Button>
							</div>
						</div>
						<div className="space-y-4">
							{GROUPS.map(group => (
								<div key={group.label}>
									<p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
										{group.label}
									</p>
									<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
										{group.types.map(type => (
											<label
												key={type}
												className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
											>
												<Checkbox
													checked={selectedTypes.has(type)}
													onCheckedChange={() => toggleResource(type)}
												/>
												{type}
											</label>
										))}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Validation */}
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<p className="text-sm font-medium">Validate on Export</p>
							<p className="text-xs text-muted-foreground">
								Run FHIR R4 validation before generating the export bundle. Recommended for NHDR
								submission.
							</p>
						</div>
						<Switch checked={validateOnExport} onCheckedChange={setValidateOnExport} />
					</div>

					{submitError && (
						<p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{submitError}
						</p>
					)}
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={mutation.isPending}>
						<Download className="mr-2 size-4" />
						{mutation.isPending ? "Creating Export…" : "Create Export"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
