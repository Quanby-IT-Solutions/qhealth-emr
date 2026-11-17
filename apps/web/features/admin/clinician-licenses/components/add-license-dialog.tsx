"use client"

import { useEffect, useState } from "react"
import { BadgePlus, CalendarDays, FileUp, Save, X } from "lucide-react"
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
import { useAddMyLicenseMutation } from "@/features/account/api/my-licenses.hooks"

import { useAddLicenseMutation } from "../api/licenses.hooks"

interface AddLicenseDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	staffProfileId?: string
	mode?: "admin" | "self"
}

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

export function AddLicenseDialog({
	open,
	onOpenChange,
	staffProfileId,
	mode = "admin",
}: AddLicenseDialogProps) {
	const [form, setForm] = useState({
		staffProfileId: staffProfileId ?? "",
		licenseType: "",
		licenseNumber: "",
		issueDate: "",
		expiryDate: "",
	})
	const [fileError, setFileError] = useState("")
	const [fileName, setFileName] = useState("")
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [previewType, setPreviewType] = useState<string | null>(null)

	const addAdminMutation = useAddLicenseMutation()
	const addSelfMutation = useAddMyLicenseMutation()
	const addMutation = mode === "self" ? addSelfMutation : addAdminMutation
	const isSelfMode = mode === "self"
	const isMissingRequiredFields =
		!form.licenseType.trim() ||
		!form.licenseNumber.trim() ||
		(!isSelfMode && !form.staffProfileId.trim())

	useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl)
		}
	}, [previewUrl])

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		setFileError("")
		setFileName("")
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl)
			setPreviewUrl(null)
			setPreviewType(null)
		}
		if (!file) return
		if (!ALLOWED_TYPES.includes(file.type)) {
			setFileError("Only PDF, JPG, or PNG files are allowed.")
			return
		}
		if (file.size > MAX_FILE_SIZE) {
			setFileError("File must be 10MB or smaller.")
			return
		}
		setFileName(file.name)
		setPreviewUrl(URL.createObjectURL(file))
		setPreviewType(file.type)
	}

	function resetForm() {
		setForm({
			staffProfileId: staffProfileId ?? "",
			licenseType: "",
			licenseNumber: "",
			issueDate: "",
			expiryDate: "",
		})
		setFileName("")
		setFileError("")
		if (previewUrl) URL.revokeObjectURL(previewUrl)
		setPreviewUrl(null)
		setPreviewType(null)
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!form.licenseType.trim() || !form.licenseNumber.trim()) return
		if (!isSelfMode && !form.staffProfileId.trim()) return

		const payload = {
			licenseType: form.licenseType.trim(),
			licenseNumber: form.licenseNumber.trim(),
			issueDate: form.issueDate || undefined,
			expiryDate: form.expiryDate || undefined,
		}

		if (isSelfMode) {
			addSelfMutation.mutate(payload, {
				onSuccess: () => {
					toast.success("License added successfully.")
					onOpenChange(false)
					resetForm()
				},
				onError: () => {
					toast.error("Failed to add license. Please try again.")
				},
			})
			return
		}

		addAdminMutation.mutate(
			{
				staffProfileId: form.staffProfileId.trim(),
				...payload,
			},
			{
				onSuccess: () => {
					toast.success("License added successfully.")
					onOpenChange(false)
					resetForm()
				},
				onError: () => {
					toast.error("Failed to add license. Please try again.")
				},
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				size="md"
				className="flex max-h-[min(92svh,760px)] flex-col gap-0 overflow-hidden p-0"
			>
				<DialogHeader className="border-b px-5 py-4 pr-12">
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="font-mono">
							NEW
						</Badge>
						<DialogTitle className="text-base">Add Credential</DialogTitle>
					</div>
					<DialogDescription>
						{isSelfMode
							? "Create a license record for your profile"
							: "Create a clinician license record"}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
						<div className="bg-muted/30 rounded-lg border p-4">
							<div className="flex items-start gap-3">
								<div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
									<BadgePlus className="size-4" />
								</div>
								<div className="min-w-0">
									<p className="text-sm font-medium">Credential record</p>
									<p className="text-muted-foreground text-xs">
										PRC, PTR, and PDEA S-2 records are used for orders and clinical signing.
									</p>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<div>
								<h3 className="text-sm font-medium">Credential Details</h3>
								<p className="text-muted-foreground text-xs">Type, number, and validity dates</p>
							</div>

							{!isSelfMode && !staffProfileId ? (
								<div className="space-y-1.5">
									<Label htmlFor="staffProfileId">Staff Profile ID</Label>
									<Input
										id="staffProfileId"
										className="h-9 font-mono"
										value={form.staffProfileId}
										onChange={e => setForm(f => ({ ...f, staffProfileId: e.target.value }))}
										required
									/>
								</div>
							) : null}

							<div className="grid gap-4 sm:grid-cols-[160px_1fr]">
								<div className="space-y-1.5">
									<Label htmlFor="licenseType">License Type</Label>
									<Input
										id="licenseType"
										className="h-9"
										placeholder="e.g. PRC"
										value={form.licenseType}
										onChange={e => setForm(f => ({ ...f, licenseType: e.target.value }))}
										required
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="licenseNumber">License Number</Label>
									<Input
										id="licenseNumber"
										className="h-9 font-mono"
										value={form.licenseNumber}
										onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
										required
									/>
								</div>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="issueDate" className="gap-1.5">
										<CalendarDays className="text-muted-foreground size-3.5" />
										Issue Date
										<span className="text-muted-foreground font-normal">(optional)</span>
									</Label>
									<Input
										id="issueDate"
										className="h-9"
										type="date"
										value={form.issueDate}
										onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="expiryDate" className="gap-1.5">
										<CalendarDays className="text-muted-foreground size-3.5" />
										Expiry Date
										<span className="text-muted-foreground font-normal">(optional)</span>
									</Label>
									<Input
										id="expiryDate"
										className="h-9"
										type="date"
										value={form.expiryDate}
										onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
									/>
								</div>
							</div>
						</div>

						<div className="space-y-3">
							<div>
								<h3 className="text-sm font-medium">
									Supporting Document{" "}
									<span className="text-muted-foreground font-normal">(optional)</span>
								</h3>
								<p className="text-muted-foreground text-xs">PDF, JPG, or PNG up to 10 MB</p>
							</div>

							<label
								htmlFor="document"
								className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 transition-colors"
							>
								<div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
									<FileUp className="size-4" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium">
										{fileName ? fileName : "Attach license document"}
									</p>
									<p className="text-muted-foreground text-xs">
										Optional file for verification records
									</p>
								</div>
								<Input
									id="document"
									className="sr-only"
									type="file"
									accept=".pdf,.jpg,.jpeg,.png"
									onChange={handleFileChange}
								/>
							</label>

							{fileError ? <p className="text-destructive text-xs">{fileError}</p> : null}

							{previewUrl ? (
								<div className="overflow-hidden rounded-lg border">
									{previewType === "application/pdf" ? (
										<object data={previewUrl} type="application/pdf" className="h-48 w-full">
											<a
												href={previewUrl}
												target="_blank"
												rel="noreferrer"
												className="text-primary text-xs underline"
											>
												Open PDF
											</a>
										</object>
									) : (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={previewUrl}
											alt="Document preview"
											className="max-h-48 w-full object-contain"
										/>
									)}
								</div>
							) : null}
						</div>
					</div>

					<DialogFooter className="bg-background m-0 mx-0 mb-0 rounded-none px-5 py-4 [&_button]:w-full sm:[&_button]:w-auto">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							<X className="size-4" />
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={addMutation.isPending || isMissingRequiredFields || !!fileError}
						>
							<Save className="size-4" />
							{addMutation.isPending ? "Saving..." : "Add License"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
