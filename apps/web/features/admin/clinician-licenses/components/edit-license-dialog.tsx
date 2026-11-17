"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, CalendarDays, Save, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { useUpdateMyLicenseMutation } from "@/features/account/api/my-licenses.hooks"

import { useUpdateLicenseMutation } from "../api/licenses.hooks"

interface EditLicenseDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	license: {
		id: string
		licenseType: string
		licenseNumber: string
		issueDate: string | null
		expiryDate: string | null
	} | null
	mode?: "admin" | "self"
}

function formatDate(value: string | null | undefined) {
	if (!value) return "Not recorded"
	const date = new Date(`${value}T00:00:00`)
	if (Number.isNaN(date.getTime())) return value
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date)
}

export function EditLicenseDialog({
	open,
	onOpenChange,
	license,
	mode = "admin",
}: EditLicenseDialogProps) {
	const [form, setForm] = useState({
		licenseNumber: "",
		issueDate: "",
		expiryDate: "",
	})
	const updateAdminMutation = useUpdateLicenseMutation()
	const updateSelfMutation = useUpdateMyLicenseMutation()
	const updateMutation = mode === "self" ? updateSelfMutation : updateAdminMutation

	useEffect(() => {
		if (!license) return
		setForm({
			licenseNumber: license.licenseNumber,
			issueDate: license.issueDate ?? "",
			expiryDate: license.expiryDate ?? "",
		})
	}, [license])

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!license || !form.licenseNumber.trim()) return

		updateMutation.mutate(
			{
				id: license.id,
				licenseNumber: form.licenseNumber.trim(),
				issueDate: form.issueDate || null,
				expiryDate: form.expiryDate || null,
			},
			{
				onSuccess: () => {
					toast.success("License updated successfully.")
					onOpenChange(false)
				},
				onError: () => {
					toast.error("Failed to update license. Please try again.")
				},
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				size="md"
				className="flex max-h-[min(92svh,720px)] flex-col gap-0 overflow-hidden p-0"
			>
				<DialogHeader className="border-b px-5 py-4 pr-12">
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="font-mono">
							{license?.licenseType ?? "LICENSE"}
						</Badge>
						<DialogTitle className="text-base">Edit Credential</DialogTitle>
					</div>
					<DialogDescription>
						{license?.licenseType
							? `${license.licenseType} credential record`
							: "Credential record"}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
						<div className="bg-muted/30 rounded-lg border p-4">
							<div className="mb-4 flex items-start justify-between gap-3">
								<div className="flex items-center gap-3">
									<div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
										<BadgeCheck className="size-4" />
									</div>
									<div>
										<p className="text-sm font-medium">
											{license?.licenseType ?? "Clinical"} credential
										</p>
										<p className="text-muted-foreground text-xs">Current record</p>
									</div>
								</div>
								<Badge variant="outline">Editable</Badge>
							</div>

							<div className="grid gap-3 text-sm">
								<div>
									<p className="text-muted-foreground text-xs">License number</p>
									<p className="font-mono font-medium break-all">
										{license?.licenseNumber || "Not recorded"}
									</p>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<p className="text-muted-foreground text-xs">Issued</p>
										<p className="font-medium">{formatDate(license?.issueDate)}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs">Expires</p>
										<p className="font-medium">{formatDate(license?.expiryDate)}</p>
									</div>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<div>
								<h3 className="text-sm font-medium">Credential Details</h3>
								<p className="text-muted-foreground text-xs">Number and validity dates</p>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="edit-licenseNumber">License Number</Label>
								<Input
									id="edit-licenseNumber"
									className="h-9 font-mono"
									value={form.licenseNumber}
									onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
									required
								/>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="edit-issueDate" className="gap-1.5">
										<CalendarDays className="text-muted-foreground size-3.5" />
										Issue Date
									</Label>
									<Input
										id="edit-issueDate"
										className="h-9"
										type="date"
										value={form.issueDate}
										onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="edit-expiryDate" className="gap-1.5">
										<CalendarDays className="text-muted-foreground size-3.5" />
										Expiry Date
									</Label>
									<Input
										id="edit-expiryDate"
										className="h-9"
										type="date"
										value={form.expiryDate}
										onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
									/>
								</div>
							</div>
						</div>
					</div>

					<DialogFooter className="bg-background m-0 mx-0 mb-0 rounded-none px-5 py-4 [&_button]:w-full sm:[&_button]:w-auto">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							<X className="size-4" />
							Cancel
						</Button>
						<Button type="submit" disabled={updateMutation.isPending || !form.licenseNumber.trim()}>
							<Save className="size-4" />
							{updateMutation.isPending ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
