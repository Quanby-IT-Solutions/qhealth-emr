"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import { useCreatePreEncounterMutation } from "@/features/ed/api/ed.hooks"
import { acuityColor, acuityLabel } from "@/features/ed/lib/acuity-utils"

interface PreEncounterFormProps {
	facilityId: string
	triageStaffId: string
	onSuccess: () => void
}

/**
 * Rapid-charting form for Acuity 1–2 patients who bypass standard registration.
 * An auto-generated Trauma Alias MRN is assigned on the backend upon creation.
 */
export function PreEncounterForm({ facilityId, triageStaffId, onSuccess }: PreEncounterFormProps) {
	const createPreEncounter = useCreatePreEncounterMutation()

	const [acuityScale, setAcuityScale] = useState<"esi" | "ats" | "ctas">("esi")
	const [acuityLevel, setAcuityLevel] = useState<number>(1)
	const [chiefComplaint, setChiefComplaint] = useState("")
	const [confirmOpen, setConfirmOpen] = useState(false)

	const isCritical = acuityLevel <= 2

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setConfirmOpen(true)
	}

	function handleConfirmCreate() {
		createPreEncounter.mutate(
			{
				facilityId,
				triageAcuityScale: acuityScale,
				triageAcuityLevel: acuityLevel,
				triageStaffId,
				chiefComplaint: chiefComplaint || undefined,
			},
			{
				onSuccess: preEncounter => {
					setConfirmOpen(false)
					toast.success(`Trauma alias ${preEncounter.traumaAlias} created.`)
					setAcuityScale("esi")
					setAcuityLevel(1)
					setChiefComplaint("")
					onSuccess()
				},
			}
		)
	}

	return (
		<>
			<form onSubmit={handleSubmit} className="space-y-4">
				{/* Critical acuity notice */}
				{isCritical && (
					<Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
						<CardContent className="py-3">
							<p className="text-sm font-medium text-red-700 dark:text-red-400">
								Acuity {acuityLevel} — {acuityLabel(acuityLevel)}: Patient bypasses standard
								registration. A Trauma Alias MRN will be auto-generated.
							</p>
						</CardContent>
					</Card>
				)}

				{/* Acuity Scale */}
				<div className="space-y-2">
					<Label>Acuity Scale</Label>
					<Select
						value={acuityScale}
						onValueChange={v => setAcuityScale((v ?? "esi") as "esi" | "ats" | "ctas")}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="esi">ESI (Emergency Severity Index)</SelectItem>
							<SelectItem value="ats">ATS (Australasian Triage Scale)</SelectItem>
							<SelectItem value="ctas">CTAS (Canadian Triage & Acuity Scale)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Acuity Level — prominently shown for bypass eligibility */}
				<div className="space-y-2">
					<Label>Acuity Level (1 = most urgent)</Label>
					<div className="grid grid-cols-5 gap-2">
						{[1, 2, 3, 4, 5].map(level => (
							<button
								key={level}
								type="button"
								className={`rounded-md border py-2 text-sm font-semibold transition-all focus:ring-2 focus:ring-offset-1 focus:outline-none ${
									acuityLevel === level
										? `${acuityColor(level)} ring-2 ring-offset-1`
										: "border-border hover:bg-accent"
								}`}
								aria-pressed={acuityLevel === level}
								onClick={() => setAcuityLevel(level)}
							>
								{level}
							</button>
						))}
					</div>
					<div className="flex items-center gap-2 pt-1">
						<Badge className={acuityColor(acuityLevel)}>{acuityLevel}</Badge>
						<span className="text-muted-foreground text-sm">{acuityLabel(acuityLevel)}</span>
						{acuityLevel <= 2 && (
							<Badge
								variant="outline"
								className="ml-auto border-orange-400 text-orange-700 dark:text-orange-400"
							>
								Registration Bypass Eligible
							</Badge>
						)}
					</div>
				</div>

				<Separator />

				{/* Chief Complaint */}
				<div className="space-y-2">
					<Label>Chief Complaint</Label>
					<Textarea
						placeholder="Describe the presenting complaint…"
						value={chiefComplaint}
						onChange={e => setChiefComplaint(e.target.value)}
						rows={3}
					/>
				</div>

				<Button type="submit" className="w-full" disabled={createPreEncounter.isPending}>
					Review Trauma Alias
				</Button>

				{createPreEncounter.isError && (
					<p className="text-destructive text-sm">{createPreEncounter.error.message}</p>
				)}
			</form>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent className="!h-auto !max-h-[calc(100svh-2rem)] !w-[min(32rem,calc(100vw-2rem))] !max-w-none overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Verify trauma alias creation</DialogTitle>
						<DialogDescription>
							Confirm these triage details before creating a temporary trauma alias.
						</DialogDescription>
					</DialogHeader>

					<div className="rounded-md border p-3 text-sm">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<p className="text-muted-foreground text-xs">Acuity</p>
								<p className="font-medium">
									Level {acuityLevel} - {acuityLabel(acuityLevel)}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Scale</p>
								<p className="font-medium">{acuityScale.toUpperCase()}</p>
							</div>
						</div>
						<div className="mt-3">
							<p className="text-muted-foreground text-xs">Chief Complaint</p>
							<p className="mt-1 whitespace-pre-wrap">{chiefComplaint.trim() || "Not provided"}</p>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setConfirmOpen(false)}
							disabled={createPreEncounter.isPending}
						>
							Review Again
						</Button>
						<Button
							type="button"
							onClick={handleConfirmCreate}
							disabled={createPreEncounter.isPending}
						>
							{createPreEncounter.isPending ? "Creating..." : "Create Trauma Alias"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
