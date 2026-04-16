"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
import { useMergePreEncounterMutation, useMergePreviewQuery } from "@/features/ed/api/ed.hooks"

import { MergePreview } from "./merge-preview"

interface MergeDialogProps {
	preEncounterId: string
	traumaAlias: string
	facilityId: string
	staffProfileId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function MergeDialog({
	preEncounterId,
	traumaAlias,
	facilityId,
	staffProfileId,
	open,
	onOpenChange,
}: MergeDialogProps) {
	const [searchTerm, setSearchTerm] = useState("")
	const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)

	const { data: searchResults } = usePatientSearchQuery({
		facilityId,
		search: searchTerm || undefined,
		limit: 10,
	})

	const { data: preview, isLoading: previewLoading } = useMergePreviewQuery(
		preEncounterId,
		selectedPatientId ?? ""
	)

	const merge = useMergePreEncounterMutation()

	function handleMerge() {
		if (!selectedPatientId) return
		merge.mutate(
			{
				preEncounterId,
				patientId: selectedPatientId,
				encounterType: "emergency",
				admittingStaffId: staffProfileId,
			},
			{
				onSuccess: () => {
					onOpenChange(false)
				},
			}
		)
	}

	const patients = searchResults?.data ?? []

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Merge Pre-Encounter — {traumaAlias}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Step 1: Patient Search */}
					{!selectedPatientId && (
						<>
							<div className="space-y-2">
								<Label>Search Patient (Name or MRN)</Label>
								<Input
									placeholder="Type to search patients…"
									value={searchTerm}
									onChange={e => setSearchTerm(e.target.value)}
								/>
							</div>

							{searchTerm.length > 0 && (
								<div className="max-h-60 space-y-1 overflow-y-auto">
									{patients.length === 0 ? (
										<p className="text-muted-foreground py-4 text-center text-sm">
											No patients found.
										</p>
									) : (
										patients.map(patient => (
											<button
												key={patient.id}
												type="button"
												className="hover:bg-accent flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm"
												onClick={() => setSelectedPatientId(patient.id)}
											>
												<div>
													<span className="font-medium">
														{patient.lastName}, {patient.firstName}
													</span>
													<span className="text-muted-foreground ml-2">
														MRN: {patient.mrn}
													</span>
												</div>
												<span className="text-muted-foreground text-xs">
													DOB: {patient.dateOfBirth}
												</span>
											</button>
										))
									)}
								</div>
							)}
						</>
					)}

					{/* Step 2: Merge Preview */}
					{selectedPatientId && (
						<>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setSelectedPatientId(null)}
							>
								← Back to Search
							</Button>

							{previewLoading ? (
								<p className="text-muted-foreground py-4 text-center text-sm">
									Loading preview…
								</p>
							) : preview ? (
								<div className="space-y-4">
									<MergePreview
										patientName={preview.patientName}
										patientMrn={preview.patientMrn}
										preEncounter={preview.preEncounter}
										clinicalRecordCounts={preview.clinicalRecordCounts}
									/>

									<Separator />

									<div className="flex justify-end gap-2">
										<Button
											variant="outline"
											onClick={() => onOpenChange(false)}
										>
											Cancel
										</Button>
										<Button
											onClick={handleMerge}
											disabled={merge.isPending}
										>
											{merge.isPending
												? "Merging…"
												: "Confirm Merge"}
										</Button>
									</div>

									{merge.isError && (
										<p className="text-destructive text-sm">
											{merge.error.message}
										</p>
									)}
								</div>
							) : null}
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
