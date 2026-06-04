"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"

interface BedOption {
	id: string
	bedNumber: string
	wardName: string
	wardType: string
	status: string
}

interface BedSuggestionPanelProps {
	encounterType: "inpatient" | "emergency" | "outpatient"
	availableBeds: BedOption[]
	selectedBedId: string
	onSelect: (bedId: string) => void
}

/** Match preferred ward type to encounter type */
function preferredWardType(encounterType: string): string | null {
	switch (encounterType) {
		case "emergency":
			return "er"
		case "inpatient":
			return "general"
		default:
			return null
	}
}

function wardRuleExplanation(encounterType: string, wardType: string | null): string {
	if (encounterType === "emergency" && wardType === "er")
		return "Best match: ER bed for emergency encounter"
	if (encounterType === "inpatient" && wardType === "general")
		return "Best match: General ward for inpatient admission"
	if (wardType === "icu") return "ICU bed available — confirm clinical need before assigning"
	return "Available bed — no specific ward preference for this encounter type"
}

function formatBedLabel(bed: BedOption) {
	return `${bed.wardName} — Bed ${bed.bedNumber}`
}

export function BedSuggestionPanel({
	encounterType,
	availableBeds,
	selectedBedId,
	onSelect,
}: BedSuggestionPanelProps) {
	const [overrideMode, setOverrideMode] = useState(false)

	if (availableBeds.length === 0) {
		return (
			<Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/20">
				<CardContent className="py-4">
					<p className="text-sm text-yellow-800 dark:text-yellow-300">
						No available beds found for this facility.
					</p>
				</CardContent>
			</Card>
		)
	}

	const preferred = preferredWardType(encounterType)
	const suggestedBed = availableBeds.find(b => b.wardType === preferred) ?? availableBeds[0]

	const isAccepted = selectedBedId === suggestedBed?.id && !overrideMode
	const explanation = suggestedBed ? wardRuleExplanation(encounterType, suggestedBed.wardType) : ""
	const selectedBed = availableBeds.find(bed => bed.id === selectedBedId)

	const handleAccept = () => {
		if (suggestedBed) {
			onSelect(suggestedBed.id)
			setOverrideMode(false)
		}
	}

	return (
		<Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-semibold">Suggested Bed</CardTitle>
					<Badge variant="outline" className="text-xs text-blue-700 dark:text-blue-400">
						Auto-assigned
					</Badge>
				</div>
			</CardHeader>
			<Separator />
			<CardContent className="pt-3">
				{!overrideMode && suggestedBed ? (
					<div className="space-y-3">
						<div className="flex items-start justify-between">
							<div>
								<p className="font-medium">
									{suggestedBed.wardName} — Bed {suggestedBed.bedNumber}
								</p>
								<p className="text-muted-foreground text-xs capitalize">
									{suggestedBed.wardType} ward
								</p>
							</div>
							<Badge className="capitalize">{suggestedBed.status}</Badge>
						</div>

						<p className="text-muted-foreground text-xs">{explanation}</p>

						<div className="flex gap-2">
							<Button size="sm" disabled={isAccepted} onClick={handleAccept}>
								{isAccepted ? "Accepted" : "Accept Suggestion"}
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									setOverrideMode(true)
									onSelect("")
								}}
							>
								Override
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-3">
						<div className="space-y-1.5">
							<Label className="text-xs">Select a Different Bed</Label>
							<Select value={selectedBedId} onValueChange={v => onSelect(v ?? "")}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Choose available bed…">
										{selectedBed ? formatBedLabel(selectedBed) : undefined}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{availableBeds.map(bed => (
										<SelectItem key={bed.id} value={bed.id} label={formatBedLabel(bed)}>
											{formatBedLabel(bed)}{" "}
											<span className="text-muted-foreground capitalize">({bed.wardType})</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => {
								setOverrideMode(false)
								handleAccept()
							}}
						>
							← Back to suggestion
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
