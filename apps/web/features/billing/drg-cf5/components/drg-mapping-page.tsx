"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Textarea } from "@/core/components/ui/textarea"

import { EncounterContextBar } from "@/features/billing/components/encounter-context-bar"
import { orpc } from "@/services/orpc/client"
import { formatConfidence } from "../lib/drg-confidence"
import { useSuggestDrgMutation, useConfirmDrgMutation } from "../api/drg.hooks"

interface DrgMappingPageProps {
	encounterId: string
	facilityId: string
	patientId: string
}

export function DrgMappingPage({ encounterId, facilityId, patientId }: DrgMappingPageProps) {
	void facilityId
	const router = useRouter()
	const [selectedDrg, setSelectedDrg] = useState<string | null>(null)
	const [overrideReason, setOverrideReason] = useState("")

	const { data: problemsData, isLoading: problemsLoading } = useQuery(
		orpc.problemsAllergies.listProblems.queryOptions({ input: { patientId } })
	)
	const icd10Codes = (problemsData?.data ?? []).filter(p => !!p.icd10Code).map(p => ({ code: p.icd10Code!, description: p.description ?? p.icd10Code! }))

	const { mutate: suggestDrg, isPending: suggesting, data: suggestions, error: suggestError } = useSuggestDrgMutation()
	const { mutate: confirmDrg, isPending: confirming } = useConfirmDrgMutation()

	useEffect(() => {
		if (encounterId) suggestDrg({ encounterId })
	}, [encounterId, suggestDrg])

	const candidates = suggestions?.candidates ?? []
	const top1DrgCode = candidates[0]?.code ?? null
	const selectedRank = candidates.findIndex(c => c.code === selectedDrg) + 1
	const requiresOverride = selectedDrg !== null && selectedDrg !== top1DrgCode
	const canConfirm = selectedDrg !== null && (!requiresOverride || overrideReason.trim().length > 0)

	function handleConfirm() {
		if (!selectedDrg) return
		confirmDrg(
			{
				encounterId,
				drgCode: selectedDrg,
				chosenRank: selectedRank || undefined,
				overrideReason: requiresOverride ? overrideReason : undefined,
			},
			{
				onSuccess: () => {
					router.push(`/billing/encounters/${encounterId}/drg/cf5`)
				},
			}
		)
	}

	return (
		<div className="space-y-4">
			<EncounterContextBar />

			<div className="px-4 grid grid-cols-1 gap-4 md:grid-cols-2">
				{/* Left: ICD-10 + RVS */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">ICD-10 Codes (Encounter)</CardTitle>
					</CardHeader>
				<CardContent className="space-y-2">
					{problemsLoading && <Skeleton className="h-16 w-full" />}
					{!problemsLoading && icd10Codes.length === 0 && (
						<p className="text-sm text-muted-foreground">No ICD-10 codes on problem list.</p>
					)}
					{icd10Codes.map(icd => (
							<div key={icd.code} className="flex gap-2 text-sm">
								<span className="font-mono font-semibold">{icd.code}</span>
								<span className="text-muted-foreground">{icd.description}</span>
							</div>
						))}
					</CardContent>
				</Card>

				{/* Right: DRG suggestions */}
				<div className="space-y-4">
					<Card>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-sm">DRG Suggestions</CardTitle>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => suggestDrg({ encounterId })}
									disabled={suggesting}
									className="h-7 text-xs"
								>
									{suggesting ? "Refreshing..." : "Refresh"}
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{suggesting && !suggestions && (
								<div className="space-y-2">
									{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
								</div>
							)}

							{suggestError && (
								<Alert variant="destructive">
									<AlertDescription>Failed to load DRG suggestions.</AlertDescription>
								</Alert>
							)}

							{candidates.length > 0 && (
								<RadioGroup
									value={selectedDrg ?? ""}
									onValueChange={v => {
										setSelectedDrg(v as string)
										setOverrideReason("")
									}}
									aria-label="Select DRG code"
								>
									{candidates.map((c, idx) => (
										<div
											key={c.code}
											className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
												selectedDrg === c.code ? "border-primary bg-primary/5" : "hover:bg-muted/40"
											}`}
											onClick={() => {
												setSelectedDrg(c.code)
												setOverrideReason("")
											}}
										>
											<RadioGroupItem
												value={c.code}
												id={`drg-${c.code}`}
												className="mt-0.5"
											/>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<Label
														htmlFor={`drg-${c.code}`}
														className="font-mono font-semibold text-sm cursor-pointer"
													>
														{c.code}
													</Label>
													{idx === 0 && (
														<Badge variant="default" className="text-[10px] h-4 px-1">
															Top Match
														</Badge>
													)}
													<Badge
														variant="outline"
														className={`text-[10px] h-4 px-1 ${
															c.confidence > 0.8 ? "text-green-700 border-green-300" :
															c.confidence >= 0.5 ? "text-yellow-700 border-yellow-300" :
															"text-red-700 border-red-300"
														}`}
													>
														{formatConfidence(c.confidence)}
													</Badge>
												</div>
												<p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
												{c.rationale && (
													<p className="text-[10px] text-muted-foreground/80 mt-1 italic">{c.rationale}</p>
												)}
											</div>
										</div>
									))}
								</RadioGroup>
							)}

							{candidates.length === 0 && !suggesting && !suggestError && (
								<p className="text-sm text-muted-foreground text-center py-4">
									No DRG suggestions available.
								</p>
							)}
						</CardContent>
					</Card>

					{requiresOverride && (
						<Card className="border-yellow-200 bg-yellow-50/50">
							<CardContent className="pt-4 space-y-2">
								<Label htmlFor="override-reason" className="text-sm">
									Override Justification <span className="text-destructive">*</span>
								</Label>
								<p className="text-xs text-muted-foreground">
									You selected a DRG other than the top recommendation. Provide a clinical reason.
								</p>
								<Textarea
									id="override-reason"
									value={overrideReason}
									onChange={e => setOverrideReason(e.target.value)}
									placeholder="e.g. Primary diagnosis documentation supports DRG 291 over 292 based on MCC confirmation from pathology."
									rows={3}
									aria-label="DRG override justification"
								/>
							</CardContent>
						</Card>
					)}

					<Button
						onClick={handleConfirm}
						disabled={!canConfirm || confirming}
						className="w-full"
					>
						{confirming ? "Confirming..." : "Confirm DRG Mapping"}
					</Button>
				</div>
			</div>
		</div>
	)
}
