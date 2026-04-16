"use client"

import { useState } from "react"

import { CheckCircle2, Loader2, Scale, Search } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"

import {
	type Cf5Assignment,
	type DrgCode,
	useApproveCf5Mutation,
	useAssignDrgMutation,
	useCf5AssignmentQuery,
	useDrgSearchQuery,
} from "../api/billing.hooks"

interface Cf5DrgProps {
	encounterId: string
	facilityId: string
	patientId: string
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	draft: "secondary",
	submitted: "outline",
	approved: "default",
	rejected: "destructive",
}

function Cf5Summary({ assignment }: { assignment: Cf5Assignment }) {
	return (
		<div className="rounded-md border p-4 space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-muted-foreground">DRG Code</p>
					<p className="font-mono text-lg font-semibold">{assignment.drgCode}</p>
				</div>
				<Badge variant={STATUS_VARIANT[assignment.status] ?? "secondary"}>
					{assignment.status}
				</Badge>
			</div>
			<Separator />
			<div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
				<div>
					<p className="text-muted-foreground">Description</p>
					<p className="font-medium">{assignment.drgDescription}</p>
				</div>
				<div>
					<p className="text-muted-foreground">MDRG</p>
					<p className="font-medium font-mono">{assignment.mdrg}</p>
				</div>
				<div>
					<p className="text-muted-foreground">DRG Weight</p>
					<p className="font-medium">{assignment.drgWeight.toFixed(3)}</p>
				</div>
				<div>
					<p className="text-muted-foreground">Computed Rate</p>
					<p className="font-medium">₱{assignment.computedRate.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
				</div>
			</div>
			{assignment.approvedBy && (
				<p className="text-xs text-muted-foreground">
					Approved by {assignment.approvedBy} on{" "}
					{assignment.approvedAt
						? new Date(assignment.approvedAt).toLocaleString("en-PH")
						: "—"}
				</p>
			)}
		</div>
	)
}

function DrgPicker({
	onSelect,
}: {
	onSelect: (drg: DrgCode) => void
}) {
	const [search, setSearch] = useState("")
	const { data: results, isLoading } = useDrgSearchQuery(search)

	return (
		<div className="space-y-2">
			<Label>Search DRG Code</Label>
			<div className="relative">
				<Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
				<Input
					className="pl-9"
					placeholder="Search by code or description (min 2 chars)…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</div>
			{isLoading && <p className="text-sm text-muted-foreground">Searching…</p>}
			{results && results.length > 0 && (
				<div className="max-h-60 overflow-y-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Code</TableHead>
								<TableHead>Description</TableHead>
								<TableHead>MDRG</TableHead>
								<TableHead className="text-right">Weight</TableHead>
								<TableHead className="text-right">Base Rate</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{results.map((drg) => (
								<TableRow key={drg.code}>
									<TableCell className="font-mono font-medium">{drg.code}</TableCell>
									<TableCell className="text-sm">{drg.description}</TableCell>
									<TableCell className="font-mono text-sm">{drg.mdrg}</TableCell>
									<TableCell className="text-right text-sm">
										{drg.weight.toFixed(3)}
									</TableCell>
									<TableCell className="text-right text-sm">
										₱{drg.baseRate.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
									</TableCell>
									<TableCell>
										<Button
											size="sm"
											variant="outline"
											onClick={() => {
												onSelect(drg)
												setSearch("")
											}}
										>
											Select
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
			{results && results.length === 0 && search.length >= 2 && (
				<p className="text-sm text-muted-foreground">No DRG codes found.</p>
			)}
		</div>
	)
}

export function Cf5Drg({ encounterId, facilityId, patientId }: Cf5DrgProps) {
	const [selectedDrg, setSelectedDrg] = useState<DrgCode | null>(null)

	const { data: assignment, isLoading } = useCf5AssignmentQuery(encounterId)
	const assignDrg = useAssignDrgMutation()
	const approveCf5 = useApproveCf5Mutation()

	function handleAssign() {
		if (!selectedDrg) return
		assignDrg.mutate(
			{ facilityId, encounterId, patientId, drgCode: selectedDrg.code },
			{ onSuccess: () => setSelectedDrg(null) }
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<Scale className="size-5" />
					<CardTitle>CF5 — DRG Assignment</CardTitle>
				</div>
				<p className="text-muted-foreground text-sm">
					Assign the Diagnosis Related Group (DRG) code for PhilHealth inpatient case rate billing.
				</p>
			</CardHeader>
			<CardContent className="space-y-4">
				{isLoading && (
					<p className="text-muted-foreground text-sm">Loading DRG assignment…</p>
				)}

				{!isLoading && assignment && (
					<>
						<Cf5Summary assignment={assignment} />
						{assignment.status === "draft" && (
							<div className="flex gap-2">
								<Button
									onClick={() => approveCf5.mutate(assignment.id)}
									disabled={approveCf5.isPending}
								>
									{approveCf5.isPending ? (
										<Loader2 className="mr-1.5 size-4 animate-spin" />
									) : (
										<CheckCircle2 className="mr-1.5 size-4" />
									)}
									Approve DRG Assignment
								</Button>
							</div>
						)}
					</>
				)}

				{!isLoading && !assignment && (
					<div className="space-y-4">
						<DrgPicker onSelect={setSelectedDrg} />

						{selectedDrg && (
							<div className="rounded-md border bg-muted/50 p-4 space-y-2">
								<p className="text-sm font-medium">Selected DRG</p>
								<div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
									<div>
										<span className="text-muted-foreground">Code: </span>
										<span className="font-mono font-medium">{selectedDrg.code}</span>
									</div>
									<div>
										<span className="text-muted-foreground">MDRG: </span>
										<span className="font-mono">{selectedDrg.mdrg}</span>
									</div>
									<div>
										<span className="text-muted-foreground">Weight: </span>
										<span>{selectedDrg.weight.toFixed(3)}</span>
									</div>
									<div>
										<span className="text-muted-foreground">Base Rate: </span>
										<span>₱{selectedDrg.baseRate.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
									</div>
								</div>
								<p className="text-sm">{selectedDrg.description}</p>
								<div className="flex gap-2 pt-1">
									<Button
										onClick={handleAssign}
										disabled={assignDrg.isPending}
									>
										{assignDrg.isPending ? (
											<Loader2 className="mr-1.5 size-4 animate-spin" />
										) : null}
										Assign DRG
									</Button>
									<Button variant="ghost" onClick={() => setSelectedDrg(null)}>
										Clear
									</Button>
								</div>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
