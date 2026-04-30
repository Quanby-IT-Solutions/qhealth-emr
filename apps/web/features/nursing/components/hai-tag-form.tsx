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
	useCreateHaiTagMutation,
	useHaiTagsQuery,
	useUpdateHaiTagMutation,
} from "@/features/nursing/api/nursing.hooks"

function formatDate(dateStr: string | null | undefined) {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

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

type HaiStatus = "suspected" | "confirmed" | "resolved"
type HaiType = "clabsi" | "cauti" | "vap" | "ssi" | "cdiff"

function statusBadge(status: HaiStatus) {
	const config: Record<HaiStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
		suspected: { variant: "outline", label: "Suspected" },
		confirmed: { variant: "destructive", label: "Confirmed" },
		resolved: { variant: "secondary", label: "Resolved" },
	}
	const c = config[status]
	return <Badge variant={c.variant}>{c.label}</Badge>
}

const HAI_TYPE_LABELS: Record<HaiType, string> = {
	clabsi: "CLABSI (Central Line)",
	cauti: "CAUTI (Urinary Catheter)",
	vap: "VAP (Ventilator)",
	ssi: "SSI (Surgical Site)",
	cdiff: "C. difficile",
}

interface HaiTagFormProps {
	encounterId: string
	facilityId: string
	readOnly?: boolean
}

export function HaiTagForm({ encounterId, facilityId, readOnly }: HaiTagFormProps) {
	const [createOpen, setCreateOpen] = useState(false)

	const haiTags = useHaiTagsQuery({ encounterId, facilityId })
	const createHai = useCreateHaiTagMutation()
	const updateHai = useUpdateHaiTagMutation()

	function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const fd = new FormData(e.currentTarget)
		createHai.mutate(
			{
				facilityId,
				encounterId,
				haiType: fd.get("haiType") as HaiType,
				onsetDate: fd.get("onsetDate") as string,
				notes: (fd.get("notes") as string) || undefined,
			},
			{
				onSuccess: () => {
					setCreateOpen(false)
					;(e.target as HTMLFormElement).reset()
				},
			}
		)
	}

	return (
		<>
			{/* Report HAI dialog — nurses only */}
			{!readOnly && <Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Report Healthcare-Associated Infection</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreate} className="grid gap-3">
						<div>
							<Label htmlFor="haiType">HAI Type</Label>
							<select
								id="haiType"
								name="haiType"
								className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
								required
							>
								<option value="">Select HAI type…</option>
								{(Object.entries(HAI_TYPE_LABELS) as [HaiType, string][]).map(
									([value, label]) => (
										<option key={value} value={value}>
											{label}
										</option>
									)
								)}
							</select>
						</div>
						<div>
							<Label htmlFor="onsetDate">Onset Date</Label>
							<Input id="onsetDate" name="onsetDate" type="date" required />
						</div>
						<div>
							<Label htmlFor="notes">Notes / Device &amp; Site Information</Label>
							<Textarea
								id="notes"
								name="notes"
								rows={3}
								placeholder="e.g. Right femoral central line, day 5 of insertion…"
							/>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setCreateOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={createHai.isPending}>
								{createHai.isPending ? "Saving…" : "Report HAI"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>}

			<div className="mb-4 flex items-center justify-between">
				<h3 className="font-semibold">Healthcare-Associated Infections</h3>
				{!readOnly && (
					<Button size="sm" onClick={() => setCreateOpen(true)}>
						Report HAI
					</Button>
				)}
			</div>

			{haiTags.isLoading ? (
				<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
			) : !haiTags.data?.data?.length ? (
				<div className="text-muted-foreground py-8 text-center text-sm">
					No HAI tags recorded.
				</div>
			) : (
				<div className="overflow-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Type</TableHead>
								<TableHead>Onset</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Confirmed</TableHead>
								<TableHead>Resolved</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{haiTags.data.data.map(h => (
								<TableRow key={h.id}>
									<TableCell className="font-medium uppercase">
										{h.haiType}
									</TableCell>
									<TableCell>{formatDate(h.onsetDate)}</TableCell>
									<TableCell>{statusBadge(h.status)}</TableCell>
									<TableCell className="whitespace-nowrap">
										{formatDateTime(h.confirmedAt)}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										{formatDateTime(h.resolvedAt)}
									</TableCell>
									<TableCell className="max-w-[200px] truncate">
										{h.notes ?? "—"}
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											{!readOnly && h.status === "suspected" && (
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														updateHai.mutate({
															id: h.id,
															status: "confirmed",
														})
													}
													disabled={updateHai.isPending}
												>
													Confirm
												</Button>
											)}
											{!readOnly && h.status !== "resolved" && (
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														updateHai.mutate({
															id: h.id,
															status: "resolved",
														})
													}
													disabled={updateHai.isPending}
												>
													Resolve
												</Button>
											)}
										</div>
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
