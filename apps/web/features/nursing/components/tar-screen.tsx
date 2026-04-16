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
	useAdministerTarMutation,
	useCreateTarEntryMutation,
	useTarEntriesQuery,
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

type TarStatus = "due" | "given" | "missed" | "held" | "refused"

function statusBadge(status: TarStatus) {
	const config: Record<TarStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
		due: { variant: "secondary", label: "Due" },
		given: { variant: "default", label: "Given" },
		missed: { variant: "destructive", label: "Missed" },
		held: { variant: "outline", label: "Held" },
		refused: { variant: "outline", label: "Refused" },
	}
	const c = config[status]
	return <Badge variant={c.variant}>{c.label}</Badge>
}

interface TarScreenProps {
	encounterId: string
	facilityId: string
}

export function TarScreen({ encounterId, facilityId }: TarScreenProps) {
	const [createOpen, setCreateOpen] = useState(false)
	const [administeringId, setAdministeringId] = useState<string | null>(null)

	const tarEntries = useTarEntriesQuery({ encounterId, facilityId })
	const createTar = useCreateTarEntryMutation()
	const administerTar = useAdministerTarMutation()

	function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const fd = new FormData(e.currentTarget)
		createTar.mutate(
			{
				facilityId,
				encounterId,
				treatmentDescription: fd.get("treatmentDescription") as string,
				scheduledTime: new Date(fd.get("scheduledTime") as string).toISOString(),
			},
			{
				onSuccess: () => {
					setCreateOpen(false)
					;(e.target as HTMLFormElement).reset()
				},
			}
		)
	}

	function handleAdminister(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		if (!administeringId) return
		const fd = new FormData(e.currentTarget)
		administerTar.mutate(
			{
				id: administeringId,
				status: "given",
				notes: (fd.get("notes") as string) || undefined,
			},
			{ onSuccess: () => setAdministeringId(null) }
		)
	}

	return (
		<>
			{/* Create dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Treatment Entry</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreate} className="grid gap-3">
						<div>
							<Label htmlFor="treatmentDescription">Treatment Description</Label>
							<Textarea
								id="treatmentDescription"
								name="treatmentDescription"
								required
								rows={3}
								placeholder="Describe the treatment…"
							/>
						</div>
						<div>
							<Label htmlFor="scheduledTime">Scheduled Time</Label>
							<Input
								id="scheduledTime"
								name="scheduledTime"
								type="datetime-local"
								required
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
							<Button type="submit" disabled={createTar.isPending}>
								{createTar.isPending ? "Saving…" : "Create"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Administer dialog */}
			<Dialog
				open={administeringId !== null}
				onOpenChange={open => !open && setAdministeringId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Complete Treatment</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleAdminister} className="grid gap-3">
						<div>
							<Label htmlFor="adminNotes">Notes</Label>
							<Textarea id="adminNotes" name="notes" rows={3} />
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setAdministeringId(null)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={administerTar.isPending}>
								{administerTar.isPending ? "Saving…" : "Mark Complete"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			<div className="mb-4 flex justify-end">
				<Button size="sm" onClick={() => setCreateOpen(true)}>
					Add Treatment
				</Button>
			</div>

			{tarEntries.isLoading ? (
				<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
			) : !tarEntries.data?.data?.length ? (
				<div className="text-muted-foreground py-8 text-center text-sm">
					No TAR entries yet.
				</div>
			) : (
				<div className="overflow-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Treatment</TableHead>
								<TableHead>Scheduled</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Administered At</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tarEntries.data.data.map(t => (
								<TableRow key={t.id}>
									<TableCell className="max-w-[240px] truncate">
										{t.treatmentDescription}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										{formatDateTime(t.scheduledTime)}
									</TableCell>
									<TableCell>{statusBadge(t.status)}</TableCell>
									<TableCell className="whitespace-nowrap">
										{formatDateTime(t.administeredAt)}
									</TableCell>
									<TableCell className="max-w-[200px] truncate">
										{t.notes ?? "—"}
									</TableCell>
									<TableCell>
										{t.status === "due" && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => setAdministeringId(t.id)}
											>
												Complete
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
