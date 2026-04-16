"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useAdministerMarMutation,
	useMarEntriesQuery,
} from "@/features/nursing/api/nursing.hooks"

function formatDateTime(dateStr: string | null | undefined) {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

type MarStatus = "due" | "given" | "missed" | "held" | "refused"

function statusBadge(status: MarStatus) {
	const config: Record<MarStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
		due: { variant: "secondary", label: "Due" },
		given: { variant: "default", label: "Given" },
		missed: { variant: "destructive", label: "Missed" },
		held: { variant: "outline", label: "Held" },
		refused: { variant: "outline", label: "Refused" },
	}
	const c = config[status]
	return <Badge variant={c.variant}>{c.label}</Badge>
}

interface AdministerFormProps {
	marId: string
	onClose: () => void
}

function AdministerForm({ marId, onClose }: AdministerFormProps) {
	const administerMar = useAdministerMarMutation()

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const fd = new FormData(e.currentTarget)
		administerMar.mutate(
			{
				id: marId,
				status: "given",
				administeredDose: (fd.get("administeredDose") as string) || undefined,
				administeredRoute: (fd.get("administeredRoute") as string) || undefined,
				prnReason: (fd.get("prnReason") as string) || undefined,
				notes: (fd.get("notes") as string) || undefined,
			},
			{ onSuccess: onClose }
		)
	}

	return (
		<form onSubmit={handleSubmit} className="grid gap-3">
			<div>
				<Label htmlFor="administeredDose">Dose Given</Label>
				<Input
					id="administeredDose"
					name="administeredDose"
					placeholder="e.g. 500mg"
				/>
			</div>
			<div>
				<Label htmlFor="administeredRoute">Route</Label>
				<Input
					id="administeredRoute"
					name="administeredRoute"
					placeholder="e.g. PO, IV, IM"
				/>
			</div>
			<div>
				<Label htmlFor="prnReason">PRN Reason</Label>
				<Input
					id="prnReason"
					name="prnReason"
					placeholder="Required for PRN medications"
				/>
			</div>
			<div>
				<Label htmlFor="notes">Notes</Label>
				<Textarea id="notes" name="notes" rows={2} />
			</div>
			<div className="flex justify-end gap-2 pt-2">
				<Button type="button" variant="outline" onClick={onClose}>
					Cancel
				</Button>
				<Button type="submit" disabled={administerMar.isPending}>
					{administerMar.isPending ? "Saving…" : "Mark Given"}
				</Button>
			</div>
		</form>
	)
}

interface MarScreenProps {
	encounterId: string
	facilityId: string
}

export function MarScreen({ encounterId, facilityId }: MarScreenProps) {
	const [administeringId, setAdministeringId] = useState<string | null>(null)
	const marEntries = useMarEntriesQuery({ encounterId, facilityId })

	return (
		<>
			<Dialog
				open={administeringId !== null}
				onOpenChange={open => !open && setAdministeringId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Administer Medication</DialogTitle>
					</DialogHeader>
					{administeringId && (
						<AdministerForm
							marId={administeringId}
							onClose={() => setAdministeringId(null)}
						/>
					)}
				</DialogContent>
			</Dialog>

			{marEntries.isLoading ? (
				<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
			) : !marEntries.data?.data?.length ? (
				<div className="text-muted-foreground py-8 text-center text-sm">
					No MAR entries yet.
				</div>
			) : (
				<div className="overflow-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Scheduled</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Dose Given</TableHead>
								<TableHead>Route</TableHead>
								<TableHead>PRN Reason</TableHead>
								<TableHead>Administered At</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{marEntries.data.data.map(m => (
								<TableRow key={m.id}>
									<TableCell className="whitespace-nowrap">
										{formatDateTime(m.scheduledTime)}
									</TableCell>
									<TableCell>{statusBadge(m.status)}</TableCell>
									<TableCell>{m.administeredDose ?? "—"}</TableCell>
									<TableCell>{m.administeredRoute ?? "—"}</TableCell>
									<TableCell className="max-w-[160px] truncate">
										{m.prnReason ?? "—"}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										{formatDateTime(m.administeredAt)}
									</TableCell>
									<TableCell className="max-w-[200px] truncate">
										{m.notes ?? "—"}
									</TableCell>
									<TableCell>
										{m.status === "due" && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => setAdministeringId(m.id)}
											>
												Administer
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</>
	)
}
