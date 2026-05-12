"use client"

import { useRef, useState } from "react"
import { FileUp, X } from "lucide-react"

import { Button, buttonVariants } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/core/components/ui/sheet"

type DocumentCategory = "brgy_indigency" | "id" | "income_proof" | "other"

interface UploadedDoc {
	name: string
	category: DocumentCategory
	dataUri: string
}

interface DocumentUploadDrawerProps {
	onDocumentsChange?: (docs: UploadedDoc[]) => void
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
	brgy_indigency: "Barangay Indigency Certificate",
	id: "Valid ID",
	income_proof: "Proof of Income",
	other: "Other Document",
}

export function DocumentUploadDrawer({ onDocumentsChange }: DocumentUploadDrawerProps) {
	const [open, setOpen] = useState(false)
	const [docs, setDocs] = useState<UploadedDoc[]>([])
	const [category, setCategory] = useState<DocumentCategory>("brgy_indigency")
	const [error, setError] = useState<string | null>(null)
	const fileRef = useRef<HTMLInputElement>(null)

	const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		setError(null)

		if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
			setError("Only PDF, JPG, and PNG files are accepted.")
			return
		}
		if (file.size > 10 * 1024 * 1024) {
			setError("File size must be ≤ 10MB.")
			return
		}

		const reader = new FileReader()
		reader.onload = () => {
			const newDoc: UploadedDoc = {
				name: file.name,
				category,
				dataUri: reader.result as string,
			}
			const updated = [...docs, newDoc]
			setDocs(updated)
			onDocumentsChange?.(updated)
		}
		reader.readAsDataURL(file)
		e.target.value = ""
	}

	const remove = (i: number) => {
		const updated = docs.filter((_, idx) => idx !== i)
		setDocs(updated)
		onDocumentsChange?.(updated)
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
				<FileUp className="size-4" />
				Upload Documents ({docs.length})
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Document Upload</SheetTitle>
				</SheetHeader>
				<div className="mt-4 space-y-4">
					<div className="space-y-1.5">
						<Label>Category</Label>
						<Select
							value={category}
							onValueChange={(v) => setCategory(v as DocumentCategory)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.entries(CATEGORY_LABELS) as [DocumentCategory, string][]).map(
									([v, l]) => (
										<SelectItem key={v} value={v}>
											{l}
										</SelectItem>
									)
								)}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Button
							type="button"
							variant="outline"
							className="w-full gap-2"
							onClick={() => fileRef.current?.click()}
						>
							<FileUp className="size-4" />
							Choose File (PDF/JPG/PNG ≤ 10MB)
						</Button>
						<input
							ref={fileRef}
							type="file"
							accept=".pdf,.jpg,.jpeg,.png"
							className="hidden"
							onChange={handleFile}
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					{docs.length > 0 && (
						<ul className="space-y-2">
							{docs.map((d, i) => (
								<li
									key={i}
									className="flex items-center justify-between rounded border px-3 py-2 text-sm"
								>
									<div>
										<p className="max-w-[200px] truncate font-medium">{d.name}</p>
										<p className="text-xs text-muted-foreground">
											{CATEGORY_LABELS[d.category]}
										</p>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-7"
										onClick={() => remove(i)}
									>
										<X className="size-3.5" />
									</Button>
								</li>
							))}
						</ul>
					)}

					<Button type="button" className="w-full" onClick={() => setOpen(false)}>
						Done
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}
