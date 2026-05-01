"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/core/components/ui/sheet"

import { useAddLicenseMutation } from "../api/licenses.hooks"

interface AddLicenseDrawerProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	staffProfileId?: string
}

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

export function AddLicenseDrawer({ open, onOpenChange, staffProfileId }: AddLicenseDrawerProps) {
	const [form, setForm] = useState({
		staffProfileId: staffProfileId ?? "",
		licenseType: "" as "PRC" | "PTR" | "S2" | "",
		licenseNumber: "",
		issueDate: "",
		expiryDate: "",
	})
	const [fileError, setFileError] = useState("")
	const [fileName, setFileName] = useState("")
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [previewType, setPreviewType] = useState<string | null>(null)

	const addMutation = useAddLicenseMutation()

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

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!form.licenseType || !form.staffProfileId || !form.licenseNumber) return
		addMutation.mutate(
			{
				staffProfileId: form.staffProfileId,
				licenseType: form.licenseType,
				licenseNumber: form.licenseNumber,
				issueDate: form.issueDate || undefined,
				expiryDate: form.expiryDate || undefined,
			},
			{
				onSuccess: () => {
					toast.success("License added successfully.")
					onOpenChange(false)
					setForm({ staffProfileId: staffProfileId ?? "", licenseType: "", licenseNumber: "", issueDate: "", expiryDate: "" })
					setFileName("")
					if (previewUrl) URL.revokeObjectURL(previewUrl)
					setPreviewUrl(null)
					setPreviewType(null)
				},
				onError: () => {
					toast.error("Failed to add license. Please try again.")
				},
			}
		)
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Add License</SheetTitle>
				</SheetHeader>
				<form onSubmit={handleSubmit} className="space-y-4 mt-4">
					{!staffProfileId && (
						<div className="space-y-1">
							<Label htmlFor="staffProfileId">Staff Profile ID</Label>
							<Input
								id="staffProfileId"
								value={form.staffProfileId}
								onChange={e => setForm(f => ({ ...f, staffProfileId: e.target.value }))}
								required
							/>
						</div>
					)}

					<div className="space-y-1">
						<Label htmlFor="licenseType">License Type</Label>
						<Select
							value={form.licenseType}
							onValueChange={v => setForm(f => ({ ...f, licenseType: (v ?? "") as "PRC" | "PTR" | "S2" | "" }))}
						>
							<SelectTrigger id="licenseType">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="PRC">PRC</SelectItem>
								<SelectItem value="PTR">PTR</SelectItem>
								<SelectItem value="S2">S2 (PDEA)</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1">
						<Label htmlFor="licenseNumber">License Number</Label>
						<Input
							id="licenseNumber"
							value={form.licenseNumber}
							onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
							required
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="issueDate">Issue Date</Label>
						<Input
							id="issueDate"
							type="date"
							value={form.issueDate}
							onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="expiryDate">Expiry Date</Label>
						<Input
							id="expiryDate"
							type="date"
							value={form.expiryDate}
							onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="document">Document (PDF/JPG/PNG, max 10MB)</Label>
						<Input
							id="document"
							type="file"
							accept=".pdf,.jpg,.jpeg,.png"
							onChange={handleFileChange}
						/>
						{fileError && <p className="text-xs text-destructive">{fileError}</p>}
						{fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}
					</div>

					{previewUrl && (
						<div className="rounded border overflow-hidden">
							{previewType === "application/pdf" ? (
								<object
									data={previewUrl}
									type="application/pdf"
									className="w-full h-48"
								>
									<a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
										Open PDF
									</a>
								</object>
							) : (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={previewUrl}
									alt="Document preview"
									className="w-full max-h-48 object-contain"
								/>
							)}
						</div>
					)}

					<div className="flex gap-2 pt-2">
						<Button type="submit" disabled={addMutation.isPending || !form.licenseType || !!fileError}>
							{addMutation.isPending ? "Saving..." : "Add License"}
						</Button>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	)
}
