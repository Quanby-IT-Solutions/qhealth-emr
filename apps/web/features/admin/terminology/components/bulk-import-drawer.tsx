"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/core/components/ui/sheet"

import { useImportCodesMutation } from "../api/terminology.hooks"

interface BulkImportDrawerProps {
	codeSystemId: string
	versionId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

function fhirValueSetToCsv(json: string): string {
	const valueset = JSON.parse(json) as {
		expansion?: { contains?: Array<{ code?: string; display?: string; system?: string }> }
		compose?: { include?: Array<{ concept?: Array<{ code?: string; display?: string }> }> }
	}
	const entries: Array<{ code: string; name: string; description: string }> = []
	const contains = valueset.expansion?.contains ?? []
	for (const c of contains) {
		if (c.code) entries.push({ code: c.code, name: c.display ?? "", description: "" })
	}
	if (entries.length === 0) {
		for (const include of valueset.compose?.include ?? []) {
			for (const c of include.concept ?? []) {
				if (c.code) entries.push({ code: c.code, name: c.display ?? "", description: "" })
			}
		}
	}
	if (entries.length === 0) throw new Error("No codes found in ValueSet JSON.")
	const rows = entries.map(e => `"${e.code}","${e.name.replace(/"/g, '""')}","${e.description}"`)
	return `code,name,description\n${rows.join("\n")}`
}

export function BulkImportDrawer({
	codeSystemId,
	versionId,
	open,
	onOpenChange,
}: BulkImportDrawerProps) {
	const fileRef = useRef<HTMLInputElement>(null)
	const [fileName, setFileName] = useState<string | null>(null)
	const [csvContent, setCsvContent] = useState<string | null>(null)
	const [parseError, setParseError] = useState<string | null>(null)
	const importMutation = useImportCodesMutation()

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		setFileName(file.name)
		setParseError(null)
		const reader = new FileReader()
		reader.onload = ev => {
			const content = ev.target?.result as string
			if (file.name.endsWith(".json")) {
				try {
					setCsvContent(fhirValueSetToCsv(content))
				} catch (err) {
					setParseError(err instanceof Error ? err.message : "Invalid FHIR ValueSet JSON.")
					setCsvContent(null)
				}
			} else {
				setCsvContent(content)
			}
		}
		reader.readAsText(file)
	}

	async function handleImport() {
		if (!csvContent) return
		try {
			const result = await importMutation.mutateAsync({
				codeSystemId,
				versionId,
				csv: csvContent,
			})
			if (result.errors.length === 0) {
				toast.success(`Imported ${result.imported} codes.`)
				onOpenChange(false)
			} else {
				toast.warning(`${result.imported} imported, ${result.errors.length} error(s).`)
			}
		} catch {
			toast.error("Import failed.")
		}
	}

	const errors = importMutation.data?.errors ?? []

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-[480px]">
				<SheetHeader>
					<SheetTitle>Bulk Import Codes</SheetTitle>
					<SheetDescription>
						Upload a CSV (columns: code, name, description) or a FHIR ValueSet JSON file.
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6 space-y-4">
					<div>
						<input
							ref={fileRef}
							type="file"
							accept=".csv,.json"
							className="hidden"
							onChange={handleFileChange}
						/>
						<Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
							{fileName ?? "Choose CSV or JSON file"}
						</Button>
						{parseError && <p className="text-destructive mt-1 text-xs">{parseError}</p>}
					</div>
					{errors.length > 0 && (
						<div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-3">
							<p className="text-destructive text-sm font-medium">Row errors ({errors.length}):</p>
							{errors.map(e => (
								<p key={e.row} className="text-destructive text-xs">
									Row {e.row}: {e.message}
								</p>
							))}
						</div>
					)}
					<Button
						onClick={handleImport}
						disabled={!csvContent || importMutation.isPending}
						size="sm"
					>
						{importMutation.isPending ? "Importing..." : "Import"}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}
