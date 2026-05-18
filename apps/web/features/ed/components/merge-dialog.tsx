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
import { useListCliniciansQuery, usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
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
	const [attendingStaffId, setAttendingStaffId] = useState<string | null>(null)
	const [attendingPickerOpen, setAttendingPickerOpen] = useState(false)

	const { data: searchResults } = usePatientSearchQuery({
		facilityId,
		search: searchTerm || undefined,
		limit: 10,
	})

	const { data: preview, isLoading: previewLoading } = useMergePreviewQuery(
		preEncounterId,
		selectedPatientId ?? ""
	)
	const { data: clinicianList, isLoading: cliniciansLoading } = useListCliniciansQuery(facilityId)

	const merge = useMergePreEncounterMutation()

	function resetMergeDialog() {
		setSearchTerm("")
		setSelectedPatientId(null)
		setAttendingStaffId(null)
		setAttendingPickerOpen(false)
	}

	function handleOpenChange(nextOpen: boolean) {
		onOpenChange(nextOpen)
		if (!nextOpen) resetMergeDialog()
	}

	function handleMerge() {
		if (!selectedPatientId || !attendingStaffId) return
		merge.mutate(
			{
				preEncounterId,
				patientId: selectedPatientId,
				encounterType: "emergency",
				admittingStaffId: staffProfileId,
				attendingStaffId,
			},
			{
				onSuccess: () => {
					onOpenChange(false)
					resetMergeDialog()
				},
			}
		)
	}

	const patients = searchResults?.data ?? []
	const clinicians = clinicianList?.data ?? []
	const selectedClinician = clinicians.find(
		clinician => clinician.staffProfileId === attendingStaffId
	)

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto">
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
								onClick={() => {
									setSelectedPatientId(null)
									setAttendingStaffId(null)
								}}
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

									<div className="space-y-2">
										<Label htmlFor="attendingStaffId">
											Attending physician
										</Label>
										<div className="relative">
											<button
												type="button"
												id="attendingStaffId"
												className="border-input bg-background text-foreground flex h-9 w-full items-center justify-between rounded-lg border px-3 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
												disabled={cliniciansLoading || clinicians.length === 0}
												aria-haspopup="listbox"
												aria-expanded={attendingPickerOpen}
												onClick={() => setAttendingPickerOpen(open => !open)}
											>
												<span className={selectedClinician ? "" : "text-muted-foreground"}>
													{selectedClinician
														? `${selectedClinician.name}${selectedClinician.department ? ` - ${selectedClinician.department}` : ""}`
														: cliniciansLoading
															? "Loading physicians..."
															: "Select attending physician"}
												</span>
												<span className="text-muted-foreground text-xs">v</span>
											</button>

											{attendingPickerOpen && (
												<div className="bg-popover text-popover-foreground ring-foreground/10 absolute top-full right-0 left-0 z-50 mt-1 h-72 overflow-hidden rounded-lg border shadow-md ring-1">
													<div
														className="h-full overflow-y-auto overscroll-contain p-1"
														role="listbox"
														aria-label="Attending physician"
														onWheel={event => event.stopPropagation()}
													>
														{clinicians.map(clinician => {
															const active = clinician.staffProfileId === attendingStaffId
															return (
																<button
																	key={clinician.staffProfileId}
																	type="button"
																	role="option"
																	aria-selected={active}
																	className="hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm"
																	onClick={() => {
																		setAttendingStaffId(clinician.staffProfileId)
																		setAttendingPickerOpen(false)
																	}}
																>
																	<span>
																		{clinician.name}
																		{clinician.department
																			? ` - ${clinician.department}`
																			: ""}
																	</span>
																	{active && <span className="text-xs">Selected</span>}
																</button>
															)
														})}
													</div>
												</div>
											)}
										</div>
										<p className="text-muted-foreground text-sm">
											This doctor will get regular access to the merged ED chart.
										</p>
									</div>

									<Separator />

									<div className="flex justify-end gap-2">
										<Button
											variant="outline"
											onClick={() => handleOpenChange(false)}
										>
											Cancel
										</Button>
										<Button
											onClick={handleMerge}
											disabled={merge.isPending || !attendingStaffId}
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
