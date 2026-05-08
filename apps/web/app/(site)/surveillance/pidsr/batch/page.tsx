"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle, Send } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { usePidsrCasesQuery, useGenerateWeeklyReportMutation } from "@/features/reporting/api/reporting.hooks"

function formatDate(d: string | null | undefined) {
	if (!d) return "—"
	return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
}

export default function PidsrBatchPage() {
	const { data: profile, isLoading: profileLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId

	const [selected, setSelected] = useState<Set<string>>(new Set())
	const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

	const { data, isLoading } = usePidsrCasesQuery({
		facilityId: facilityId ?? "",
		category: "category_2",
		reportStatus: "draft",
		limit: 100,
	})

	const weeklyMut = useGenerateWeeklyReportMutation()

	const cases = data?.cases ?? []

	function toggleAll() {
		if (selected.size === cases.length) {
			setSelected(new Set())
		} else {
			setSelected(new Set(cases.map((c) => c.id)))
		}
	}

	function toggle(id: string) {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	function handleTransmit() {
		if (!facilityId || selected.size === 0) return
		setResult(null)
		const today = new Date()
		const monday = new Date(today)
		monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
		weeklyMut.mutate(
			{ facilityId, weekStartDate: monday.toISOString().split("T")[0]!, caseIds: Array.from(selected) },
			{
				onSuccess: (data) => {
					const msg = data.status === "submitted"
						? `Weekly report submitted. ${data.totalCases} cases transmitted.`
						: data.transmissionNote ?? "Report generated."
					setResult({ type: data.status === "submitted" ? "success" : "error", message: msg })
					if (data.status === "submitted") setSelected(new Set())
				},
				onError: (err) => {
					setResult({ type: "error", message: err instanceof Error ? err.message : "Transmission failed." })
				},
			}
		)
	}

	if (profileLoading) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">Loading…</CardContent>
			</Card>
		)
	}

	if (!facilityId) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">
					No facility assigned to your profile. Contact your administrator.
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-xl font-semibold">Batch PIDSR Submission</h1>
				<p className="text-sm text-muted-foreground">Select Category-2 draft cases for weekly batch transmission to DOH PIDSR.</p>
			</div>

			{result && (
				<div className={`flex items-center gap-3 rounded-md border px-4 py-3 ${result.type === "success" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}>
					{result.type === "success" ? <CheckCircle className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
					<span className="text-sm">{result.message}</span>
					{result.type === "error" && (
						<Button variant="outline" size="sm" className="ml-auto" onClick={handleTransmit} disabled={weeklyMut.isPending || selected.size === 0}>
							Retry
						</Button>
					)}
				</div>
			)}

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">
							Cat-2 Draft Cases
							{data && (
								<Badge variant="secondary" className="ml-2">{data.total}</Badge>
							)}
						</CardTitle>
						{selected.size > 0 && (
							<Button
								size="sm"
								onClick={handleTransmit}
								disabled={weeklyMut.isPending}
							>
								<Send className="size-4 mr-1.5" />
								{weeklyMut.isPending ? "Transmitting…" : `Transmit ${selected.size} case${selected.size !== 1 ? "s" : ""}`}
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p className="text-center text-sm text-muted-foreground py-6">Loading cases…</p>
					) : cases.length === 0 ? (
						<p className="text-center text-sm text-muted-foreground py-6">No Category-2 draft cases pending batch submission.</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-10">
										<Checkbox
											checked={selected.size === cases.length}
											onCheckedChange={toggleAll}
											aria-label="Select all"
										/>
									</TableHead>
									<TableHead>Patient</TableHead>
									<TableHead>Disease</TableHead>
									<TableHead>Diagnosis Date</TableHead>
									<TableHead>Classification</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{cases.map((c) => (
									<TableRow key={c.id} className="cursor-pointer" onClick={() => toggle(c.id)}>
										<TableCell onClick={(e) => e.stopPropagation()}>
											<Checkbox
												checked={selected.has(c.id)}
												onCheckedChange={() => toggle(c.id)}
												aria-label={`Select case ${c.id}`}
											/>
										</TableCell>
										<TableCell>
											<div>{c.patientName ?? "—"}</div>
											<div className="text-xs text-muted-foreground">{c.patientMrn ?? ""}</div>
										</TableCell>
										<TableCell>
											<div>{c.diseaseName}</div>
											<Badge variant="outline" className="font-mono text-xs">{c.diseaseCode}</Badge>
										</TableCell>
										<TableCell>{formatDate(c.diagnosisDate)}</TableCell>
										<TableCell>
											<Badge variant="secondary">{c.caseClassification}</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
